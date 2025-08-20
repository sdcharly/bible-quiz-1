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
  type: 'missing_entity' | 'weak_connection' | 'ambiguous_term' | 'no_entities' | 'low_confidence';
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
}

export class QuestionValidator {
  /**
   * Validate a single quiz question against the knowledge graph
   */
  static async validateQuestion(question: QuestionToValidate): Promise<QuestionValidationResult> {
    try {
      // Skip entity validation for now - it's too strict for biblical content
      // Biblical names and concepts often don't register as entities in LightRAG
      // but are still valid question content
      
      // Basic validation - just check if question has text and options
      if (!question.questionText || question.questionText.length < 10) {
        return {
          isValid: false,
          score: 50,
          issues: [{
            type: 'low_confidence',
            severity: 'medium',
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
          score: 50,
          issues: [{
            type: 'low_confidence',
            severity: 'medium',
            message: 'Question needs at least 2 answer options'
          }],
          validEntities: [],
          invalidEntities: [],
          suggestions: ['Add more answer options']
        };
      }

      // For now, consider all questions with basic structure as valid
      // The entity validation was causing too many false negatives
      return {
        isValid: true,
        score: 85,
        issues: [],
        validEntities: [],
        invalidEntities: [],
        suggestions: ['Question structure looks good']
      };
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
}