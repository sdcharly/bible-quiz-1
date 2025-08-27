import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { logger } from "@/lib/logger";

// Create simple diagnostics table (one-time)
const initTable = async () => {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS quiz_diagnostics_lite (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        attempt_id TEXT,
        reason TEXT,
        browser TEXT,
        device TEXT,
        screen_size TEXT,
        
        -- Checkpoints
        page_loaded BOOLEAN DEFAULT FALSE,
        quiz_loaded BOOLEAN DEFAULT FALSE,
        questions_visible BOOLEAN DEFAULT FALSE,
        can_select_answer BOOLEAN DEFAULT FALSE,
        
        -- Error counts
        js_errors INTEGER DEFAULT 0,
        network_errors INTEGER DEFAULT 0,
        timeouts INTEGER DEFAULT 0,
        tab_switches INTEGER DEFAULT 0,
        
        -- Timing
        load_time INTEGER,
        first_interaction_time INTEGER,
        
        created_at TIMESTAMP DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_diagnostics_lite_attempt ON quiz_diagnostics_lite(attempt_id);
      CREATE INDEX IF NOT EXISTS idx_diagnostics_lite_reason ON quiz_diagnostics_lite(reason);
      CREATE INDEX IF NOT EXISTS idx_diagnostics_lite_browser ON quiz_diagnostics_lite(browser);
    `);
  } catch (error) {
    // Table might already exist
    logger.debug("Diagnostics table init:", error);
  }
};

initTable();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Store diagnostic
    await db.execute(sql`
      INSERT INTO quiz_diagnostics_lite (
        attempt_id,
        reason,
        browser,
        device,
        screen_size,
        page_loaded,
        quiz_loaded,
        questions_visible,
        can_select_answer,
        js_errors,
        network_errors,
        timeouts,
        tab_switches,
        load_time,
        first_interaction_time
      ) VALUES (
        ${body.attemptId || null},
        ${body.reason || 'unknown'},
        ${body.browser || 'unknown'},
        ${body.device || 'unknown'},
        ${body.screenSize || 'unknown'},
        ${body.pageLoaded || false},
        ${body.quizLoaded || false},
        ${body.questionsVisible || false},
        ${body.canSelectAnswer || false},
        ${body.jsErrors || 0},
        ${body.networkErrors || 0},
        ${body.timeouts || 0},
        ${body.tabSwitches || 0},
        ${body.loadTime || null},
        ${body.firstInteractionTime || null}
      )
    `);
    
    // Log if it's a critical failure
    if (body.jsErrors > 0 || body.reason === 'error') {
      logger.error("Quiz diagnostic failure", {
        attemptId: body.attemptId,
        browser: body.browser,
        device: body.device,
        errors: body.jsErrors,
      });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    // Fail silently - don't impact user
    logger.debug("Diagnostic save error:", error);
    return NextResponse.json({ success: true });
  }
}