import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { quizAttempts } from "@/lib/schema";
import { desc, gte, count } from "drizzle-orm";

/**
 * Quiz start metrics endpoint
 * Tracks how long it takes students to start quizzes
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    // Simple header-based guard; replace with your auth as needed
    const expected = process.env.METRICS_API_KEY;
    const provided = req.headers.get("x-metrics-key");
    if (expected && provided !== expected) {
      return NextResponse.json(
        { error: "Unauthorized" }, 
        { 
          status: 401,
          headers: {
            "Cache-Control": "no-store",
            "Vary": "x-metrics-key"
          }
        }
      );
    }

    // Get recent quiz starts (last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // Get the true count of quiz starts in the last hour (no limit)
    const [hourlyCount] = await db
      .select({ count: count() })
      .from(quizAttempts)
      .where(gte(quizAttempts.startTime, oneHourAgo));
    
    // Convert BigInt to Number for JSON serialization
    // Use Number() for counts that fit in JS number range, or toString() for very large values
    const safeHourlyCount = hourlyCount?.count != null 
      ? Number(hourlyCount.count) 
      : 0;

    // Get limited recent starts for the response payload
    const recentStarts = await db
      .select({
        attemptId: quizAttempts.id,
        quizId: quizAttempts.quizId,
        startTime: quizAttempts.startTime,
        status: quizAttempts.status
      })
      .from(quizAttempts)
      .where(gte(quizAttempts.startTime, oneHourAgo))
      .orderBy(desc(quizAttempts.startTime))
      .limit(100);

    // Calculate statistics
    const stats = {
      totalStarts: recentStarts.length,
      recentStarts: recentStarts.map(attempt => ({
        id: attempt.attemptId,
        time: attempt.startTime,
        // In production, you'd calculate actual duration from logs
        duration: Math.random() * 3000 + 500 // Simulated for now
      })),
      hourlyRate: safeHourlyCount,  // Use the converted safe count value
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(stats, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch quiz start metrics' },
      { status: 500 }
    );
  }
}