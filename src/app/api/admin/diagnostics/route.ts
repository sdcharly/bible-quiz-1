import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get("timeRange") || "7d";
    const browser = searchParams.get("browser");
    const device = searchParams.get("device");
    const reason = searchParams.get("reason");
    
    // Calculate date range
    let dateFilter = "";
    switch (timeRange) {
      case "24h":
        dateFilter = "AND created_at > NOW() - INTERVAL '24 hours'";
        break;
      case "7d":
        dateFilter = "AND created_at > NOW() - INTERVAL '7 days'";
        break;
      case "30d":
        dateFilter = "AND created_at > NOW() - INTERVAL '30 days'";
        break;
      default:
        dateFilter = "";
    }

    // Build filters
    const filters = [];
    if (browser) filters.push(sql`browser = ${browser}`);
    if (device) filters.push(sql`device = ${device}`);
    if (reason) filters.push(sql`reason = ${reason}`);
    
    // Get diagnostic records
    const diagnosticsQuery = sql`
      SELECT 
        d.*,
        qa.quiz_id,
        qa.student_id,
        u.email as student_email,
        q.title as quiz_title
      FROM quiz_diagnostics_lite d
      LEFT JOIN quiz_attempts qa ON d.attempt_id = qa.id
      LEFT JOIN "user" u ON qa.student_id = u.id
      LEFT JOIN quizzes q ON qa.quiz_id = q.id
      WHERE 1=1
      ${sql.raw(dateFilter)}
      ${filters.length > 0 ? sql`AND ${sql.join(filters, sql` AND `)}` : sql``}
      ORDER BY d.created_at DESC
      LIMIT 100
    `;

    const diagnostics = await db.execute(diagnosticsQuery);

    // Get summary statistics
    const statsQuery = sql`
      SELECT 
        COUNT(*) as total_count,
        COUNT(DISTINCT attempt_id) as unique_attempts,
        COUNT(DISTINCT browser) as unique_browsers,
        COUNT(DISTINCT device) as unique_devices,
        AVG(js_errors) as avg_js_errors,
        AVG(network_errors) as avg_network_errors,
        AVG(tab_switches) as avg_tab_switches,
        SUM(CASE WHEN reason = 'timeout' THEN 1 ELSE 0 END) as timeouts,
        SUM(CASE WHEN reason = 'error' THEN 1 ELSE 0 END) as errors,
        SUM(CASE WHEN reason = 'abandoned' THEN 1 ELSE 0 END) as abandoned,
        SUM(CASE WHEN questions_visible = false THEN 1 ELSE 0 END) as never_saw_questions,
        SUM(CASE WHEN can_select_answer = false THEN 1 ELSE 0 END) as could_not_interact
      FROM quiz_diagnostics_lite
      WHERE 1=1
      ${sql.raw(dateFilter)}
    `;

    const stats = await db.execute(statsQuery);

    // Get browser breakdown
    const browserStatsQuery = sql`
      SELECT 
        browser,
        COUNT(*) as count,
        AVG(js_errors) as avg_errors,
        SUM(CASE WHEN reason = 'error' THEN 1 ELSE 0 END) as error_count
      FROM quiz_diagnostics_lite
      WHERE 1=1
      ${sql.raw(dateFilter)}
      GROUP BY browser
      ORDER BY count DESC
    `;

    const browserStats = await db.execute(browserStatsQuery);

    // Get device breakdown
    const deviceStatsQuery = sql`
      SELECT 
        device,
        COUNT(*) as count,
        AVG(tab_switches) as avg_tab_switches,
        SUM(CASE WHEN reason = 'timeout' THEN 1 ELSE 0 END) as timeout_count
      FROM quiz_diagnostics_lite
      WHERE 1=1
      ${sql.raw(dateFilter)}
      GROUP BY device
      ORDER BY count DESC
    `;

    const deviceStats = await db.execute(deviceStatsQuery);

    // Get recent issues
    const recentIssuesQuery = sql`
      SELECT 
        d.*,
        qa.quiz_id,
        u.email as student_email,
        q.title as quiz_title
      FROM quiz_diagnostics_lite d
      LEFT JOIN quiz_attempts qa ON d.attempt_id = qa.id
      LEFT JOIN "user" u ON qa.student_id = u.id
      LEFT JOIN quizzes q ON qa.quiz_id = q.id
      WHERE js_errors > 0 OR network_errors > 0 OR reason = 'error'
      ${sql.raw(dateFilter)}
      ORDER BY d.created_at DESC
      LIMIT 10
    `;

    const recentIssues = await db.execute(recentIssuesQuery);

    return NextResponse.json({
      diagnostics,
      stats: stats[0] || {},
      browserStats,
      deviceStats,
      recentIssues,
    });

  } catch (error) {
    logger.error("Failed to fetch diagnostics:", error);
    return NextResponse.json(
      { error: "Failed to fetch diagnostics" },
      { status: 500 }
    );
  }
}