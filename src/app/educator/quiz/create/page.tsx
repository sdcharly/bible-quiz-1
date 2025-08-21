"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import {
  BookmarkIcon,
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
  const [documents, setDocuments] = useState<Document[]>([]);
  const [config, setConfig] = useState<QuizConfig>({
    title: "",
    description: "",
    documentIds: preselectedDocId ? [preselectedDocId] : [],
    questionCount: 10,
    duration: 30,
    passingScore: 70,
    difficulty: "intermediate",
    bloomsLevels: ["knowledge", "comprehension"],
    topics: [],
    books: [],
    chapters: [],
    startTime: "", // Will be set in useEffect
    timezone: userTimezone,
    shuffleQuestions: false,
  });
  
  // Initialize startTime with user's timezone
  useEffect(() => {
    if (!config.startTime) {
      const currentTimeInUserTz = getCurrentDateTime();
      setConfig(prev => ({ 
        ...prev, 
        startTime: currentTimeInUserTz,
        timezone: userTimezone 
      }));
    }
  }, [config.startTime, getCurrentDateTime, userTimezone]);
  
  const updateDateTime = (date: string, time: string) => {
    const newDateTime = `${date}T${time}`;
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
      return currentTimeInUserTz.split('T')[1];
    }
    return config.startTime.split('T')[1];
  };
  
  const [selectedBook, setSelectedBook] = useState<string>("");
  const [chapterInput, setChapterInput] = useState<string>("");

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

  const pollJobStatus = async (jobId: string, quizId: string) => {
    const maxAttempts = 180; // Poll for up to 3 minutes
    let attempts = 0;
    
    // Clear any existing interval
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
    
    // Reset completion flag
    isCompletingRef.current = false;
    
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
          
          // Update progress UI
          setGenerationProgress(status.progress || 0);
          setGenerationMessage(status.message || "Processing...");
          
          if (status.status === 'completed') {
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
            setGenerationMessage("Quiz generated successfully! Redirecting...");
            
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
            setGenerationProgress(0);
            alert(status.error || "Quiz generation failed. Please try again.");
          } else if (attempts >= maxAttempts) {
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
            setLoading(false);
            setGenerationProgress(0);
            alert("Quiz generation is taking longer than expected. You can check back later or try again.");
          }
        } else if (response.status === 404) {
          // Don't show error if we're in the process of completing
          if (!isCompletingRef.current) {
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
            setLoading(false);
            setGenerationProgress(0);
            alert("Quiz generation job expired. Please try again.");
          }
        }
      } catch (error) {
        // Don't process errors if we're completing
        if (!isCompletingRef.current) {
          console.error("Error polling status:", error);
          // Continue polling unless max attempts reached
          if (attempts >= maxAttempts) {
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
            setLoading(false);
            setGenerationProgress(0);
            alert("Failed to check quiz generation status. Please try again.");
          }
        }
      }
    }, 1000); // Poll every second
  };

  const handleSubmit = async () => {
    setLoading(true);
    setGenerationProgress(0);
    setGenerationMessage("Initializing quiz generation...");
    
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
          setGenerationMessage("Quiz creation started. Generating questions...");
          
          // Start polling for status
          pollJobStatus(data.jobId, data.quizId);
        } else {
          // Fallback to old behavior if no jobId
          router.push(`/educator/quiz/${data.quizId}/review`);
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(errorData.error || "Failed to create quiz. Please try again.");
        setLoading(false);
      }
    } catch (error) {
      console.error("Error creating quiz:", error);
      alert("Failed to create quiz. Please try again.");
      setLoading(false);
    }
  };

  const complexityLevels = [
    { 
      value: "knowledge", 
      label: "Basic Recall",
      description: "Remember facts and basic concepts"
    },
    { 
      value: "comprehension", 
      label: "Understanding",
      description: "Explain ideas and concepts"
    },
    { 
      value: "application", 
      label: "Practical Application",
      description: "Apply knowledge to new situations"
    },
    { 
      value: "analysis", 
      label: "Critical Thinking",
      description: "Draw connections and analyze information"
    },
    { 
      value: "synthesis", 
      label: "Creative Thinking",
      description: "Combine ideas to form new understanding"
    },
    { 
      value: "evaluation", 
      label: "Expert Evaluation",
      description: "Make judgments and defend opinions"
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
                  Please keep this page open. This may take 20-30 seconds...
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
                  💡 Did you know? AI is analyzing your documents and creating unique questions tailored to your selected topics and difficulty level!
                </p>
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
                <label className="block text-sm font-heading font-medium text-gray-900 dark:text-white mb-2">
                  Sacred Quest Title
                </label>
                <input
                  type="text"
                  value={config.title}
                  onChange={(e) => setConfig({ ...config, title: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-body focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-200"
                  placeholder="e.g., Wisdom of Solomon Quest"
                />
              </div>

              <div>
                <label className="block text-sm font-heading font-medium text-gray-900 dark:text-white mb-2">
                  Divine Description
                </label>
                <textarea
                  value={config.description}
                  onChange={(e) => setConfig({ ...config, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-body focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-200 resize-none"
                  placeholder="Describe the sacred journey and learning objectives..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-heading font-medium text-gray-900 dark:text-white mb-2">
                    Sacred Date
                  </label>
                  <input
                    type="date"
                    value={getDateFromStartTime()}
                    onChange={(e) => updateDateTime(e.target.value, getTimeFromStartTime())}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-body focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-heading font-medium text-gray-900 dark:text-white mb-2">
                    Divine Hour
                  </label>
                  <input
                    type="time"
                    value={getTimeFromStartTime()}
                    onChange={(e) => updateDateTime(getDateFromStartTime(), e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-body focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-200"
                  />
                </div>
                <div>
                  <TimezoneSelector
                    value={config.timezone}
                    onChange={(timezone) => setConfig({ ...config, timezone })}
                    onTimezoneChange={(timezone, currentTimeInTz) => {
                      // When timezone changes, update timezone (startTime stays the same for user convenience)
                      setConfig({ ...config, timezone });
                    }}
                    showLabel={true}
                    className=""
                  />
                </div>
                <div>
                  <label className="block text-sm font-heading font-medium text-gray-900 dark:text-white mb-2">
                    Quest Duration
                  </label>
                  <select
                    value={config.duration}
                    onChange={(e) => setConfig({ ...config, duration: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-body focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-200"
                  >
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={45}>45 minutes</option>
                    <option value={60}>1 hour</option>
                    <option value={90}>1.5 hours</option>
                    <option value={120}>2 hours</option>
                  </select>
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
                    📅 {config.startTime ? formatDate(toUTC(config.startTime).toISOString()) : 'No time selected'}
                  </div>
                  <div className="text-xs text-amber-600 dark:text-amber-500">
                    ⏱️ Duration: {config.duration} minutes • Ends at {config.startTime ? formatDate(
                      new Date(toUTC(config.startTime).getTime() + config.duration * 60000).toISOString(),
                      { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' }
                    ) : 'TBD'}
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
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                Quiz Configuration
              </h2>

              {/* Biblical Book and Chapters - Required */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Biblical Book <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedBook}
                    onChange={(e) => {
                      setSelectedBook(e.target.value);
                      setConfig({ ...config, books: e.target.value ? [e.target.value] : [] });
                    }}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select a book...</option>
                    <optgroup label="Old Testament">
                      {biblicalBooks.slice(0, 39).map(book => (
                        <option key={book} value={book}>{book}</option>
                      ))}
                    </optgroup>
                    <optgroup label="New Testament">
                      {biblicalBooks.slice(39).map(book => (
                        <option key={book} value={book}>{book}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Chapters <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={chapterInput}
                    onChange={(e) => {
                      setChapterInput(e.target.value);
                      setConfig({ ...config, chapters: e.target.value ? [e.target.value] : [] });
                    }}
                    placeholder="e.g., 1-10 or 2,3,5"
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    required
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Enter chapter ranges (1-10) or specific chapters (2,3,5)
                  </p>
                </div>
              </div>

              {/* Quiz Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Number of Questions
                  </label>
                  <input
                    type="number"
                    value={config.questionCount || ""}
                    onChange={(e) => setConfig({ ...config, questionCount: parseInt(e.target.value) || 10 })}
                    min="5"
                    max="100"
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Overall Difficulty
                  </label>
                  <select
                    value={config.difficulty}
                    onChange={(e) => setConfig({ ...config, difficulty: e.target.value as "easy" | "intermediate" | "hard" })}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  >
                    <option value="easy">Easy - Basic understanding</option>
                    <option value="intermediate">Medium - Balanced challenge</option>
                    <option value="hard">Hard - Deep knowledge required</option>
                  </select>
                </div>
              </div>

              {/* Question Complexity */}
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-3">
                  Question Complexity Types
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  Select the types of thinking skills you want to test
                </p>
                <div className="space-y-2">
                  {complexityLevels.map((level) => (
                    <label 
                      key={level.value} 
                      className="flex items-start p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-300 dark:hover:border-blue-700 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={config.bloomsLevels.includes(level.value)}
                        onChange={(e) => {
                          const newLevels = e.target.checked
                            ? [...config.bloomsLevels, level.value]
                            : config.bloomsLevels.filter(l => l !== level.value);
                          setConfig({ ...config, bloomsLevels: newLevels });
                        }}
                        className="mt-1 mr-3 h-4 w-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {level.label}
                        </span>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {level.description}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Shuffle Option */}
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.shuffleQuestions}
                    onChange={(e) => setConfig({ ...config, shuffleQuestions: e.target.checked })}
                    className="mr-3 h-4 w-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      Randomize Question Order
                    </span>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Each student will receive questions in a different order
                    </p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
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
              <Button
                onClick={handleSubmit}
                disabled={
                  loading || 
                  !config.title || 
                  config.documentIds.length === 0 || 
                  !selectedBook || 
                  !chapterInput || 
                  config.bloomsLevels.length === 0 ||
                  !config.startTime ||
                  !isQuizTimeValid(config.startTime, userTimezone)
                }
                size="sm"
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
            )}
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