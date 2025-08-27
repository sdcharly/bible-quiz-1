import { useEffect, useRef } from "react";
import QuizDiagnostics from "@/lib/monitoring/quiz-diagnostics";

/**
 * Lightweight diagnostics hook for quiz pages
 * Minimal performance impact - only sends data on failure
 */
export function useQuizDiagnostics(attemptId?: string) {
  const diagnostics = useRef<QuizDiagnostics | null>(null);
  
  useEffect(() => {
    // Only create diagnostics in browser
    if (typeof window !== "undefined") {
      diagnostics.current = new QuizDiagnostics();
    }
    
    return () => {
      // Cleanup if component unmounts without proper completion
      if (diagnostics.current && attemptId) {
        const summary = diagnostics.current.getSummary();
        
        // If quiz never fully loaded, send diagnostic
        if (!summary.questionsVisible || !summary.canSelectAnswer) {
          diagnostics.current.sendIfNeeded(attemptId, "abandoned");
        }
      }
    };
  }, [attemptId]);
  
  return {
    markPageLoaded: () => diagnostics.current?.markPageLoaded(),
    markQuizLoaded: () => diagnostics.current?.markQuizLoaded(),
    markQuestionsVisible: () => diagnostics.current?.markQuestionsVisible(),
    markCanInteract: () => diagnostics.current?.markCanInteract(),
    markActivity: () => diagnostics.current?.markActivity(),
    markTimeout: () => diagnostics.current?.markTimeout(),
    sendIfNeeded: (reason: 'timeout' | 'error' | 'abandoned') => {
      if (diagnostics.current && attemptId) {
        return diagnostics.current.sendIfNeeded(attemptId, reason);
      }
    },
    getSummary: () => diagnostics.current?.getSummary(),
  };
}

export default useQuizDiagnostics;