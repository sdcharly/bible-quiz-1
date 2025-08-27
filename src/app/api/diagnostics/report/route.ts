import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { logger } from "@/lib/logger";

// Simple table for diagnostics (minimal storage)
const createDiagnosticsTable = async () => {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS quiz_diagnostics (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        attempt_id TEXT,
        trigger TEXT,
        browser TEXT,
        os TEXT,
        device_type TEXT,
        screen_size TEXT,
        quiz_load_time INTEGER,
        questions_loaded BOOLEAN,
        answers_submitted INTEGER,
        network_failures INTEGER,
        tab_switches INTEGER,
        js_errors JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_diagnostics_attempt ON quiz_diagnostics(attempt_id);
      CREATE INDEX IF NOT EXISTS idx_diagnostics_created ON quiz_diagnostics(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_diagnostics_trigger ON quiz_diagnostics(trigger);
    `);
  } catch (error) {
    logger.error("Failed to create diagnostics table:", error);
  }
};

createDiagnosticsTable();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { attemptId, trigger, diagnostics, timestamp } = body;
    
    // Store diagnostics
    await db.execute(sql`
      INSERT INTO quiz_diagnostics (
        attempt_id,
        trigger,
        browser,
        os,
        device_type,
        screen_size,
        quiz_load_time,
        questions_loaded,
        answers_submitted,
        network_failures,
        tab_switches,
        js_errors
      ) VALUES (
        ${attemptId},
        ${trigger},
        ${diagnostics.browser},
        ${diagnostics.os},
        ${diagnostics.deviceType},
        ${diagnostics.screenSize},
        ${diagnostics.quizLoadTime},
        ${diagnostics.questionsLoaded},
        ${diagnostics.answersSubmitted},
        ${diagnostics.networkFailures},
        ${diagnostics.tabSwitches},
        ${JSON.stringify(diagnostics.jsErrors)}
      )
    `);
    
    // Log critical issues
    if (diagnostics.jsErrors?.length > 0 || trigger === 'error') {
      logger.error("Quiz diagnostic error", {
        attemptId,
        trigger,
        browser: diagnostics.browser,
        errors: diagnostics.jsErrors,
      });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    // Don't return error to client - this should fail silently
    logger.error("Diagnostics save failed:", error);
    return NextResponse.json({ success: true });
  }
}