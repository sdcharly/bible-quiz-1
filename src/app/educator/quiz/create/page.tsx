"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import {
  BookmarkIcon,
  CheckIcon,
  XMarkIcon,
} from "@heroicons/react/24/solid";
import { TimezoneSelector } from "@/components/ui/timezone-selector";
import { useTimezone } from "@/hooks/useTimezone";
import { 
  getDefaultTimezone, 
  formatDateInTimezone, 
  isQuizTimeValid
} from "@/lib/timezone";

interface Document {
  id: string;
  filename: string;
  status: string;
  fileSize?: number;
  mimeType?: string;
  uploadDate?: string;
  processedData?: {
    trackId?: string;
    lightragDocumentId?: string;
    fileName?: string;
    fileType?: string;
    lightragUrl?: string;
    [key: string]: unknown;
  };
  filePath?: string;
}

interface QuizConfig {
  title: string;
  description: string;
  documentIds: string[];
  questionCount: number;
  duration: number; // in minutes
  passingScore: number;
  difficulty: "easy" | "intermediate" | "hard";
  bloomsLevels: string[];
  topics: string[];
  books: string[];
  chapters: string[];
  startTime: string;
  timezone: string;
  shuffleQuestions: boolean;
}

function CreateQuizContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedDocId = searchParams.get("documentId");
  const { timezone: userTimezone, getCurrentDateTime, toUTC, formatDate } = useTimezone();
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationMessage, setGenerationMessage] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isCompletingRef = useRef(false);
  const isSubmittingRef = useRef(false);
  const hasShownErrorRef = useRef(false);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 3;
  const [documents, setDocuments] = useState<Document[]>([]);
  const [config, setConfig] = useState<QuizConfig>({
    title: "",
    description: "",
    documentIds: preselectedDocId ? [preselectedDocId] : [],
    questionCount: 10,
    duration: 30,
    passingScore: 70,
    difficulty: "intermediate",
    bloomsLevels: ["knowledge", "comprehension"], // Default 2 levels pre-selected
    topics: [],
    books: [],
    chapters: [],
    startTime: "", // Will be set in useEffect
    timezone: userTimezone,
    shuffleQuestions: false,
  });
  
  // Initialize startTime with user's timezone
  useEffect(() => {
    if (!config.startTime && userTimezone) {
      const currentTimeInUserTz = getCurrentDateTime();
      setConfig(prev => ({ 
        ...prev, 
        startTime: currentTimeInUserTz,
        timezone: userTimezone 
      }));
    }
  }, [userTimezone, getCurrentDateTime, config.startTime]); // Proper dependencies
  
  const updateDateTime = (date: string, time: string) => {
    // Ensure time has seconds if missing
    const timeWithSeconds = time.includes(':') && time.split(':').length === 2 
      ? `${time}:00` 
      : time;
    const newDateTime = `${date}T${timeWithSeconds}`;
    setConfig({ ...config, startTime: newDateTime });
  };
  
  const getDateFromStartTime = () => {
    if (!config.startTime) {
      const currentTimeInUserTz = getCurrentDateTime();
      return currentTimeInUserTz.split('T')[0];
    }
    return config.startTime.split('T')[0];
  };
  
  const getTimeFromStartTime = () => {
    if (!config.startTime) {
      const currentTimeInUserTz = getCurrentDateTime();
      const time = currentTimeInUserTz.split('T')[1];
      // HTML time input only accepts HH:MM format
      return time ? time.substring(0, 5) : '';
    }
    const time = config.startTime.split('T')[1];
    // HTML time input only accepts HH:MM format
    return time ? time.substring(0, 5) : '';
  };
  
  const [selectedBook, setSelectedBook] = useState<string>("");
  const [chapterInput, setChapterInput] = useState<string>("");
  
  // Validation helper to check what's missing
  const getValidationStatus = () => {
    const issues = [];
    if (!config.title) issues.push("Quiz title");
    if (config.documentIds.length === 0) issues.push("At least one document");
    if (!selectedBook) issues.push("Biblical book");
    if (!chapterInput) issues.push("Chapter selection");
    if (config.bloomsLevels.length < 2) issues.push("At least 2 complexity levels");
    if (!config.startTime) issues.push("Start date/time");
    if (!isQuizTimeValid(config.startTime, userTimezone)) issues.push("Valid future time (5+ minutes)");
    return issues;
  };
  
  const validationIssues = getValidationStatus();

  useEffect(() => {
    fetchDocuments();
    
    // Cleanup interval on unmount
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await fetch("/api/educator/documents");
      if (response.ok) {
        const data = await response.json();
        const processedDocs = data.documents.filter(
          (doc: Document) => doc.status === "processed"
        );
        setDocuments(processedDocs);
      }
    } catch (error) {
      console.error("Error fetching documents:", error);
    }
  };

  // Polling for job status updates with retry logic
  const pollJobStatus = async (jobId: string, quizId: string) => {
    console.log(`[QUIZ-CREATE] Starting polling for job ${jobId}`);
    const maxAttempts = 180; // Poll for 3 minutes (180 seconds)
    let attempts = 0;
    let consecutiveErrors = 0;
    const MAX_CONSECUTIVE_ERRORS = 10; // More tolerance for errors
    
    // Clear any existing interval
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
    
    // Reset flags
    isCompletingRef.current = false;
    hasShownErrorRef.current = false;
    retryCountRef.current = 0;
    
    pollIntervalRef.current = setInterval(async () => {
      attempts++;
      
      // Stop polling if job was cleared or is completing
      if (!jobId || isCompletingRef.current) {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        return;
      }
      
      try {
        const response = await fetch(`/api/educator/quiz/poll-status?jobId=${jobId}`);
        
        if (response.ok) {
          const status = await response.json();
          console.log(`[POLL-QUIZ] Job ${jobId} status:`, status.status, `progress:`, status.progress);
          
          // Update progress UI with time-aware messages for AI workflows
          const elapsedSeconds = attempts;
          let progressMessage = status.message || "Processing...";
          
          // Add encouraging messages for long-running AI workflows
          if (elapsedSeconds > 900 && status.status === 'processing') { // 15+ minutes
            progressMessage = "Comprehensive biblical analysis underway... AI is creating deep, thoughtful questions across multiple topics.";
          } else if (elapsedSeconds > 600 && status.status === 'processing') { // 10+ minutes
            progressMessage = "Advanced scriptural processing continues... Quality biblical questions are being crafted with care.";
          } else if (elapsedSeconds > 300 && status.status === 'processing') { // 5+ minutes
            progressMessage = "AI is deeply analyzing your biblical documents to create meaningful assessment questions...";
          } else if (elapsedSeconds > 120 && status.status === 'processing') { // 2+ minutes
            progressMessage = "Complex theological processing in progress... Creating questions that test true understanding.";
          } else if (elapsedSeconds > 60 && status.status === 'processing') {
            progressMessage = "AI is carefully studying your documents to generate thoughtful biblical questions...";
          }
          
          setGenerationProgress(status.progress || Math.min(5 + Math.floor(attempts / 10), 90));
          setGenerationMessage(progressMessage);
          
          if (status.status === 'completed') {
            console.log(`[POLL-QUIZ] Quiz generation job ${jobId} completed!`);
            // Mark as completing to prevent race conditions
            isCompletingRef.current = true;
            
            // Stop polling immediately
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
            
            // Clear jobId immediately to prevent further polling
            setJobId(null);
            
            setGenerationProgress(100);
            setGenerationMessage("Biblical quiz created successfully! Redirecting...");
            
            // Wait a moment to show success message
            setTimeout(() => {
              router.push(`/educator/quiz/${quizId}/review`);
            }, 1500);
          } else if (status.status === 'failed') {
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
            setLoading(false);
            isSubmittingRef.current = false;
            setGenerationProgress(0);
            alert(status.error || "Quiz generation failed. Please try again.");
          } else if (attempts >= maxAttempts) {
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
            setLoading(false);
            isSubmittingRef.current = false;
            setGenerationProgress(0);
            alert("Quiz generation is taking longer than expected. You can check back later or try again.");
          }
        } else if (response.status === 404) {
          consecutiveErrors++;
          console.log(`[POLL-QUIZ] 404 error, consecutive errors: ${consecutiveErrors}`);
          
          // Only show error after multiple consecutive 404s and if not completing
          if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS && !isCompletingRef.current && !hasShownErrorRef.current) {
            hasShownErrorRef.current = true;
            
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
            
            // Try to recreate the job or continue with existing quiz
            const retryGeneration = confirm(
              "The quiz generation service is having trouble. Would you like to retry? " +
              "(Click Cancel to proceed with sample questions that you can edit later)"
            );
            
            if (retryGeneration && retryCountRef.current < MAX_RETRIES) {
              retryCountRef.current++;
              console.log(`[POLL-QUIZ] Retrying generation, attempt ${retryCountRef.current}`);
              
              // Reset state for retry
              setLoading(false);
              isSubmittingRef.current = false;
              setGenerationProgress(0);
              setJobId(null);
              
              // Automatically retry submission
              setTimeout(() => {
                handleSubmit();
              }, 1000);
            } else {
              // Give up and redirect to the quiz that was created
              setLoading(false);
              isSubmittingRef.current = false;
              setGenerationProgress(0);
              router.push(`/educator/quiz/${quizId}/review`);
            }
          } else if (consecutiveErrors < MAX_CONSECUTIVE_ERRORS) {
            // Continue polling, might be a temporary issue
            console.log(`[POLL-QUIZ] Ignoring 404, will retry...`);
          }
        } else {
          // Reset consecutive errors on successful response
          consecutiveErrors = 0;
        }
      } catch (error) {
        consecutiveErrors++;
        console.error(`[POLL-QUIZ] Error polling status (consecutive: ${consecutiveErrors}):`, error);
        
        // Don't process errors if we're completing
        if (!isCompletingRef.current) {
          // Only show error after multiple failures or max attempts
          if ((consecutiveErrors >= MAX_CONSECUTIVE_ERRORS || attempts >= maxAttempts) && !hasShownErrorRef.current) {
            hasShownErrorRef.current = true;
            
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
            
            // Check if quiz was actually created
            try {
              const checkResponse = await fetch(`/api/educator/quiz/${quizId}`);
              if (checkResponse.ok) {
                // Quiz exists, just redirect
                console.log(`[POLL-QUIZ] Quiz exists, redirecting despite polling errors`);
                router.push(`/educator/quiz/${quizId}/review`);
                return;
              }
            } catch (checkError) {
              console.error(`[POLL-QUIZ] Failed to check quiz existence:`, checkError);
            }
            
            setLoading(false);
            isSubmittingRef.current = false;
            setGenerationProgress(0);
            alert("Connection issues detected. The quiz may have been created. Please check your quizzes list.");
          }
        }
      }
    }, 1000); // Poll every second
  };

  const handleSubmit = async () => {
    // Prevent multiple submissions using both state and ref
    if (loading || isSubmittingRef.current) {
      console.log("Quiz creation already in progress, ignoring duplicate submission");
      return;
    }
    
    // Set both state and ref to prevent race conditions
    isSubmittingRef.current = true;
    setLoading(true);
    setGenerationProgress(0);
    setGenerationMessage("Preparing biblical knowledge assessment...");
    
    try {
      // Convert startTime from user's timezone to UTC for backend storage
      const startTimeUTC = toUTC(config.startTime);
      
      const configForBackend = {
        ...config,
        startTime: startTimeUTC.toISOString(), // Send as UTC ISO string
      };
      
      // Call async quiz generation endpoint
      const response = await fetch("/api/educator/quiz/create-async", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(configForBackend),
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.jobId) {
          setJobId(data.jobId);
          setGenerationProgress(5);
          setGenerationMessage("Beginning to craft biblical study questions...");
          
          // Start polling immediately for job status updates
          console.log('[QUIZ-CREATE] Starting polling for job status updates');
          pollJobStatus(data.jobId, data.quizId);
        } else {
          // Fallback to old behavior if no jobId
          router.push(`/educator/quiz/${data.quizId}/review`);
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(errorData.error || "Failed to create quiz. Please try again.");
        setLoading(false);
        isSubmittingRef.current = false;
      }
    } catch (error) {
      console.error("Error creating quiz:", error);
      alert("Failed to create quiz. Please try again.");
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  const complexityLevels = [
    { 
      value: "knowledge", 
      label: "📚 Basic Recall",
      description: "Remember facts, dates, events, and basic biblical concepts"
    },
    { 
      value: "comprehension", 
      label: "💡 Understanding",
      description: "Explain meanings, interpret scripture, and summarize lessons"
    },
    { 
      value: "application", 
      label: "🎯 Practical Application",
      description: "Apply biblical principles to real-life situations"
    },
    { 
      value: "analysis", 
      label: "🧠 Critical Thinking",
      description: "Compare passages, identify themes, and examine context"
    },
    { 
      value: "synthesis", 
      label: "✨ Creative Thinking",
      description: "Connect multiple scriptures to form deeper insights"
    },
    { 
      value: "evaluation", 
      label: "⚖️ Expert Evaluation",
      description: "Judge interpretations and defend theological positions"
    },
  ];

  const biblicalBooks = [
    // Old Testament (39 books)
    "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy",
    "Joshua", "Judges", "Ruth", "1 Samuel", "2 Samuel",
    "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles", "Ezra",
    "Nehemiah", "Esther", "Job", "Psalms", "Proverbs",
    "Ecclesiastes", "Song of Solomon", "Isaiah", "Jeremiah", "Lamentations",
    "Ezekiel", "Daniel", "Hosea", "Joel", "Amos",
    "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk",
    "Zephaniah", "Haggai", "Zechariah", "Malachi",
    // New Testament (27 books)
    "Matthew", "Mark", "Luke", "John", "Acts",
    "Romans", "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians",
    "Philippians", "Colossians", "1 Thessalonians", "2 Thessalonians", "1 Timothy",
    "2 Timothy", "Titus", "Philemon", "Hebrews", "James",
    "1 Peter", "2 Peter", "1 John", "2 John", "3 John",
    "Jude", "Revelation"
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Quiz Generation Progress Modal */}
      {loading && generationProgress > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="mb-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900 mb-4">
                  <ArrowPathIcon className="h-8 w-8 text-amber-600 dark:text-amber-400 animate-spin" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Generating Your Quiz
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {generationMessage}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mb-4">
                  Please keep this page open. AI analysis may take 5-15 minutes for complex biblical content...
                </p>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-4">
                <div 
                  className="bg-amber-600 h-2.5 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${generationProgress}%` }}
                ></div>
              </div>
              
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {generationProgress}% Complete
              </p>
              
              {/* Fun facts to keep user engaged */}
              <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <p className="text-xs text-amber-800 dark:text-amber-200">
                  💡 Did you know? Your biblical documents are being carefully analyzed to create thoughtful questions that test understanding of scripture and theological concepts!
                </p>
              </div>
              
              {/* Cancel Button */}
              <div className="mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    // Stop polling
                    if (pollIntervalRef.current) {
                      clearInterval(pollIntervalRef.current);
                      pollIntervalRef.current = null;
                    }
                    // Reset all states
                    setLoading(false);
                    isSubmittingRef.current = false;
                    setJobId(null);
                    setGenerationProgress(0);
                    setGenerationMessage("");
                    // No quiz will be created since we're cancelling before completion
                  }}
                  className="w-full"
                >
                  Cancel Generation
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/educator/dashboard" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-4">
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Back to Dashboard
          </Link>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Create Quiz
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Set up your quiz in three simple steps
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className={`flex items-center ${step >= 1 ? "text-amber-600" : "text-gray-400"}`}>
              <div className={`rounded-full h-8 w-8 flex items-center justify-center border-2 text-sm ${
                step >= 1 ? "border-amber-600 bg-amber-600 text-white" : "border-gray-300"
              }`}>
                1
              </div>
              <span className="ml-2 text-sm font-medium">Basic Info</span>
            </div>
            <div className={`flex-1 h-0.5 mx-3 ${step >= 2 ? "bg-amber-600" : "bg-gray-300"}`} />
            <div className={`flex items-center ${step >= 2 ? "text-amber-600" : "text-gray-400"}`}>
              <div className={`rounded-full h-8 w-8 flex items-center justify-center border-2 text-sm ${
                step >= 2 ? "border-amber-600 bg-amber-600 text-white" : "border-gray-300"
              }`}>
                2
              </div>
              <span className="ml-2 text-sm font-medium">Documents</span>
            </div>
            <div className={`flex-1 h-0.5 mx-3 ${step >= 3 ? "bg-amber-600" : "bg-gray-300"}`} />
            <div className={`flex items-center ${step >= 3 ? "text-amber-600" : "text-gray-400"}`}>
              <div className={`rounded-full h-8 w-8 flex items-center justify-center border-2 text-sm ${
                step >= 3 ? "border-amber-600 bg-amber-600 text-white" : "border-gray-300"
              }`}>
                3
              </div>
              <span className="ml-2 text-sm font-medium">Configuration</span>
            </div>
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                Basic Information
              </h2>
              
              <div>
                <Label className="text-sm font-heading font-medium text-gray-900 dark:text-white mb-2">
                  Sacred Quest Title
                </Label>
                <Input
                  type="text"
                  value={config.title}
                  onChange={(e) => setConfig({ ...config, title: e.target.value })}
                  className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-amber-500 focus:border-amber-500"
                  placeholder="e.g., Wisdom of Solomon Quest"
                />
              </div>

              <div>
                <Label className="text-sm font-heading font-medium text-gray-900 dark:text-white mb-2">
                  Divine Description
                </Label>
                <Textarea
                  value={config.description}
                  onChange={(e) => setConfig({ ...config, description: e.target.value })}
                  rows={3}
                  className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-amber-500 focus:border-amber-500 resize-none"
                  placeholder="Describe the sacred journey and learning objectives..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label className="text-sm font-heading font-medium text-gray-900 dark:text-white mb-2">
                    Sacred Date
                  </Label>
                  <Input
                    type="date"
                    value={getDateFromStartTime()}
                    onChange={(e) => updateDateTime(e.target.value, getTimeFromStartTime())}
                    className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
                <div>
                  <Label className="text-sm font-heading font-medium text-gray-900 dark:text-white mb-2">
                    Divine Hour
                  </Label>
                  <Input
                    type="time"
                    value={getTimeFromStartTime()}
                    onChange={(e) => updateDateTime(getDateFromStartTime(), e.target.value)}
                    className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
                <div>
                  <TimezoneSelector
                    value={config.timezone}
                    onChange={(timezone) => setConfig({ ...config, timezone })}
                    onTimezoneChange={(timezone) => {
                      // When timezone changes, update timezone (startTime stays the same for user convenience)
                      setConfig({ ...config, timezone });
                    }}
                    showLabel={true}
                    className=""
                  />
                </div>
                <div>
                  <Label className="text-sm font-heading font-medium text-gray-900 dark:text-white mb-2">
                    Quest Duration
                  </Label>
                  <Select
                    value={config.duration.toString()}
                    onValueChange={(value) => setConfig({ ...config, duration: parseInt(value) })}
                  >
                    <SelectTrigger className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-amber-500 focus:border-amber-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="45">45 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="90">1.5 hours</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Date/Time Preview with Timezone */}
              <div className="mt-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-heading font-semibold text-amber-800 dark:text-amber-300">
                      🗓️ Quest Schedule Preview:
                    </span>
                    <span className="text-xs px-2 py-1 bg-amber-100 dark:bg-amber-800 text-amber-700 dark:text-amber-300 rounded-full">
                      {config.timezone.split('/')[1]?.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="font-body text-amber-700 dark:text-amber-400">
                    📅 {config.startTime ? (() => {
                      const utcDate = toUTC(config.startTime);
                      return isNaN(utcDate.getTime()) ? 'Invalid time' : formatDate(utcDate);
                    })() : 'No time selected'}
                  </div>
                  <div className="text-xs text-amber-600 dark:text-amber-500">
                    ⏱️ Duration: {config.duration} minutes • Ends at {config.startTime ? (() => {
                      const utcDate = toUTC(config.startTime);
                      if (isNaN(utcDate.getTime())) return 'Invalid time';
                      const endDate = new Date(utcDate.getTime() + config.duration * 60000);
                      return isNaN(endDate.getTime()) ? 'Invalid time' : formatDate(
                        endDate,
                        { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' }
                      );
                    })() : 'TBD'}
                  </div>
                  {config.startTime && !isQuizTimeValid(config.startTime, userTimezone) && (
                    <div className="text-xs text-red-600 dark:text-red-400 font-medium">
                      ⚠️ Quiz time should be at least 5 minutes in the future
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                Select Documents
              </h2>
              
              {documents.length === 0 ? (
                <div className="text-center py-8">
                  <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">
                    No processed documents available.
                  </p>
                  <Link href="/educator/documents/upload">
                    <Button className="mt-4">Upload Documents</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        config.documentIds.includes(doc.id)
                          ? "border-amber-500 bg-amber-50 dark:bg-amber-900/20"
                          : "border-gray-300 dark:border-gray-600 hover:border-gray-400"
                      }`}
                      onClick={() => {
                        const newIds = config.documentIds.includes(doc.id)
                          ? config.documentIds.filter(id => id !== doc.id)
                          : [...config.documentIds, doc.id];
                        setConfig({ ...config, documentIds: newIds });
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <DocumentTextIcon className="h-6 w-6 text-amber-600 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white truncate">
                              {doc.filename}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {doc.processedData?.lightragDocumentId && (
                                <span title={`Document ID: ${doc.processedData.lightragDocumentId}`}>
                                  ID: {doc.processedData.lightragDocumentId.substring(0, 8)}...
                                </span>
                              )}
                              {doc.uploadDate && (
                                <span>• {new Date(doc.uploadDate).toLocaleDateString()}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        {config.documentIds.includes(doc.id) && (
                          <CheckCircleIcon className="h-5 w-5 text-amber-600 flex-shrink-0" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                    Quiz Configuration
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Configure your biblical quiz parameters
                  </p>
                </div>
                
                {/* Completion Status Legend */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 min-w-[250px]">
                  <div className="flex items-center gap-2 mb-2">
                    <InformationCircleIcon className="h-4 w-4 text-blue-500" />
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Requirements Checklist</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs">
                      {selectedBook ? (
                        <CheckIcon className="h-3 w-3 text-green-500" />
                      ) : (
                        <XMarkIcon className="h-3 w-3 text-red-500" />
                      )}
                      <span className={selectedBook ? "text-green-600 dark:text-green-400" : "text-gray-500 dark:text-gray-400"}>
                        Biblical Book Selected
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      {chapterInput ? (
                        <CheckIcon className="h-3 w-3 text-green-500" />
                      ) : (
                        <XMarkIcon className="h-3 w-3 text-red-500" />
                      )}
                      <span className={chapterInput ? "text-green-600 dark:text-green-400" : "text-gray-500 dark:text-gray-400"}>
                        Chapters Specified
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      {config.bloomsLevels.length >= 2 ? (
                        <CheckIcon className="h-3 w-3 text-green-500" />
                      ) : (
                        <XMarkIcon className="h-3 w-3 text-red-500" />
                      )}
                      <span className={config.bloomsLevels.length >= 2 ? "text-green-600 dark:text-green-400" : "text-gray-500 dark:text-gray-400"}>
                        2+ Complexity Levels
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      {config.bloomsLevels.length >= 3 ? (
                        <CheckIcon className="h-3 w-3 text-green-500" />
                      ) : (
                        <InformationCircleIcon className="h-3 w-3 text-amber-500" />
                      )}
                      <span className={config.bloomsLevels.length >= 3 ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}>
                        3rd Level (Recommended)
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Biblical Book and Chapters - Required */}
              <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg p-4 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <BookmarkIcon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-300">Scripture Selection</h3>
                  <span className="text-xs text-amber-600 dark:text-amber-400">(Required)</span>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Biblical Book <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={selectedBook}
                    onValueChange={(value) => {
                      setSelectedBook(value);
                      setConfig({ ...config, books: value ? [value] : [] });
                    }}
                    required
                  >
                    <SelectTrigger className={`bg-white dark:bg-gray-800 ${!selectedBook ? 'border-red-300 dark:border-red-700' : 'border-gray-200 dark:border-gray-700'} focus:ring-amber-500 focus:border-amber-500 h-10`}>
                      <SelectValue placeholder="Select a book..." />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="px-2 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400">Old Testament</div>
                      {biblicalBooks.slice(0, 39).map(book => (
                        <SelectItem key={book} value={book}>{book}</SelectItem>
                      ))}
                      <div className="px-2 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 border-t mt-1 pt-2">New Testament</div>
                      {biblicalBooks.slice(39).map(book => (
                        <SelectItem key={book} value={book}>{book}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Chapters <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="text"
                    value={chapterInput}
                    onChange={(e) => {
                      setChapterInput(e.target.value);
                      setConfig({ ...config, chapters: e.target.value ? [e.target.value] : [] });
                    }}
                    placeholder="e.g., 1-10 or 2,3,5"
                    className={`bg-white dark:bg-gray-800 ${!chapterInput ? 'border-red-300 dark:border-red-700' : 'border-gray-200 dark:border-gray-700'} focus:ring-amber-500 focus:border-amber-500 h-10`}
                    required
                  />
                  <div className="flex items-start gap-2 mt-1">
                    <InformationCircleIcon className="h-3 w-3 text-gray-400 mt-0.5" />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Enter chapter ranges (1-10) or specific chapters (2,3,5)
                    </p>
                  </div>
                </div>
              </div>

              {/* Quiz Settings */}
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <ArrowPathIcon className="h-4 w-4" />
                  Quiz Settings
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                      Number of Questions
                    </Label>
                    <div className="relative">
                      <Input
                        type="number"
                        value={config.questionCount || ""}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 10;
                          // Enforce max limit of 25 questions
                          const limitedValue = Math.min(value, 25);
                          setConfig({ ...config, questionCount: limitedValue });
                        }}
                        min={5}
                        max={25}
                        className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-amber-500 focus:border-amber-500 pr-16 h-10"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 dark:text-gray-400">
                        5-25
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      AI will generate this many questions
                    </p>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                      Overall Difficulty
                    </Label>
                    <Select
                      value={config.difficulty}
                      onValueChange={(value) => setConfig({ ...config, difficulty: value as "easy" | "intermediate" | "hard" })}
                    >
                      <SelectTrigger className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-amber-500 focus:border-amber-500 h-10">
                        <SelectValue placeholder="Select difficulty" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">
                          <div className="flex items-center gap-2">
                            <span className="text-green-600">●</span>
                            Easy - Basic understanding
                          </div>
                        </SelectItem>
                        <SelectItem value="intermediate">
                          <div className="flex items-center gap-2">
                            <span className="text-amber-600">●</span>
                            Medium - Balanced challenge
                          </div>
                        </SelectItem>
                        <SelectItem value="hard">
                          <div className="flex items-center gap-2">
                            <span className="text-red-600">●</span>
                            Hard - Deep knowledge required
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Sets the overall complexity level
                    </p>
                  </div>
                </div>
              </div>

              {/* Question Complexity */}
              <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-white">
                      Question Complexity Types
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Select thinking skills to test (minimum 2 required)
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {config.bloomsLevels.length < 2 && (
                      <span className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                        <ExclamationTriangleIcon className="h-3 w-3" />
                        Select at least 2
                      </span>
                    )}
                    {config.bloomsLevels.length === 2 && (
                      <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <InformationCircleIcon className="h-3 w-3" />
                        Consider adding a 3rd
                      </span>
                    )}
                    {config.bloomsLevels.length >= 3 && (
                      <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                        <CheckCircleIcon className="h-3 w-3" />
                        Great selection!
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  {complexityLevels.map((level, index) => {
                    const isDefault = level.value === "knowledge" || level.value === "comprehension";
                    const isRecommended = level.value === "application";
                    const isChecked = config.bloomsLevels.includes(level.value);
                    
                    return (
                      <label 
                        key={level.value} 
                        className={`flex items-start p-3 bg-white dark:bg-gray-800 border rounded-lg cursor-pointer transition-all ${
                          isChecked 
                            ? 'border-amber-500 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/20' 
                            : isDefault && !isChecked
                            ? 'border-red-300 dark:border-red-700'
                            : isRecommended && !isChecked && config.bloomsLevels.length === 2
                            ? 'border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/10'
                            : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
                        }`}
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={(checked) => {
                            const newLevels = checked
                              ? [...config.bloomsLevels, level.value]
                              : config.bloomsLevels.filter(l => l !== level.value);
                            setConfig({ ...config, bloomsLevels: newLevels });
                          }}
                          className="mt-1 mr-3 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {level.label}
                            </span>
                            {isDefault && (
                              <span className="text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 rounded-full">
                                Default
                              </span>
                            )}
                            {isRecommended && config.bloomsLevels.length === 2 && !isChecked && (
                              <span className="text-xs px-1.5 py-0.5 bg-amber-100 dark:bg-amber-800 text-amber-700 dark:text-amber-300 rounded-full animate-pulse">
                                Recommended
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {level.description}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Additional Options */}
              <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-green-800 dark:text-green-300 mb-3 flex items-center gap-2">
                  <CheckCircleIcon className="h-4 w-4" />
                  Additional Options
                </h3>
                <label className="flex items-center cursor-pointer">
                  <Checkbox
                    checked={config.shuffleQuestions}
                    onCheckedChange={(checked) => setConfig({ ...config, shuffleQuestions: !!checked })}
                    className="mr-3 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      Randomize Question Order
                    </span>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Each student will receive questions in a different order to prevent cheating
                    </p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
            {/* Validation Summary for Step 3 */}
            {step === 3 && validationIssues.length > 0 && (
              <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <div className="flex items-start gap-2">
                  <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                      Complete the following to enable quiz creation:
                    </p>
                    <ul className="mt-1 text-xs text-yellow-700 dark:text-yellow-400 list-disc list-inside">
                      {validationIssues.map((issue, idx) => (
                        <li key={idx}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex justify-between items-center">
              <Button
                variant="ghost"
                onClick={() => setStep(Math.max(1, step - 1))}
                disabled={step === 1}
                size="sm"
              >
                <ArrowLeftIcon className="h-4 w-4 mr-1" />
                Previous
              </Button>
            
              {step < 3 ? (
                <Button
                  onClick={() => setStep(Math.min(3, step + 1))}
                  disabled={
                    (step === 1 && !config.title) ||
                    (step === 2 && config.documentIds.length === 0)
                  }
                  size="sm"
                >
                  Next
                  <ArrowRightIcon className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  {validationIssues.length > 0 && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {validationIssues.length} requirement{validationIssues.length !== 1 ? 's' : ''} remaining
                    </span>
                  )}
                  <Button
                    onClick={handleSubmit}
                    disabled={
                      loading || 
                      !config.title || 
                      config.documentIds.length === 0 || 
                      !selectedBook || 
                      !chapterInput || 
                      config.bloomsLevels.length < 2 || // Changed to require minimum 2
                      !config.startTime ||
                      !isQuizTimeValid(config.startTime, userTimezone)
                    }
                    size="sm"
                    className={validationIssues.length === 0 ? 'bg-amber-600 hover:bg-amber-700' : ''}
                  >
                    {loading ? (
                      <>
                        <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <BookmarkIcon className="h-4 w-4 mr-2" />
                        Create Quiz
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CreateQuizPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <CreateQuizContent />
    </Suspense>
  );
}