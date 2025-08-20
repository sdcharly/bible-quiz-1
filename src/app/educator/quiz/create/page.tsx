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
  });

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

  const bloomsOptions = [
    { value: "knowledge", label: "Knowledge" },
    { value: "comprehension", label: "Comprehension" },
    { value: "application", label: "Application" },
    { value: "analysis", label: "Analysis" },
    { value: "synthesis", label: "Synthesis" },
    { value: "evaluation", label: "Evaluation" },
  ];

  const biblicalBooks = [
    "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy",
    "Psalms", "Proverbs", "Ecclesiastes", "Isaiah", "Jeremiah",
    "Matthew", "Mark", "Luke", "John", "Acts",
    "Romans", "Corinthians", "Galatians", "Ephesians", "Revelation"
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-6">
            <Link href="/educator/dashboard">
              <Button variant="ghost" size="sm" className="mr-4">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Create New Quiz
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Configure and generate a biblical study quiz
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className={`flex items-center ${step >= 1 ? "text-blue-600" : "text-gray-400"}`}>
              <div className={`rounded-full h-10 w-10 flex items-center justify-center border-2 ${
                step >= 1 ? "border-blue-600 bg-blue-600 text-white" : "border-gray-300"
              }`}>
                1
              </div>
              <span className="ml-2 font-medium">Basic Info</span>
            </div>
            <div className={`flex-1 h-1 mx-4 ${step >= 2 ? "bg-blue-600" : "bg-gray-300"}`} />
            <div className={`flex items-center ${step >= 2 ? "text-blue-600" : "text-gray-400"}`}>
              <div className={`rounded-full h-10 w-10 flex items-center justify-center border-2 ${
                step >= 2 ? "border-blue-600 bg-blue-600 text-white" : "border-gray-300"
              }`}>
                2
              </div>
              <span className="ml-2 font-medium">Documents</span>
            </div>
            <div className={`flex-1 h-1 mx-4 ${step >= 3 ? "bg-blue-600" : "bg-gray-300"}`} />
            <div className={`flex items-center ${step >= 3 ? "text-blue-600" : "text-gray-400"}`}>
              <div className={`rounded-full h-10 w-10 flex items-center justify-center border-2 ${
                step >= 3 ? "border-blue-600 bg-blue-600 text-white" : "border-gray-300"
              }`}>
                3
              </div>
              <span className="ml-2 font-medium">Configuration</span>
            </div>
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Basic Information
              </h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Quiz Title
                </label>
                <input
                  type="text"
                  value={config.title}
                  onChange={(e) => setConfig({ ...config, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="e.g., Old Testament History Quiz"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={config.description}
                  onChange={(e) => setConfig({ ...config, description: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Describe the quiz content and objectives..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Start Time
                  </label>
                  <input
                    type="datetime-local"
                    value={config.startTime}
                    onChange={(e) => setConfig({ ...config, startTime: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Duration (minutes)
                  </label>
                  <input
                    type="number"
                    value={config.duration}
                    onChange={(e) => setConfig({ ...config, duration: parseInt(e.target.value) })}
                    min="5"
                    max="180"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
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
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Quiz Configuration
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Number of Questions
                  </label>
                  <input
                    type="number"
                    value={config.questionCount}
                    onChange={(e) => setConfig({ ...config, questionCount: parseInt(e.target.value) })}
                    min="5"
                    max="100"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Passing Score (%)
                  </label>
                  <input
                    type="number"
                    value={config.passingScore}
                    onChange={(e) => setConfig({ ...config, passingScore: parseInt(e.target.value) })}
                    min="0"
                    max="100"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Difficulty Level
                </label>
                <select
                  value={config.difficulty}
                  onChange={(e) => setConfig({ ...config, difficulty: e.target.value as "easy" | "intermediate" | "hard" })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="easy">Easy</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="hard">Hard</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Bloom&apos;s Taxonomy Levels
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {bloomsOptions.map((option) => (
                    <label key={option.value} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={config.bloomsLevels.includes(option.value)}
                        onChange={(e) => {
                          const newLevels = e.target.checked
                            ? [...config.bloomsLevels, option.value]
                            : config.bloomsLevels.filter(l => l !== option.value);
                          setConfig({ ...config, bloomsLevels: newLevels });
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {option.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Biblical Books (Optional)
                </label>
                <select
                  multiple
                  value={config.books}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions, option => option.value);
                    setConfig({ ...config, books: selected });
                  }}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  size={5}
                >
                  {biblicalBooks.map(book => (
                    <option key={book} value={book}>{book}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            <Button
              variant="outline"
              onClick={() => setStep(Math.max(1, step - 1))}
              disabled={step === 1}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            
            {step < 3 ? (
              <Button
                onClick={() => setStep(Math.min(3, step + 1))}
                disabled={
                  (step === 1 && !config.title) ||
                  (step === 2 && config.documentIds.length === 0)
                }
              >
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={loading || !config.title || config.documentIds.length === 0}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating Quiz...
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