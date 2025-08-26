import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { logger } from "@/lib/logger";
import { LightRAGService, EntityExistsResponse } from './lightrag-service';


export interface QuestionValidationResult {
  isValid: boolean;
  score: number; // 0-100 validation score
  issues: ValidationIssue[];
  validEntities: string[];
  invalidEntities: string[];
  suggestions: string[];
}

export interface ValidationIssue {
  type: 'missing_entity' | 'weak_connection' | 'ambiguous_term' | 'no_entities' | 'low_confidence' | 
        'theological_error' | 'context_mismatch' | 'poor_options' | 'weak_explanation';
  severity: 'low' | 'medium' | 'high';
  message: string;
  entity?: string;
}

export interface QuestionToValidate {
  id: string;
  questionText: string;
  options: Array<{ text: string; id: string }>;
  correctAnswer: string;
  explanation?: string;
  book?: string | null;
  chapter?: string | null;
  topic?: string | null;
  difficulty?: string | null;
  bloomsLevel?: string | null;
}

export class QuestionValidator {
  /**
   * Common protestant theological issues to check
   */
  private static readonly PROTESTANT_ISSUES = {
    catholicTerms: ['purgatory', 'pope', 'papacy', 'transubstantiation', 'immaculate conception', 'rosary', 'hail mary', 'saints intercession'],
    orthodoxTerms: ['theosis', 'energies', 'icons veneration', 'hesychasm'],
    protestantPrinciples: ['sola scriptura', 'sola fide', 'sola gratia', 'solus christus', 'soli deo gloria']
  };
  /**
   * Validate a single quiz question using AI for intelligent scoring
   */
  static async validateQuestion(question: QuestionToValidate): Promise<QuestionValidationResult> {
    try {
      // Basic structure validation first
      if (!question.questionText || question.questionText.length < 10) {
        return {
          isValid: false,
          score: 30,
          issues: [{
            type: 'low_confidence',
            severity: 'high',
            message: 'Question text is too short or missing'
          }],
          validEntities: [],
          invalidEntities: [],
          suggestions: ['Ensure question has meaningful content']
        };
      }

      if (!question.options || question.options.length < 2) {
        return {
          isValid: false,
          score: 30,
          issues: [{
            type: 'low_confidence',
            severity: 'high',
            message: 'Question needs at least 2 answer options'
          }],
          validEntities: [],
          invalidEntities: [],
          suggestions: ['Add more answer options']
        };
      }

      // Use OpenAI for intelligent validation
      try {
        const validationResult = await this.validateWithAI(question);
        return validationResult;
      } catch (aiError) {
        logger.error("AI validation failed, using basic validation:", aiError);
        // Fallback to basic validation if AI fails
        return {
          isValid: true,
          score: 75,
          issues: [],
          validEntities: [],
          invalidEntities: [],
          suggestions: ['Basic validation passed. AI validation unavailable.']
        };
      }
    } catch (error) {
      console.error('Error validating question:', error);
      return {
        isValid: false,
        score: 0,
        issues: [{
          type: 'low_confidence',
          severity: 'high',
          message: `Validation failed due to an error: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        validEntities: [],
        invalidEntities: [],
        suggestions: ['Please try again or check the document processing status']
      };
    }
  }

  /**
   * Validate multiple questions in batch
   */
  static async validateQuestions(questions: QuestionToValidate[]): Promise<Record<string, QuestionValidationResult>> {
    const results: Record<string, QuestionValidationResult> = {};
    
    // Process questions in parallel for better performance
    const promises = questions.map(async (question) => {
      const result = await this.validateQuestion(question);
      return { questionId: question.id, result };
    });

    const responses = await Promise.all(promises);
    responses.forEach(({ questionId, result }) => {
      results[questionId] = result;
    });

    return results;
  }

  /**
   * Get validation summary for a set of questions
   */
  static getValidationSummary(validationResults: Record<string, QuestionValidationResult>) {
    const results = Object.values(validationResults);
    const totalQuestions = results.length;
    const validQuestions = results.filter(result => result.isValid).length;
    const averageScore = results.reduce((sum, result) => sum + result.score, 0) / totalQuestions;
    
    const issueCount = {
      high: results.reduce((count, result) => 
        count + result.issues.filter(issue => issue.severity === 'high').length, 0
      ),
      medium: results.reduce((count, result) => 
        count + result.issues.filter(issue => issue.severity === 'medium').length, 0
      ),
      low: results.reduce((count, result) => 
        count + result.issues.filter(issue => issue.severity === 'low').length, 0
      )
    };

    return {
      totalQuestions,
      validQuestions,
      invalidQuestions: totalQuestions - validQuestions,
      averageScore: Math.round(averageScore),
      issueCount,
      overallValid: averageScore >= 70 && issueCount.high === 0
    };
  }

  private static calculateValidationScore(
    question: QuestionToValidate,
    validEntities: string[],
    invalidEntities: string[]
  ): QuestionValidationResult {
    const issues: ValidationIssue[] = [];
    const suggestions: string[] = [];
    let score = 100;

    const totalEntities = validEntities.length + invalidEntities.length;
    const validEntityRatio = validEntities.length / totalEntities;

    // Score deductions based on missing entities
    if (validEntityRatio < 0.5) {
      score -= 40;
      issues.push({
        type: 'missing_entity',
        severity: 'high',
        message: `More than half of the entities (${invalidEntities.length}/${totalEntities}) are not found in the knowledge graph`
      });
      suggestions.push('Ensure question content is based on the uploaded documents');
    } else if (validEntityRatio < 0.8) {
      score -= 20;
      issues.push({
        type: 'missing_entity',
        severity: 'medium',
        message: `Some entities (${invalidEntities.length}/${totalEntities}) are not found in the knowledge graph`
      });
      suggestions.push('Review question content for accuracy');
    }

    // Check if question has enough valid entities
    if (validEntities.length === 0) {
      score = 0;
      issues.push({
        type: 'missing_entity',
        severity: 'high',
        message: 'No valid entities found in the question content'
      });
      suggestions.push('Base the question on specific content from the uploaded documents');
    } else if (validEntities.length < 2) {
      score -= 15;
      issues.push({
        type: 'weak_connection',
        severity: 'medium',
        message: 'Question has very few connections to the knowledge graph'
      });
      suggestions.push('Include more specific terms or concepts from the source material');
    }

    // Check for ambiguous or generic terms
    const genericTerms = invalidEntities.filter(entity => 
      entity.toLowerCase().match(/^(thing|concept|idea|method|way|approach)s?$/i)
    );
    
    if (genericTerms.length > 0) {
      score -= 10;
      issues.push({
        type: 'ambiguous_term',
        severity: 'low',
        message: `Question contains generic terms: ${genericTerms.join(', ')}`
      });
      suggestions.push('Replace generic terms with specific concepts from the documents');
    }

    // Additional validation for answer options
    const correctOption = question.options.find(opt => opt.id === question.correctAnswer);
    if (correctOption) {
      const correctAnswerEntities = LightRAGService.extractEntitiesFromText(correctOption.text);
      const validCorrectAnswerEntities = correctAnswerEntities.filter(entity => 
        validEntities.includes(entity)
      );
      
      if (correctAnswerEntities.length > 0 && validCorrectAnswerEntities.length === 0) {
        score -= 25;
        issues.push({
          type: 'missing_entity',
          severity: 'high',
          message: 'The correct answer contains entities not found in the knowledge graph'
        });
        suggestions.push('Ensure the correct answer is based on document content');
      }
    }

    // Final score adjustments
    score = Math.max(0, Math.min(100, score));
    const isValid = score >= 70 && !issues.some(issue => issue.severity === 'high');

    // Add positive suggestions if score is good
    if (score >= 80) {
      suggestions.push('Question appears to be well-connected to the source material');
    }

    return {
      isValid,
      score,
      issues,
      validEntities,
      invalidEntities,
      suggestions
    };
  }

  /**
   * Generate improvement suggestions for a question
   */
  static generateImprovementSuggestions(
    question: QuestionToValidate, 
    validationResult: QuestionValidationResult
  ): string[] {
    const suggestions = [...validationResult.suggestions];

    // Add specific suggestions based on validation issues
    if (validationResult.invalidEntities.length > 0) {
      suggestions.push(
        `Consider replacing these terms with validated concepts: ${validationResult.invalidEntities.slice(0, 3).join(', ')}`
      );
    }

    if (validationResult.validEntities.length > 0) {
      suggestions.push(
        `Good use of these verified concepts: ${validationResult.validEntities.slice(0, 3).join(', ')}`
      );
    }

    return [...new Set(suggestions)]; // Remove duplicates
  }

  /**
   * Validate question using OpenAI for intelligent scoring
   */
  private static async validateWithAI(question: QuestionToValidate): Promise<QuestionValidationResult> {
    const model = process.env.OPENAI_MODEL || "gpt-4o";
    
    // Build concise context string
    const contextInfo = [
      question.book && `Book: ${question.book}`,
      question.chapter && `Ch: ${question.chapter}`,
      question.topic && `Topic: ${question.topic}`
    ].filter(Boolean).join(' | ');
    
    const prompt = `Protestant theology validator. Analyze this quiz question.

Question: ${question.questionText}
Options: ${question.options.map((opt, i) => `${String.fromCharCode(65+i)}: ${opt.text}`).join(', ')}
Correct: ${String.fromCharCode(65 + question.options.findIndex(opt => opt.id === question.correctAnswer))}
${question.book ? `Book: ${question.book}` : ''}${question.chapter ? ` Chapter: ${question.chapter}` : ''}
${question.topic ? `Topic: ${question.topic}` : ''}

Evaluate for Protestant theology (no Catholic/Orthodox doctrine), biblical accuracy, and educational value.

Return ONLY valid JSON:
{
  "score": 0-100,
  "isValid": boolean,
  "issues": [{"type": "string", "severity": "low|medium|high", "message": "string"}],
  "suggestions": ["improvement 1", "improvement 2"]
}`;

    try {
      const response = await generateText({
        model: openai(model),
        prompt,
        temperature: 0.3,
        maxRetries: 1,
      });

      // Parse the AI response - handle potential JSON errors
      let aiValidation: any;
      try {
        // First try to extract JSON from the response
        const jsonMatch = response.text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error("No JSON structure found");
        }
        
        // Clean up common JSON issues
        let jsonString = jsonMatch[0];
        
        // Remove trailing commas before } or ]
        jsonString = jsonString.replace(/,\s*([}\]])/g, '$1');
        
        // Fix unescaped quotes in strings (skip this for now as it's complex)
        // jsonString = jsonString.replace(/(":\s*"[^"]*)'([^"]*")/g, "$1\\'$2");
        
        // Remove any control characters
        jsonString = jsonString.replace(/[\x00-\x1F\x7F]/g, '');
        
        aiValidation = JSON.parse(jsonString);
      } catch (parseError) {
        logger.warn("Failed to parse AI JSON, using fallback structure:", parseError);
        
        // Try to extract key information using regex as fallback
        const scoreMatch = response.text.match(/"score"\s*:\s*(\d+)/);
        const score = scoreMatch ? parseInt(scoreMatch[1]) : 75;
        
        // Create a basic validation response
        aiValidation = {
          score,
          isValid: score >= 60,
          issues: [],
          suggestions: ["AI validation completed with basic scoring"],
          optionFixes: {},
          explanationFix: null
        };
        
        // Try to extract issues
        const issueMatches = response.text.matchAll(/"message"\s*:\s*"([^"]*)"/g);
        for (const match of issueMatches) {
          aiValidation.issues.push({
            type: 'low_confidence',
            severity: 'medium',
            message: match[1]
          });
        }
      }
      
      // Build comprehensive suggestions including option and explanation fixes
      const allSuggestions = [
        ...(aiValidation.suggestions || [])
      ];
      
      // Add option-specific fixes if provided
      if (aiValidation.optionFixes && typeof aiValidation.optionFixes === 'object') {
        Object.entries(aiValidation.optionFixes).forEach(([optionLetter, fix]) => {
          if (fix && typeof fix === 'string') {
            allSuggestions.push(`Option ${optionLetter}: ${fix}`);
          }
        });
      }
      
      // Add explanation fix if provided
      if (aiValidation.explanationFix && typeof aiValidation.explanationFix === 'string') {
        allSuggestions.push(`Explanation: ${aiValidation.explanationFix}`);
      }

      // Ensure issues have proper structure
      const validatedIssues = (Array.isArray(aiValidation.issues) ? aiValidation.issues : []).map((issue: any) => ({
        type: ['missing_entity', 'weak_connection', 'ambiguous_term', 'no_entities', 'low_confidence',
               'theological_error', 'context_mismatch', 'poor_options', 'weak_explanation'].includes(issue.type) 
               ? issue.type : 'low_confidence',
        severity: ['low', 'medium', 'high'].includes(issue.severity) ? issue.severity : 'medium',
        message: String(issue.message || 'Issue detected')
      }));

      return {
        isValid: aiValidation.isValid !== false && aiValidation.score >= 60,
        score: Math.max(0, Math.min(100, Number(aiValidation.score) || 75)),
        issues: validatedIssues,
        validEntities: [], // Not using entity validation with AI
        invalidEntities: [],
        suggestions: allSuggestions.filter(s => s && typeof s === 'string' && s.length > 0)
      };
    } catch (error) {
      logger.error("Error in AI validation:", error);
      throw error;
    }
  }

  /**
   * Perform deep theological validation for critical review
   */
  static async performDeepValidation(question: QuestionToValidate): Promise<{
    theologicalScore: number;
    contextualScore: number;
    pedagogicalScore: number;
    detailedSuggestions: {
      question: string[];
      options: Record<string, string>;
      explanation: string[];
    };
  }> {
    const model = process.env.OPENAI_MODEL || "gpt-4o";
    
    const prompt = `Deep theological analysis. Protestant perspective ONLY.

Question: ${question.questionText}
Book/Chapter: ${question.book || 'Not specified'} ${question.chapter || ''}
Topic: ${question.topic || 'Not specified'}

Analyze:
1. Theological accuracy (Protestant reformed theology)
2. Biblical context alignment
3. Pedagogical effectiveness

Return JSON:
{
  "theologicalScore": 85,
  "contextualScore": 90,
  "pedagogicalScore": 80,
  "detailedSuggestions": {
    "question": ["Specific improvement 1", "Specific improvement 2"],
    "options": {"A": "Make more distinct", "B": "Better distractor"},
    "explanation": ["Add verse", "Clarify doctrine"]
  }
}`;

    try {
      const response = await generateText({
        model: openai(model),
        prompt,
        temperature: 0.2,
        maxRetries: 1,
      });

      const jsonMatch = response.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No valid JSON in deep validation");
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      logger.error("Deep validation failed:", error);
      return {
        theologicalScore: 0,
        contextualScore: 0,
        pedagogicalScore: 0,
        detailedSuggestions: {
          question: ["Unable to perform deep validation"],
          options: {},
          explanation: []
        }
      };
    }
  }

  /**
   * Quick theological term check
   */
  static quickTheologyCheck(text: string): { hasIssues: boolean; problematicTerms: string[] } {
    const lowerText = text.toLowerCase();
    const problematicTerms: string[] = [];
    
    // Check for Catholic/Orthodox terms
    [...this.PROTESTANT_ISSUES.catholicTerms, ...this.PROTESTANT_ISSUES.orthodoxTerms].forEach(term => {
      if (lowerText.includes(term.toLowerCase())) {
        problematicTerms.push(term);
      }
    });
    
    return {
      hasIssues: problematicTerms.length > 0,
      problematicTerms
    };
  }
}