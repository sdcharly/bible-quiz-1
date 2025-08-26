import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { QuestionValidator, QuestionToValidate } from "@/lib/question-validator";
import { auth } from "@/lib/auth";


export async function POST(req: NextRequest) {
  try {
    // Get session
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { questions, single = false } = body;

    if (!questions || (!Array.isArray(questions) && !single)) {
      return NextResponse.json(
        { error: "Questions array is required" },
        { status: 400 }
      );
    }

    let validationResults;

    if (single && !Array.isArray(questions)) {
      // Validate single question
      const question = questions as QuestionToValidate;
      const result = await QuestionValidator.validateQuestion(question);
      
      return NextResponse.json({
        success: true,
        validation: result,
        suggestions: QuestionValidator.generateImprovementSuggestions(question, result)
      });
    } else {
      // Validate multiple questions
      const questionsArray = questions as QuestionToValidate[];
      validationResults = await QuestionValidator.validateQuestions(questionsArray);
      const summary = QuestionValidator.getValidationSummary(validationResults);

      return NextResponse.json({
        success: true,
        validations: validationResults,
        summary,
        suggestions: Object.entries(validationResults).reduce((acc, [questionId, result]) => {
          const question = questionsArray.find(q => q.id === questionId);
          if (question) {
            acc[questionId] = QuestionValidator.generateImprovementSuggestions(question, result);
          }
          return acc;
        }, {} as Record<string, string[]>)
      });
    }

  } catch (error) {
    // [REMOVED: Console statement for performance]
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : "Failed to validate questions" 
      },
      { status: 500 }
    );
  }
}