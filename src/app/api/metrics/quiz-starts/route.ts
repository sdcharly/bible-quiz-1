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
    
    // Check if API key is properly configured
    if (!expected) {
      return NextResponse.json(
        { error: "Server configuration error: API key not configured" },
        {
          status: 500,
          headers: {
            "Cache-Control": "no-store",
            "Vary": "x-metrics-key"
          }
        }
      );
    }
    
    // Validate the provided API key
    const provided = req.headers.get("x-metrics-key");
    if (provided !== expected) {
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
    
    // Convert BigInt to Number for JSON serialization with precision safety check
    let safeHourlyCount = 0;
    
    if (hourlyCount?.count != null) {
      if (typeof hourlyCount.count === 'bigint') {
        // Check if BigInt value is within safe integer range
        if (hourlyCount.count <= BigInt(Number.MAX_SAFE_INTEGER)) {
          safeHourlyCount = Number(hourlyCount.count);
        } else {
          // Clamp to MAX_SAFE_INTEGER if value exceeds safe range
          console.warn(`Quiz start count ${hourlyCount.count} exceeds MAX_SAFE_INTEGER, clamping to ${Number.MAX_SAFE_INTEGER}`);
          safeHourlyCount = Number.MAX_SAFE_INTEGER;
        }
      } else {
        // Handle regular number type
        safeHourlyCount = Number(hourlyCount.count);
      }
    }

    // Get limited recent starts for the response payload
    const recentStarts = await db
      .select({
        attemptId: quizAttempts.id,
        quizId: quizAttempts.quizId,
        startTime: quizAttempts.startTime,
        endTime: quizAttempts.endTime,
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
        // Calculate actual duration from start to end time (in milliseconds)
        // TODO: Track time from page load to actual quiz start for more accurate "start duration" metric
        duration: attempt.endTime && attempt.startTime
          ? attempt.endTime.getTime() - attempt.startTime.getTime()
          : null
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