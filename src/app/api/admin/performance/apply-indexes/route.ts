import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import { pgClient } from "@/lib/db";
import { logger } from "@/lib/logger";
import { getAdminSession } from "@/lib/admin-auth";


export async function POST(_req: NextRequest) {
  try {
    // Verify admin authentication
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    logger.log("Admin requested performance index application");

    // Read the SQL file
    const indexesSQL = readFileSync(
      join(process.cwd(), "migrations", "0011_add_performance_indexes.sql"),
      "utf-8"
    );

    // Split SQL into individual statements
    const statements: string[] = [];
    let currentStatement = "";
    
    indexesSQL.split("\n").forEach(line => {
      // Skip comment-only lines
      if (line.trim().startsWith("--") && !currentStatement) {
        return;
      }
      
      currentStatement += line + "\n";
      
      // If line ends with semicolon, we have a complete statement
      if (line.trim().endsWith(";")) {
        statements.push(currentStatement.trim());
        currentStatement = "";
      }
    });
    
    // Add any remaining statement
    if (currentStatement.trim()) {
      statements.push(currentStatement.trim());
    }

    const results = {
      totalIndexes: statements.filter(s => s.includes("CREATE INDEX")).length,
      created: 0,
      skipped: 0,
      failed: 0,
      analyzed: 0,
      details: [] as Array<{
        type: string;
        name: string;
        status: "created" | "exists" | "failed" | "analyzed";
        message?: string;
      }>
    };

    // Apply each statement
    for (const statement of statements) {
      if (statement.includes("CREATE INDEX")) {
        const indexName = statement.match(/CREATE INDEX IF NOT EXISTS (\w+)/)?.[1];
        if (!indexName) continue;

        try {
          await pgClient.unsafe(statement);
          results.created++;
          results.details.push({
            type: "index",
            name: indexName,
            status: "created",
            message: "Index created successfully"
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          if (errorMessage.includes("already exists")) {
            results.skipped++;
            results.details.push({
              type: "index",
              name: indexName,
              status: "exists",
              message: "Index already exists"
            });
          } else {
            results.failed++;
            results.details.push({
              type: "index",
              name: indexName,
              status: "failed",
              message: errorMessage
            });
            logger.error(`Failed to create index ${indexName}:`, error);
          }
        }
      } else if (statement.includes("ANALYZE")) {
        // Extract table name
        const tableName = statement.match(/ANALYZE\s+["']?(\w+)["']?/)?.[1] || 
                         statement.match(/ANALYZE\s+"([^"]+)"/)?.[1];
        
        if (tableName) {
          try {
            await pgClient.unsafe(statement);
            results.analyzed++;
            results.details.push({
              type: "analyze",
              name: tableName,
              status: "analyzed",
              message: "Table statistics updated"
            });
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            results.details.push({
              type: "analyze",
              name: tableName,
              status: "failed",
              message: errorMessage
            });
            logger.warn(`Could not analyze table ${tableName}:`, errorMessage);
          }
        }
      }
    }

    // Get current index statistics
    let indexStats: Array<{
    tablename: string;
    indexname: string;
    indexdef: string;
  }> = [];
    try {
      indexStats = await pgClient`
        SELECT 
          tablename,
          indexname,
          indexdef
        FROM pg_indexes
        WHERE schemaname = 'public'
        ORDER BY tablename, indexname
      `;
    } catch (error) {
      logger.error("Could not fetch index statistics:", error);
    }

    // Get table statistics
    let tableStats: Array<{
    tablename: string;
    size: string;
    estimated_rows: number;
  }> = [];
    try {
      tableStats = await pgClient`
        SELECT 
          relname as tablename,
          pg_size_pretty(pg_total_relation_size(oid)) as size,
          reltuples::bigint as estimated_rows
        FROM pg_class
        WHERE relkind = 'r'
          AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
        ORDER BY pg_total_relation_size(oid) DESC
        LIMIT 10
      `;
    } catch (error) {
      logger.error("Could not fetch table statistics:", error);
    }

    return NextResponse.json({
      success: true,
      summary: {
        totalIndexes: results.totalIndexes,
        created: results.created,
        skipped: results.skipped,
        failed: results.failed,
        analyzed: results.analyzed
      },
      details: results.details,
      currentIndexes: indexStats.length,
      indexList: indexStats.map(idx => ({
        table: idx.tablename,
        index: idx.indexname
      })),
      tableStats: tableStats.map(t => ({
        name: t.tablename,
        size: t.size,
        rows: t.estimated_rows
      }))
    });

  } catch (error) {
    logger.error("Error applying performance indexes:", error);
    return NextResponse.json(
      { error: "Failed to apply performance indexes" },
      { status: 500 }
    );
  }
}

// GET endpoint to check current index status
export async function GET(_req: NextRequest) {
  try {
    // Verify admin authentication
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check which indexes from our migration file exist
    const expectedIndexes = [
      "idx_quiz_attempts_student",
      "idx_quiz_attempts_quiz",
      "idx_questions_quiz",
      "idx_enrollments_lookup",
      "idx_quizzes_status_educator",
      "idx_quiz_attempts_scoring",
      "idx_users_role",
      "idx_sessions_user",
      "idx_activity_logs_timestamp",
      "idx_quiz_attempts_analytics",
      "idx_pending_educators",
      "idx_quizzes_documents"
    ];

    const existingIndexes = await pgClient`
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname = ANY(${expectedIndexes})
    `;

    const existingIndexNames = existingIndexes.map(idx => idx.indexname);
    const missingIndexes = expectedIndexes.filter(
      idx => !existingIndexNames.includes(idx)
    );

    return NextResponse.json({
      totalExpected: expectedIndexes.length,
      totalExisting: existingIndexNames.length,
      missingCount: missingIndexes.length,
      existingIndexes: existingIndexNames,
      missingIndexes,
      allApplied: missingIndexes.length === 0
    });

  } catch (error) {
    logger.error("Error checking index status:", error);
    return NextResponse.json(
      { error: "Failed to check index status" },
      { status: 500 }
    );
  }
}