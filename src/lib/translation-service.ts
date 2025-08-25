import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { logger } from "@/lib/logger";

export interface TranslationRequest {
  questionText: string;
  options: string[];
  explanation?: string | null;
  targetLanguage: SupportedLanguage;
  context?: {
    book?: string | null;
    chapter?: string | null;
    topic?: string | null;
  };
}

export interface TranslatedContent {
  questionText: string;
  options: string[];
  explanation: string | null;
  language: string;
  translatedAt: Date;
}

export type SupportedLanguage = 'ml' | 'ta' | 'hi' | 'fr' | 'es';

export const SUPPORTED_LANGUAGES = {
  'ml': { 
    name: 'Malayalam', 
    code: 'ml', 
    nativeName: 'മലയാളം',
    direction: 'ltr' 
  },
  'ta': { 
    name: 'Tamil', 
    code: 'ta', 
    nativeName: 'தமிழ்',
    direction: 'ltr' 
  },
  'hi': { 
    name: 'Hindi', 
    code: 'hi', 
    nativeName: 'हिन्दी',
    direction: 'ltr' 
  },
  'fr': { 
    name: 'French', 
    code: 'fr', 
    nativeName: 'Français',
    direction: 'ltr' 
  },
  'es': { 
    name: 'Spanish', 
    code: 'es', 
    nativeName: 'Español',
    direction: 'ltr' 
  }
} as const;

export class QuestionTranslationService {
  private model: string;

  constructor(model: string = "gpt-4o") {
    this.model = model;
  }

  async translateQuestion(request: TranslationRequest): Promise<TranslatedContent> {
    try {
      const targetLanguage = SUPPORTED_LANGUAGES[request.targetLanguage];
      if (!targetLanguage) {
        throw new Error(`Unsupported language: ${request.targetLanguage}`);
      }

      // Build context-aware prompt
      const prompt = this.buildTranslationPrompt(request, targetLanguage);

      // Call OpenAI for translation
      const response = await generateText({
        model: openai(this.model),
        prompt,
        temperature: 0.3, // Lower temperature for consistency
        maxRetries: 2,
      });

      // Parse the response
      const translatedContent = this.parseTranslationResponse(
        response.text,
        request.targetLanguage
      );

      logger.log("Translation completed successfully", {
        language: targetLanguage.name,
        questionLength: translatedContent.questionText.length
      });

      return translatedContent;
    } catch (error) {
      logger.error("Translation failed:", error);
      throw new Error(`Translation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private buildTranslationPrompt(
    request: TranslationRequest,
    targetLanguage: typeof SUPPORTED_LANGUAGES[SupportedLanguage]
  ): string {
    const contextInfo = request.context
      ? `\nBiblical Context:
        ${request.context.book ? `Book: ${request.context.book}` : ''}
        ${request.context.chapter ? `Chapter: ${request.context.chapter}` : ''}
        ${request.context.topic ? `Topic: ${request.context.topic}` : ''}`
      : '';

    return `You are an expert translator specializing in biblical and religious content. 
Translate the following quiz question from English to ${targetLanguage.name} (${targetLanguage.nativeName}).

IMPORTANT GUIDELINES:
1. Maintain theological accuracy and biblical terminology
2. Preserve the educational intent and clarity
3. Keep proper nouns (like biblical names) in their commonly used form in ${targetLanguage.name}
4. Ensure the question remains clear and unambiguous
5. Maintain the same level of difficulty
6. If there's an explanation, ensure it flows naturally in ${targetLanguage.name}
7. DO NOT include any HTML tags, markdown formatting, or special characters
8. Translate ONLY the text content, no formatting or artifacts
9. Ensure proper Unicode characters for the target language
10. Do not add any emojis or decorative characters
${contextInfo}

CONTENT TO TRANSLATE:
Question: ${request.questionText}

Options:
${request.options.map((opt, i) => `${i + 1}. ${opt}`).join('\n')}

${request.explanation ? `Explanation: ${request.explanation}` : ''}

REQUIRED OUTPUT FORMAT (JSON):
Return ONLY a valid JSON object with this exact structure:
{
  "questionText": "translated question text without any formatting",
  "options": ["option1 text only", "option2 text only", "option3 text only", "option4 text only"],
  "explanation": "translated explanation text only or null if not provided"
}

CRITICAL:
- Return ONLY plain text in each field
- NO HTML tags or entities (no <br>, &nbsp;, etc.)
- NO markdown formatting (no **, __, etc.)
- NO special formatting characters
- Ensure the JSON is valid and properly escaped
- Do not include any text outside the JSON object`;
  }

  private parseTranslationResponse(
    responseText: string,
    language: SupportedLanguage
  ): TranslatedContent {
    try {
      // Clean the response text to extract JSON
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No valid JSON found in response");
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate the response structure
      if (!parsed.questionText || !Array.isArray(parsed.options)) {
        throw new Error("Invalid translation response structure");
      }

      // Ensure we have exactly 4 options (pad or trim if necessary)
      const options = parsed.options.slice(0, 4);
      while (options.length < 4) {
        options.push(""); // This shouldn't happen with proper translation
      }

      return {
        questionText: parsed.questionText,
        options: options,
        explanation: parsed.explanation || null,
        language: language,
        translatedAt: new Date()
      };
    } catch (error) {
      logger.error("Failed to parse translation response:", error);
      logger.error("Raw response:", responseText);
      throw new Error("Failed to parse translation response");
    }
  }

  // Method to validate if translation is needed
  static needsTranslation(currentLanguage?: string | null): boolean {
    return !currentLanguage || currentLanguage === 'en';
  }

  // Method to detect if content is already translated
  static async detectLanguage(text: string): Promise<string> {
    // Simple heuristic - check for non-Latin scripts
    const hasDevanagari = /[\u0900-\u097F]/.test(text); // Hindi
    const hasTamil = /[\u0B80-\u0BFF]/.test(text); // Tamil
    const hasMalayalam = /[\u0D00-\u0D7F]/.test(text); // Malayalam
    
    if (hasDevanagari) return 'hi';
    if (hasTamil) return 'ta';
    if (hasMalayalam) return 'ml';
    
    // For Latin scripts, would need more sophisticated detection
    return 'en';
  }
}

// Export a singleton instance
export const translationService = new QuestionTranslationService(
  process.env.OPENAI_MODEL || "gpt-4o"
);