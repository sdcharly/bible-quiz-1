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
  getCurrentTimeInUserTimezone,
  getDefaultTimezone,
  convertUserTimezoneToUTC 
} from "@/lib/timezone";
import { TimezoneSelector } from "@/components/ui/timezone-selector";
import { Progress } from "@/components/ui/progress";
import { Loading } from "@/components/ui/loading";
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  AlertCircle, BookOpen, Upload, Clock, Calendar, Globe, 
  BookOpenCheck, Brain, RefreshCw, ArrowLeft, ArrowRight,
  FileText, CheckCircle, Check
} from "lucide-react";
import { isFeatureEnabled, FEATURE_FLAGS } from "@/lib/feature-flags";
import { PageHeader, PageContainer, Section, LoadingState } from "@/components/educator-v2";
import { logger } from "@/lib/logger";

// ... Keep all the existing interfaces and types ...

interface Document {
  id: string;
  filename: string;
  displayName?: string | null;
  status: string;
  uploadDate: string;
  fileSize: number;
}

interface QuizConfig {
  title: string;
  description: string;
  documentIds: string[];
  topics: string[];
  books: string[];
  chapters: string[];
  difficulty: "easy" | "intermediate" | "hard";
  bloomsLevels: string[];
  questionCount: number;
  duration: number;
  startTime: string;
  timezone: string;
  shuffleQuestions: boolean;
  useDeferredScheduling?: boolean;
}

function CreateQuizContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const documentId = searchParams.get("documentId");
  const [educatorId, setEducatorId] = useState<string | null>(null);
  const [isDeferredEnabled, setIsDeferredEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Get user session to determine educator ID and feature flag
  useEffect(() => {
    // Check if running on client side
    if (typeof window === 'undefined') {
      return;
    }
    
    fetch('/api/auth/get-user-role')
      .then(res => res.json())
      .then(data => {
        if (data.user?.id) {
          setEducatorId(data.user.id);
          // Check feature flag after we have the educator ID
          try {
            const flagEnabled = isFeatureEnabled(FEATURE_FLAGS.DEFERRED_TIME, data.user.id);
            setIsDeferredEnabled(flagEnabled);
            // Update config with the feature flag value
            setConfig(prev => ({
              ...prev,
              useDeferredScheduling: flagEnabled
            }));
          } catch (error) {
            logger.error('Error checking feature flag:', error);
            setIsDeferredEnabled(false);
          }
        } else {
          setEducatorId('');
          // Check if feature flag is enabled globally (100% rollout)
          try {
            const flagEnabled = isFeatureEnabled(FEATURE_FLAGS.DEFERRED_TIME, '');
            setIsDeferredEnabled(flagEnabled);
            setConfig(prev => ({
              ...prev,
              useDeferredScheduling: flagEnabled
            }));
          } catch (error) {
            logger.error('Error checking feature flag:', error);
            setIsDeferredEnabled(false);
          }
        }
      })
      .catch((error) => {
        logger.error('Error fetching user role:', error);
        // If error, still allow but feature flag will default to false
        setEducatorId('');
        try {
          const flagEnabled = isFeatureEnabled(FEATURE_FLAGS.DEFERRED_TIME, '');
          setIsDeferredEnabled(flagEnabled);
          setConfig(prev => ({
            ...prev,
            useDeferredScheduling: flagEnabled
          }));
        } catch (flagError) {
          logger.error('Error checking feature flag:', flagError);
          setIsDeferredEnabled(false);
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  // State management
  const [currentStep, setCurrentStep] = useState(1);
  const TOTAL_STEPS = 3;
  const [loading, setLoading] = useState(false);
  const isSubmittingRef = useRef(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationMessage, setGenerationMessage] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isCompletingRef = useRef(false);
  const hasShownErrorRef = useRef(false);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 3;
  const [documents, setDocuments] = useState<Document[]>([]);
  const [config, setConfig] = useState<QuizConfig>({
    title: "",
    description: "",
    documentIds: documentId ? [documentId] : [],
    topics: [],
    books: [],
    chapters: [],
    difficulty: "intermediate",
    bloomsLevels: ["knowledge"],
    questionCount: 10,
    duration: 30,
    startTime: "",
    timezone: getDefaultTimezone(),
    shuffleQuestions: false,
    useDeferredScheduling: false // Will be updated when educatorId is loaded
  });

  const [selectedBook, setSelectedBook] = useState("");
  const [chapterInput, setChapterInput] = useState("");
  const [userTimezone] = useState(getDefaultTimezone());

  // Initialize start time when component mounts or timezone changes
  useEffect(() => {
    if (!config.startTime && userTimezone) {
      const currentTimeInUserTz = getCurrentTimeInUserTimezone(userTimezone);
      setConfig(prev => ({ 
        ...prev, 
        startTime: currentTimeInUserTz,
        timezone: userTimezone 
      }));
    }
  }, [userTimezone]);

  const handleDateTimeChange = (date: string, time: string) => {
    // Ensure time has seconds if not provided
    const timeWithSeconds = time.includes(":") && time.split(":").length === 3 
      ? time 
      : time + ":00";
    const newDateTime = `${date}T${timeWithSeconds}`;
    setConfig({ ...config, startTime: newDateTime });
  };
  
  // ... Keep all the existing functions (fetchDocuments, pollJobStatus, handleSubmit, etc.) ...
  
  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const response = await fetch("/api/educator/documents");
        if (response.ok) {
          const data = await response.json();
          // Handle both array and object response formats
          const docs = data.documents || data;
          
          if (Array.isArray(docs)) {
            const validDocs = docs.filter(
              (doc: Document) => doc.status === "processed"
            );
            setDocuments(validDocs);
          } else {
            logger.error("Documents response is not an array:", data);
            setDocuments([]);
          }
        } else {
          logger.error("Failed to fetch documents:", response.status);
          setDocuments([]);
        }
      } catch (error) {
        logger.error("Error fetching documents:", error);
        setDocuments([]);
      }
    };

    fetchDocuments();
  }, []);

  // Poll job status for async quiz creation
  const pollJobStatus = (jobId: string, quizId: string) => {
    let attempts = 0;
    const MAX_ATTEMPTS = 1200; // 20 minutes at 1 second intervals
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
          logger.log(`[POLL-QUIZ] Job ${jobId} status:`, status.status, `progress:`, status.progress);
          
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
          consecutiveErrors = 0; // Reset error counter on success
          
          if (status.status === 'completed' && !isCompletingRef.current) {
            isCompletingRef.current = true;
            logger.log(`[POLL-QUIZ] Job ${jobId} completed with quizId:`, quizId);
            
            // Stop polling
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
            
            setGenerationProgress(100);
            setGenerationMessage("Quiz created successfully! Redirecting...");
            
            // Small delay to show completion
            setTimeout(() => {
              router.push(`/educator/quiz/${quizId}/review`);
            }, 1000);
          } else if (status.status === 'failed') {
            logger.error(`[POLL-QUIZ] Job ${jobId} failed:`, status.error);
            
            // Stop polling immediately - no retries for failed jobs
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
            
            // Clear the job ID since it's failed
            setJobId(null);
            
            // Show clear error message to educator
            if (!hasShownErrorRef.current) {
              hasShownErrorRef.current = true;
              setLoading(false);
              isSubmittingRef.current = false;
              setGenerationProgress(0);
              setGenerationMessage("");
              
              // Provide helpful error message based on the error type
              let errorMessage = "AI failed to generate quiz questions. ";
              
              if (status.error?.includes("missing required fields")) {
                errorMessage += "The AI couldn't create properly formatted questions. This sometimes happens with complex biblical content. Please try again.";
              } else if (status.error?.includes("timeout")) {
                errorMessage += "The generation process took too long. Please try with fewer questions or simpler settings.";
              } else {
                errorMessage += status.error || "Please try again with different settings or fewer questions.";
              }
              
              // Show error with option to retry
              if (confirm(errorMessage + "\n\nWould you like to try generating the quiz again?")) {
                // Reset the form for a fresh attempt
                hasShownErrorRef.current = false;
                retryCountRef.current = 0;
                // User can click Generate Quiz button again
              }
            }
          }
        } else {
          consecutiveErrors++;
          logger.error(`[POLL-QUIZ] Polling error (${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS}):`, response.status);
          
          if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
            logger.error(`[POLL-QUIZ] Too many consecutive errors, attempting to check if quiz exists`);
            
            // Stop polling
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
            
            // Check if quiz was actually created
            try {
              const checkResponse = await fetch(`/api/educator/quiz/${quizId}`);
              if (checkResponse.ok) {
                // Quiz exists, just redirect
                logger.log(`[POLL-QUIZ] Quiz exists, redirecting despite polling errors`);
                router.push(`/educator/quiz/${quizId}/review`);
                return;
              }
            } catch (checkError) {
              logger.error(`[POLL-QUIZ] Failed to check quiz existence:`, checkError);
            }
            
            setLoading(false);
            isSubmittingRef.current = false;
            setGenerationProgress(0);
            alert("Connection issues detected. The quiz may have been created. Please check your quizzes list.");
          }
        }
      } catch (error) {
        consecutiveErrors++;
        logger.error(`[POLL-QUIZ] Network error (${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS}):`, error);
        
        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
          logger.error(`[POLL-QUIZ] Too many consecutive errors, checking quiz existence`);
          
          // Stop polling
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          
          // Check if quiz was actually created
          try {
            const checkResponse = await fetch(`/api/educator/quiz/${quizId}`);
            if (checkResponse.ok) {
              // Quiz exists, just redirect
              logger.log(`[POLL-QUIZ] Quiz exists, redirecting despite polling errors`);
              router.push(`/educator/quiz/${quizId}/review`);
              return;
            }
          } catch (checkError) {
            logger.error(`[POLL-QUIZ] Failed to check quiz existence:`, checkError);
          }
          
          setLoading(false);
          isSubmittingRef.current = false;
          setGenerationProgress(0);
          alert("Connection issues detected. The quiz may have been created. Please check your quizzes list.");
        }
      }
    }, 1000); // Poll every second
  };

  const handleSubmit = async () => {
    // Prevent multiple submissions using both state and ref
    if (loading || isSubmittingRef.current) {
      logger.log("Quiz creation already in progress, ignoring duplicate submission");
      return;
    }
    
    // Set both state and ref to prevent race conditions
    isSubmittingRef.current = true;
    setLoading(true);
    setGenerationProgress(0);
    setGenerationMessage("Preparing biblical knowledge assessment...");
    
    try {
      // Always use create-async endpoint for question generation
      const endpoint = "/api/educator/quiz/create-async";
      
      // Prepare config for backend
      let configForBackend;
      
      if (isDeferredEnabled && config.useDeferredScheduling) {
        // Deferred mode - use a far future placeholder time
        // This will be updated when the quiz is published
        const placeholderTime = new Date();
        placeholderTime.setFullYear(placeholderTime.getFullYear() + 1); // 1 year from now as placeholder
        
        configForBackend = {
          ...config,
          startTime: placeholderTime.toISOString(),
          timezone: config.timezone || getDefaultTimezone(),
          useDeferredScheduling: true // Pass this flag to backend
        };
      } else {
        // Normal mode - convert time to UTC as before
        const startTimeUTC = convertUserTimezoneToUTC(config.startTime, config.timezone);
        configForBackend = {
          ...config,
          startTime: startTimeUTC.toISOString(),
          useDeferredScheduling: false
        };
      }
      
      const response = await fetch(endpoint, {
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
          logger.log('[QUIZ-CREATE] Starting polling for job status updates');
          pollJobStatus(data.jobId, data.quizId || data.quiz?.id);
        } else if (data.quiz?.id) {
          // Direct creation (deferred mode might return immediately)
          router.push(`/educator/quiz/${data.quiz.id}/review`);
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
      logger.error("Error creating quiz:", error);
      alert("Failed to create quiz. Please try again.");
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  // ... Keep all the existing UI components and helper functions ...

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
      label: "🔧 Application",
      description: "Apply biblical principles to real-life situations and modern contexts"
    },
    { 
      value: "analysis", 
      label: "🔍 Analysis",
      description: "Compare passages, identify patterns, and examine relationships"
    },
    { 
      value: "synthesis", 
      label: "🎨 Synthesis",
      description: "Create connections between different biblical concepts and form new insights"
    },
    { 
      value: "evaluation", 
      label: "⚖️ Evaluation",
      description: "Judge interpretations, assess theological arguments, and defend positions"
    }
  ];

  const booksOfBible = [
    // Old Testament
    "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy",
    "Joshua", "Judges", "Ruth", "1 Samuel", "2 Samuel",
    "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles",
    "Ezra", "Nehemiah", "Esther", "Job", "Psalms", "Proverbs",
    "Ecclesiastes", "Song of Solomon", "Isaiah", "Jeremiah",
    "Lamentations", "Ezekiel", "Daniel", "Hosea", "Joel",
    "Amos", "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk",
    "Zephaniah", "Haggai", "Zechariah", "Malachi",
    // New Testament
    "Matthew", "Mark", "Luke", "John", "Acts", "Romans",
    "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians",
    "Philippians", "Colossians", "1 Thessalonians", "2 Thessalonians",
    "1 Timothy", "2 Timothy", "Titus", "Philemon", "Hebrews",
    "James", "1 Peter", "2 Peter", "1 John", "2 John", "3 John",
    "Jude", "Revelation"
  ];

  const getStepTitle = (step: number) => {
    switch (step) {
      case 1:
        return "📚 Choose Your Scripture Sources";
      case 2:
        return "🎯 Define Your Assessment Focus";
      case 3:
        return "⚙️ Configure Assessment Details";
      default:
        return "";
    }
  };

  const getStepDescription = (step: number) => {
    switch (step) {
      case 1:
        return "Choose documents for your quiz";
      case 2:
        return "Select books, chapters, and topics";
      case 3:
        return "Configure quiz settings";
      default:
        return "";
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return config.documentIds.length > 0;
      case 2:
        return config.books.length > 0;
      case 3:
        return (
          config.title.trim() !== "" &&
          config.bloomsLevels.length > 0 &&
          config.questionCount >= 5 &&
          config.questionCount <= 25 &&
          (config.useDeferredScheduling || config.startTime !== "") // Only require time in legacy mode
        );
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (canProceed()) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Keep all the existing JSX render code unchanged...
  
  // Show loading state while checking feature flags
  if (isLoading) {
    return <LoadingState fullPage text="Loading quiz creation..." />;
  }
  
  return (
    <>
      <PageHeader
        title="Create Quiz"
        subtitle={isDeferredEnabled ? "✨ Create now, schedule later" : "Create a new biblical quiz from your documents"}
        icon={BookOpen}
        breadcrumbs={[
          { label: 'Dashboard', href: '/educator/dashboard' },
          { label: 'Quizzes', href: '/educator/quizzes' },
          { label: 'Create' }
        ]}
      />
      
      <PageContainer>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className={`flex items-center ${
                  step < 3 ? "flex-1" : ""
                }`}
              >
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                    step <= currentStep
                      ? "bg-amber-600 border-amber-600 text-white"
                      : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {step < currentStep ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <span className="font-semibold">{step}</span>
                  )}
                </div>
                {step < 3 && (
                  <div
                    className={`flex-1 h-1 mx-2 ${
                      step < currentStep
                        ? "bg-amber-600"
                        : "bg-gray-300 dark:bg-gray-700"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          
          {/* Step Title and Description */}
          <div className="text-center mb-4">
            <h2 className="text-lg font-medium text-gray-800 dark:text-gray-100">
              {getStepTitle(currentStep)}
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
              {getStepDescription(currentStep)}
            </p>
          </div>
        </div>

        {/* Form Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-amber-200 dark:border-gray-700 p-4">
          {/* Keep all your existing step content exactly the same */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <Label className="text-base font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                  <FileText className="h-4 w-4 mr-2 text-amber-600" />
                  Select Documents
                </Label>
                
                {documents.length === 0 ? (
                  <div className="border-2 border-dashed border-amber-300 dark:border-gray-600 rounded-lg p-4 text-center">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-amber-500" />
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      No documents available
                    </p>
                    <Link href="/educator/documents/upload">
                      <Button className="bg-amber-600 hover:bg-amber-700 text-white">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Documents
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2 max-h-80 overflow-y-auto">
                    {documents.map((doc) => (
                      <label
                        key={doc.id}
                        className={`flex items-center p-3 border rounded cursor-pointer transition-all ${
                          config.documentIds.includes(doc.id)
                            ? "border-amber-500 bg-amber-50 dark:bg-amber-900/20"
                            : "border-gray-200 dark:border-gray-700 hover:border-amber-300 dark:hover:border-amber-700"
                        }`}
                      >
                        <Checkbox
                          checked={config.documentIds.includes(doc.id)}
                          onCheckedChange={(checked) => {
                            const newIds = checked
                              ? [...config.documentIds, doc.id]
                              : config.documentIds.filter(id => id !== doc.id);
                            setConfig({ ...config, documentIds: newIds });
                          }}
                          className="mr-4 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
                        />
                        <div className="flex-1">
                          <div className="flex items-center">
                            <BookOpen className="h-5 w-5 mr-2 text-amber-600 flex-shrink-0" />
                            <div className="min-w-0">
                              <span className="font-medium text-gray-800 dark:text-gray-200 block truncate">
                                {doc.displayName || doc.filename}
                              </span>
                              {doc.displayName && (
                                <span className="text-xs text-gray-500 dark:text-gray-400 block truncate">
                                  📁 {doc.filename}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2">
                            <span>Uploaded {new Date(doc.uploadDate).toLocaleDateString()}</span>
                            <span>•</span>
                            <span>{(doc.fileSize / 1024).toFixed(1)} KB</span>
                          </div>
                        </div>
                        <CheckCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                      </label>
                    ))}
                  </div>
                )}
                
                {config.documentIds.length > 0 && (
                  <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                    <p className="text-sm text-amber-700 dark:text-amber-400">
                      <strong>{config.documentIds.length}</strong> document{config.documentIds.length !== 1 ? 's' : ''} selected
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              {/* Biblical Book Selection */}
              <div>
                <Label className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                  <BookOpen className="h-5 w-5 mr-2 text-amber-600" />
                  Book of the Bible
                </Label>
                <Select
                  value={selectedBook}
                  onValueChange={(value) => {
                    setSelectedBook(value);
                    setConfig({ ...config, books: value ? [value] : [] });
                  }}
                  required
                >
                  <SelectTrigger className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-amber-500 focus:border-amber-500">
                    <SelectValue placeholder="Select a book..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-96">
                    <div className="font-semibold text-xs text-gray-500 px-2 py-1">Old Testament</div>
                    {booksOfBible.slice(0, 39).map((book) => (
                      <SelectItem key={book} value={book}>
                        {book}
                      </SelectItem>
                    ))}
                    <div className="font-semibold text-xs text-gray-500 px-2 py-1 mt-2">New Testament</div>
                    {booksOfBible.slice(39).map((book) => (
                      <SelectItem key={book} value={book}>
                        {book}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Chapter Selection */}
              <div>
                <Label className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Chapters (Optional)
                </Label>
                <Input
                  type="text"
                  value={chapterInput}
                  onChange={(e) => {
                    setChapterInput(e.target.value);
                    setConfig({ ...config, chapters: e.target.value ? [e.target.value] : [] });
                  }}
                  placeholder="e.g., 1-10 or 2,3,5"
                  className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-amber-500 focus:border-amber-500"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Leave empty to include all chapters from the selected book
                </p>
              </div>

              {/* Summary */}
              {config.books.length > 0 && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                  <h3 className="font-semibold text-amber-700 dark:text-amber-400 mb-2">
                    Assessment Scope:
                  </h3>
                  <ul className="text-sm text-amber-600 dark:text-amber-500 space-y-1">
                    <li>• Book: {config.books.join(", ")}</li>
                    {config.chapters.length > 0 && (
                      <li>• Chapters: {config.chapters.join(", ")}</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              {/* Basic Information */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Quiz Title <span className="text-orange-500">*</span>
                  </Label>
                  <Input
                    id="title"
                    type="text"
                    value={config.title}
                    onChange={(e) => setConfig({ ...config, title: e.target.value })}
                    className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-amber-500 focus:border-amber-500"
                    placeholder="e.g., Wisdom of Solomon Quest"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Description
                  </Label>
                  <Textarea
                    value={config.description}
                    onChange={(e) => setConfig({ ...config, description: e.target.value })}
                    rows={3}
                    className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-amber-500 focus:border-amber-500 resize-none"
                    placeholder="Describe the purpose and scope of this biblical assessment..."
                  />
                </div>
              </div>

              {/* Time Settings - Conditional based on feature flag */}
              {isDeferredEnabled && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="deferred-scheduling"
                      checked={config.useDeferredScheduling}
                      onCheckedChange={(checked) => 
                        setConfig({ ...config, useDeferredScheduling: !!checked })
                      }
                      className="data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
                    />
                    <Label 
                      htmlFor="deferred-scheduling" 
                      className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
                    >
                      Set quiz time later (when publishing)
                    </Label>
                  </div>
                  
                  {!config.useDeferredScheduling && (
                    <>
                      {/* Show existing time fields */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                            <Globe className="h-4 w-4 mr-1" />
                            Timezone
                          </Label>
                          <TimezoneSelector
                            value={config.timezone}
                            onChange={(timezone) => setConfig({ ...config, timezone })}
                            onTimezoneChange={(timezone) => {
                              setConfig({ ...config, timezone });
                            }}
                            showLabel={true}
                          />
                        </div>

                        <div>
                          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            Duration (minutes)
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

                      <div>
                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          Start Date & Time <span className="text-orange-500">*</span>
                        </Label>
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            type="date"
                            value={config.startTime ? config.startTime.split('T')[0] : ''}
                            onChange={(e) => {
                              const time = config.startTime ? config.startTime.split('T')[1] : '00:00:00';
                              handleDateTimeChange(e.target.value, time);
                            }}
                            className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-amber-500 focus:border-amber-500"
                            required={!config.useDeferredScheduling}
                          />
                          <Input
                            type="time"
                            value={config.startTime ? config.startTime.split('T')[1]?.substring(0, 5) : ''}
                            onChange={(e) => {
                              const date = config.startTime ? config.startTime.split('T')[0] : new Date().toISOString().split('T')[0];
                              handleDateTimeChange(date, e.target.value);
                            }}
                            className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-amber-500 focus:border-amber-500"
                            required={!config.useDeferredScheduling}
                          />
                        </div>
                      </div>
                    </>
                  )}
                  
                  {config.useDeferredScheduling && (
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                      <p className="text-sm text-amber-700 dark:text-amber-400">
                        <Clock className="h-4 w-4 inline mr-1" />
                        You&apos;ll set the quiz start time when you&apos;re ready to publish it to students.
                      </p>
                    </div>
                  )}
                </div>
              )}
              
              {/* If feature flag is not enabled, show existing time fields */}
              {!isDeferredEnabled && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                        <Globe className="h-4 w-4 mr-1" />
                        Timezone
                      </Label>
                      <TimezoneSelector
                        value={config.timezone}
                        onChange={(timezone) => setConfig({ ...config, timezone })}
                        onTimezoneChange={(timezone) => {
                          setConfig({ ...config, timezone });
                        }}
                        showLabel={true}
                      />
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        Duration (minutes)
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

                  <div>
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      Start Date & Time <span className="text-red-500">*</span>
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="date"
                        value={config.startTime ? config.startTime.split('T')[0] : ''}
                        onChange={(e) => {
                          const time = config.startTime ? config.startTime.split('T')[1] : '00:00:00';
                          handleDateTimeChange(e.target.value, time);
                        }}
                        className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-amber-500 focus:border-amber-500"
                        required
                      />
                      <Input
                        type="time"
                        value={config.startTime ? config.startTime.split('T')[1]?.substring(0, 5) : ''}
                        onChange={(e) => {
                          const date = config.startTime ? config.startTime.split('T')[0] : new Date().toISOString().split('T')[0];
                          handleDateTimeChange(date, e.target.value);
                        }}
                        className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-amber-500 focus:border-amber-500"
                        required
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Quiz Configuration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Number of Questions
                  </Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      type="number"
                      value={config.questionCount}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 0;
                        // Enforce max limit of 25 questions
                        const limitedValue = Math.min(value, 25);
                        setConfig({ ...config, questionCount: limitedValue });
                      }}
                      min={5}
                      max={25}
                      className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-amber-500 focus:border-amber-500"
                    />
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      (5-25)
                    </span>
                  </div>
                </div>

                <div>
                  <Label className="text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Difficulty Level
                  </Label>
                  <Select
                    value={config.difficulty}
                    onValueChange={(value) => setConfig({ ...config, difficulty: value as "easy" | "intermediate" | "hard" })}
                  >
                    <SelectTrigger className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-amber-500 focus:border-amber-500 h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">
                        <span className="flex items-center">
                          <span className="text-amber-600 mr-2">●</span>
                          Easy - Basic Understanding
                        </span>
                      </SelectItem>
                      <SelectItem value="intermediate">
                        <span className="flex items-center">
                          <span className="text-yellow-600 mr-2">●</span>
                          Intermediate - Deeper Knowledge
                        </span>
                      </SelectItem>
                      <SelectItem value="hard">
                        <span className="flex items-center">
                          <span className="text-orange-600 mr-2">●</span>
                          Hard - Advanced Comprehension
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Learning Objectives - Bloom's Taxonomy */}
              <div>
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                  <Brain className="h-4 w-4 mr-2 text-amber-600" />
                  Learning Objectives (Bloom&apos;s Taxonomy)
                  <span className="text-orange-500 ml-1">*</span>
                </Label>
                <div className="space-y-3">
                  {complexityLevels.map((level, index) => (
                    <div 
                      key={level.value} 
                      className={`p-4 rounded-lg border-2 transition-all ${
                        config.bloomsLevels.includes(level.value)
                          ? "border-amber-500 bg-amber-50 dark:bg-amber-900/20"
                          : "border-gray-200 dark:border-gray-700 hover:border-amber-300"
                      }`}
                    >
                      <label className="flex items-start cursor-pointer">
                        <Checkbox
                          checked={config.bloomsLevels.includes(level.value)}
                          onCheckedChange={(checked) => {
                            const newLevels = checked
                              ? [...config.bloomsLevels, level.value]
                              : config.bloomsLevels.filter(l => l !== level.value);
                            setConfig({ ...config, bloomsLevels: newLevels });
                          }}
                          className="mt-1 mr-3 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-gray-800 dark:text-gray-200">
                            {level.label}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {level.description}
                          </div>
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
                {config.bloomsLevels.length === 0 && (
                  <p className="text-sm text-orange-500 mt-2">
                    Please select at least one learning objective
                  </p>
                )}
              </div>

              {/* Additional Options */}
              <div className="space-y-3">
                <label className="flex items-center cursor-pointer">
                  <Checkbox
                    checked={config.shuffleQuestions}
                    onCheckedChange={(checked) => setConfig({ ...config, shuffleQuestions: !!checked })}
                    className="mr-3 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
                  />
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      Shuffle Questions
                    </span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Present questions in random order for each student
                    </p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex flex-col sm:flex-row sm:justify-between gap-3 mt-6">
            <Button
              onClick={handleBack}
              disabled={currentStep === 1}
              variant="outline"
              className="border-amber-600 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 min-h-[44px] w-full sm:w-auto"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>

            {currentStep < TOTAL_STEPS ? (
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
                className="bg-amber-600 hover:bg-amber-700 text-white min-h-[44px] w-full sm:w-auto"
              >
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={!canProceed() || loading}
                className="bg-amber-600 hover:bg-amber-700 text-white min-h-[44px] w-full sm:w-auto"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Creating Quiz...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Create Quiz
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Quiz Generation Modal */}
        {loading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6">
              <div className="text-center">
                <div className="mx-auto h-16 w-16 text-amber-600 mb-4">
                  <BookOpenCheck className="h-full w-full animate-pulse" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">
                  Crafting Your Biblical Assessment
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                  {generationMessage}
                </p>
                
                <Progress value={generationProgress} className="mb-4" />
                
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {generationProgress}% Complete
                </p>
                
                {generationProgress > 30 && (
                  <Alert className="mt-4 text-left">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      AI-powered biblical question generation may take several minutes for comprehensive assessments. 
                      Please keep this window open.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          </div>
        )}
      </PageContainer>
    </>
  );
}

export default function CreateQuizPage() {
  return (
    <Suspense fallback={<Loading />}>
      <CreateQuizContent />
    </Suspense>
  );
}