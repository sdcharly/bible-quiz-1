import { useState, useCallback } from "react";
import { SupportedLanguage } from "@/lib/translation-service";
import { logger } from "@/lib/logger";


interface TranslationState {
  isTranslating: boolean;
  isModalOpen: boolean;
  translatingQuestionId: string | null;
  error: string | null;
  success: boolean;
}

interface UseQuestionTranslationProps {
  quizId: string;
  onTranslationComplete?: () => void;
}

export function useQuestionTranslation({ 
  quizId, 
  onTranslationComplete 
}: UseQuestionTranslationProps) {
  const [state, setState] = useState<TranslationState>({
    isTranslating: false,
    isModalOpen: false,
    translatingQuestionId: null,
    error: null,
    success: false
  });

  const openTranslationModal = useCallback((questionId: string) => {
    setState(prev => ({
      ...prev,
      isModalOpen: true,
      translatingQuestionId: questionId,
      error: null,
      success: false
    }));
  }, []);

  const closeTranslationModal = useCallback(() => {
    setState(prev => ({
      ...prev,
      isModalOpen: false,
      translatingQuestionId: null,
      error: null
    }));
  }, []);

  const translateQuestion = useCallback(async (targetLanguage: SupportedLanguage) => {
    if (!state.translatingQuestionId) {
      throw new Error("No question selected for translation");
    }

    setState(prev => ({ ...prev, isTranslating: true, error: null }));

    try {
      const response = await fetch(
        `/api/educator/quiz/${quizId}/question/${state.translatingQuestionId}/translate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ targetLanguage }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Translation failed");
      }

      const data = await response.json();
      
      logger.log("Translation successful", {
        questionId: state.translatingQuestionId,
        language: targetLanguage
      });

      setState(prev => ({
        ...prev,
        isTranslating: false,
        success: true,
        isModalOpen: false,
        translatingQuestionId: null
      }));

      // Callback to refresh the quiz data
      if (onTranslationComplete) {
        onTranslationComplete();
      }

      // Show success message (could be a toast in the future)
      setTimeout(() => {
        setState(prev => ({ ...prev, success: false }));
      }, 3000);

      return data;
    } catch (error) {
      logger.error("Translation error:", error);
      
      setState(prev => ({
        ...prev,
        isTranslating: false,
        error: error instanceof Error ? error.message : "Translation failed"
      }));

      throw error;
    }
  }, [quizId, state.translatingQuestionId, onTranslationComplete]);

  const checkTranslationStatus = useCallback(async (questionId: string) => {
    try {
      const response = await fetch(
        `/api/educator/quiz/${quizId}/question/${questionId}/translate`,
        {
          method: "GET",
        }
      );

      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      logger.error("Failed to check translation status:", error);
      return null;
    }
  }, [quizId]);

  return {
    // State
    isTranslating: state.isTranslating,
    isModalOpen: state.isModalOpen,
    translatingQuestionId: state.translatingQuestionId,
    error: state.error,
    success: state.success,
    
    // Actions
    openTranslationModal,
    closeTranslationModal,
    translateQuestion,
    checkTranslationStatus
  };
}