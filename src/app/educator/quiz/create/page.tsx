"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  ArrowRight,
  FileText,
  Save,
  Loader2,
  CheckCircle,
} from "lucide-react";

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
  shuffleQuestions: boolean;
}

function CreateQuizContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedDocId = searchParams.get("documentId");
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
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
    startTime: new Date().toISOString().slice(0, 16),
    shuffleQuestions: false,
  });
  
  const [selectedBook, setSelectedBook] = useState<string>("");
  const [chapterInput, setChapterInput] = useState<string>("");

  useEffect(() => {
    fetchDocuments();
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

  const handleSubmit = async () => {
    setLoading(true);
    
    try {
      // Call quiz generation webhook
      const response = await fetch("/api/educator/quiz/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        const data = await response.json();
        
        // If webhook timed out, show a message but still redirect
        if (data.webhookTimedOut && data.message) {
          alert(data.message);
        }
        
        // Redirect to the quiz review page where educator can review and edit the generated questions
        router.push(`/educator/quiz/${data.quizId}/review`);
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(errorData.error || "Failed to create quiz. Please try again.");
      }
    } catch (error) {
      console.error("Error creating quiz:", error);
      alert("Failed to create quiz. Please try again.");
    } finally {
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
    "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy",
    "Psalms", "Proverbs", "Ecclesiastes", "Isaiah", "Jeremiah",
    "Matthew", "Mark", "Luke", "John", "Acts",
    "Romans", "Corinthians", "Galatians", "Ephesians", "Revelation"
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/educator/dashboard" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-4">
            <ArrowLeft className="h-4 w-4 mr-1" />
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
            <div className={`flex items-center ${step >= 1 ? "text-blue-600" : "text-gray-400"}`}>
              <div className={`rounded-full h-8 w-8 flex items-center justify-center border-2 text-sm ${
                step >= 1 ? "border-blue-600 bg-blue-600 text-white" : "border-gray-300"
              }`}>
                1
              </div>
              <span className="ml-2 text-sm font-medium">Basic Info</span>
            </div>
            <div className={`flex-1 h-0.5 mx-3 ${step >= 2 ? "bg-blue-600" : "bg-gray-300"}`} />
            <div className={`flex items-center ${step >= 2 ? "text-blue-600" : "text-gray-400"}`}>
              <div className={`rounded-full h-8 w-8 flex items-center justify-center border-2 text-sm ${
                step >= 2 ? "border-blue-600 bg-blue-600 text-white" : "border-gray-300"
              }`}>
                2
              </div>
              <span className="ml-2 text-sm font-medium">Documents</span>
            </div>
            <div className={`flex-1 h-0.5 mx-3 ${step >= 3 ? "bg-blue-600" : "bg-gray-300"}`} />
            <div className={`flex items-center ${step >= 3 ? "text-blue-600" : "text-gray-400"}`}>
              <div className={`rounded-full h-8 w-8 flex items-center justify-center border-2 text-sm ${
                step >= 3 ? "border-blue-600 bg-blue-600 text-white" : "border-gray-300"
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
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Quiz Title
                </label>
                <input
                  type="text"
                  value={config.title}
                  onChange={(e) => setConfig({ ...config, title: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Old Testament History Quiz"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Description
                </label>
                <textarea
                  value={config.description}
                  onChange={(e) => setConfig({ ...config, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Describe the quiz content and objectives..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Start Time
                  </label>
                  <input
                    type="datetime-local"
                    value={config.startTime}
                    onChange={(e) => setConfig({ ...config, startTime: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Duration (minutes)
                  </label>
                  <input
                    type="number"
                    value={config.duration || ""}
                    onChange={(e) => setConfig({ ...config, duration: parseInt(e.target.value) || 30 })}
                    min="5"
                    max="180"
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
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
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
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
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
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
                          <FileText className="h-6 w-6 text-blue-600 flex-shrink-0" />
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
                          <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0" />
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
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select a book...</option>
                    {biblicalBooks.map(book => (
                      <option key={book} value={book}>{book}</option>
                    ))}
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
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Overall Difficulty
                  </label>
                  <select
                    value={config.difficulty}
                    onChange={(e) => setConfig({ ...config, difficulty: e.target.value as "easy" | "intermediate" | "hard" })}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                        className="mt-1 mr-3 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
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
                    className="mr-3 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
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
              <ArrowLeft className="h-4 w-4 mr-1" />
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
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={loading || !config.title || config.documentIds.length === 0 || !selectedBook || !chapterInput || config.bloomsLevels.length === 0}
                size="sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
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