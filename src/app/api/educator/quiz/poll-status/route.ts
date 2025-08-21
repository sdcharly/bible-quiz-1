import { NextRequest, NextResponse } from "next/server";
import { jobStore } from "@/lib/quiz-generation-jobs";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function GET(req: NextRequest) {
  try {
    // Get session
    const session = await auth.api.getSession({
      headers: await headers()
    });

    // Require authenticated educator
    if (!session?.user || (session.user.role !== 'educator' && session.user.role !== 'pending_educator')) {
      return NextResponse.json(
        { error: "Unauthorized - Educator access required" },
        { status: 401 }
      );
    }

    // Get jobId from query params
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json(
        { error: "Job ID is required" },
        { status: 400 }
      );
    }

    // Get job status
    const job = jobStore.get(jobId);

    if (!job) {
      return NextResponse.json(
        { error: "Job not found or expired" },
        { status: 404 }
      );
    }

    // Return job status (without sensitive webhook payload)
    return NextResponse.json({
      jobId: job.jobId,
      quizId: job.quizId,
      status: job.status,
      progress: job.progress,
      message: job.message,
      error: job.error,
      questionsCount: job.questionsData?.length || 0,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt
    });

  } catch (error) {
    console.error("Error polling job status:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get job status" },
      { status: 500 }
    );
  }
}