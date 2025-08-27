import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { auth } from "@/lib/auth";

// Create telemetry table if it doesn't exist
const createTelemetryTable = async () => {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS telemetry_events (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id TEXT NOT NULL,
        session_id TEXT NOT NULL,
        user_id TEXT,
        event_type TEXT NOT NULL,
        quiz_id TEXT,
        attempt_id TEXT,
        timestamp BIGINT NOT NULL,
        
        -- Device Information
        user_agent TEXT,
        browser_name TEXT,
        browser_version TEXT,
        browser_engine TEXT,
        os TEXT,
        os_version TEXT,
        platform TEXT,
        device_type TEXT,
        device_vendor TEXT,
        device_model TEXT,
        
        -- Screen Information
        screen_width INTEGER,
        screen_height INTEGER,
        viewport_width INTEGER,
        viewport_height INTEGER,
        pixel_ratio REAL,
        orientation TEXT,
        
        -- Capabilities
        touch_enabled BOOLEAN,
        cookies_enabled BOOLEAN,
        online_status BOOLEAN,
        
        -- Network
        connection_type TEXT,
        effective_type TEXT,
        downlink REAL,
        rtt INTEGER,
        
        -- Location
        timezone TEXT,
        timezone_offset INTEGER,
        locale TEXT,
        
        -- Metadata and Error Info
        metadata JSONB,
        error_info JSONB,
        performance_metrics JSONB,
        features JSONB,
        
        -- Indexes for querying
        created_at TIMESTAMP DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_telemetry_session ON telemetry_events(session_id);
      CREATE INDEX IF NOT EXISTS idx_telemetry_user ON telemetry_events(user_id);
      CREATE INDEX IF NOT EXISTS idx_telemetry_quiz ON telemetry_events(quiz_id);
      CREATE INDEX IF NOT EXISTS idx_telemetry_attempt ON telemetry_events(attempt_id);
      CREATE INDEX IF NOT EXISTS idx_telemetry_type ON telemetry_events(event_type);
      CREATE INDEX IF NOT EXISTS idx_telemetry_timestamp ON telemetry_events(timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_telemetry_created ON telemetry_events(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_telemetry_browser ON telemetry_events(browser_name, browser_version);
      CREATE INDEX IF NOT EXISTS idx_telemetry_device ON telemetry_events(device_type, device_vendor);
    `);
    
    logger.info("Telemetry table created/verified");
  } catch (error) {
    logger.error("Failed to create telemetry table:", error);
  }
};

// Initialize table on first load
createTelemetryTable();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { events, sessionId } = body;
    
    // Get user session if available
    let userId: string | null = null;
    try {
      const session = await auth.api.getSession({
        headers: request.headers,
      });
      userId = session?.user?.id || null;
    } catch {
      // User might not be logged in
    }
    
    // Process each event
    for (const event of events) {
      try {
        const deviceInfo = event.deviceInfo || {};
        const features = deviceInfo.features || {};
        
        // Insert telemetry event
        await db.execute(sql`
          INSERT INTO telemetry_events (
            event_id,
            session_id,
            user_id,
            event_type,
            quiz_id,
            attempt_id,
            timestamp,
            
            -- Device Info
            user_agent,
            browser_name,
            browser_version,
            browser_engine,
            os,
            os_version,
            platform,
            device_type,
            device_vendor,
            device_model,
            
            -- Screen Info
            screen_width,
            screen_height,
            viewport_width,
            viewport_height,
            pixel_ratio,
            orientation,
            
            -- Capabilities
            touch_enabled,
            cookies_enabled,
            online_status,
            
            -- Network
            connection_type,
            effective_type,
            downlink,
            rtt,
            
            -- Location
            timezone,
            timezone_offset,
            locale,
            
            -- JSON Data
            metadata,
            error_info,
            performance_metrics,
            features
          ) VALUES (
            ${event.eventId},
            ${sessionId},
            ${userId},
            ${event.eventType},
            ${event.quizId || null},
            ${event.attemptId || null},
            ${event.timestamp},
            
            -- Device Info
            ${deviceInfo.userAgent || null},
            ${deviceInfo.browserName || null},
            ${deviceInfo.browserVersion || null},
            ${deviceInfo.browserEngine || null},
            ${deviceInfo.os || null},
            ${deviceInfo.osVersion || null},
            ${deviceInfo.platform || null},
            ${deviceInfo.deviceType || null},
            ${deviceInfo.deviceVendor || null},
            ${deviceInfo.deviceModel || null},
            
            -- Screen Info
            ${deviceInfo.screenWidth || null},
            ${deviceInfo.screenHeight || null},
            ${deviceInfo.viewportWidth || null},
            ${deviceInfo.viewportHeight || null},
            ${deviceInfo.pixelRatio || null},
            ${deviceInfo.orientation || null},
            
            -- Capabilities
            ${deviceInfo.touchEnabled || false},
            ${deviceInfo.cookiesEnabled || false},
            ${deviceInfo.onlineStatus || false},
            
            -- Network
            ${deviceInfo.connectionType || null},
            ${deviceInfo.effectiveType || null},
            ${deviceInfo.downlink || null},
            ${deviceInfo.rtt || null},
            
            -- Location
            ${deviceInfo.timezone || null},
            ${deviceInfo.timezoneOffset || null},
            ${deviceInfo.locale || null},
            
            -- JSON Data
            ${JSON.stringify(event.metadata || {})},
            ${event.errorInfo ? JSON.stringify(event.errorInfo) : null},
            ${event.performance ? JSON.stringify(event.performance) : null},
            ${JSON.stringify(features)}
          )
        `);
      } catch (error) {
        logger.error("Failed to insert telemetry event:", error);
        logger.error("Event data:", event);
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      processed: events.length 
    });
    
  } catch (error) {
    logger.error("Telemetry API error:", error);
    return NextResponse.json(
      { error: "Failed to process telemetry" },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve telemetry data for analysis
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const quizId = searchParams.get("quizId");
    const attemptId = searchParams.get("attemptId");
    const sessionId = searchParams.get("sessionId");
    const eventType = searchParams.get("eventType");
    const limit = parseInt(searchParams.get("limit") || "100");

    let query = sql`
      SELECT * FROM telemetry_events 
      WHERE 1=1
    `;

    // Build dynamic query
    const conditions = [];
    if (quizId) conditions.push(sql`quiz_id = ${quizId}`);
    if (attemptId) conditions.push(sql`attempt_id = ${attemptId}`);
    if (sessionId) conditions.push(sql`session_id = ${sessionId}`);
    if (eventType) conditions.push(sql`event_type = ${eventType}`);

    if (conditions.length > 0) {
      query = sql`
        SELECT * FROM telemetry_events 
        WHERE ${sql.join(conditions, sql` AND `)}
        ORDER BY timestamp DESC
        LIMIT ${limit}
      `;
    } else {
      query = sql`
        SELECT * FROM telemetry_events 
        ORDER BY timestamp DESC
        LIMIT ${limit}
      `;
    }

    const result = await db.execute(query);
    
    return NextResponse.json({
      events: result,
      count: result.length,
    });
    
  } catch (error) {
    logger.error("Failed to fetch telemetry:", error);
    return NextResponse.json(
      { error: "Failed to fetch telemetry" },
      { status: 500 }
    );
  }
}