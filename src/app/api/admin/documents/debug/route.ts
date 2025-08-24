import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

/**
 * Debug endpoint to check document database connection
 */
export async function GET() {
  console.log("[Documents Debug] Starting diagnostic...");
  
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    databaseUrl: process.env.POSTGRES_URL ? "✓ Set" : "✗ Missing",
  };

  try {
    // Check session
    const session = await auth.api.getSession({
      headers: await headers()
    });

    diagnostics.session = {
      hasSession: !!session,
      hasUser: !!session?.user,
      userEmail: session?.user?.email || "none",
      userRole: session?.user?.role || "none",
      userId: session?.user?.id || "none"
    };

    // Only proceed if admin
    if (!session?.user || (session.user.role !== 'admin' && session.user.role !== 'super_admin')) {
      diagnostics.error = "Not authorized - admin role required";
      diagnostics.canProceed = false;
      return NextResponse.json(diagnostics);
    }

    diagnostics.canProceed = true;

    // Test raw SQL query
    try {
      console.log("[Documents Debug] Testing raw SQL count...");
      const countResult = await db.execute(sql`SELECT COUNT(*) as count FROM documents`);
      diagnostics.rawSqlCount = {
        success: true,
        count: countResult.rows?.[0]?.count || 0,
        rowsReturned: countResult.rows?.length || 0
      };
      console.log("[Documents Debug] Raw SQL result:", countResult.rows);
    } catch (e) {
      diagnostics.rawSqlCount = {
        success: false,
        error: e instanceof Error ? e.message : String(e)
      };
      console.error("[Documents Debug] Raw SQL error:", e);
    }

    // Test Drizzle query
    try {
      console.log("[Documents Debug] Testing Drizzle query...");
      const { documents: documentsTable } = await import("@/lib/schema");
      const docs = await db.select().from(documentsTable).limit(5);
      
      diagnostics.drizzleQuery = {
        success: true,
        documentsFound: docs.length,
        firstDocument: docs[0] ? {
          id: docs[0].id,
          filename: docs[0].filename,
          status: docs[0].status,
          hasProcessedData: !!docs[0].processedData
        } : null
      };
      console.log("[Documents Debug] Drizzle found:", docs.length, "documents");
    } catch (e) {
      diagnostics.drizzleQuery = {
        success: false,
        error: e instanceof Error ? e.message : String(e)
      };
      console.error("[Documents Debug] Drizzle error:", e);
    }

    // Check table structure
    try {
      console.log("[Documents Debug] Checking table structure...");
      const columnsResult = await db.execute(
        sql`SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'documents' 
            ORDER BY ordinal_position`
      );
      diagnostics.tableStructure = {
        success: true,
        columnCount: columnsResult.rows?.length || 0,
        columns: columnsResult.rows?.map((col: any) => ({
          name: col.column_name,
          type: col.data_type
        })).slice(0, 5) // First 5 columns only
      };
    } catch (e) {
      diagnostics.tableStructure = {
        success: false,
        error: e instanceof Error ? e.message : String(e)
      };
    }

    return NextResponse.json(diagnostics, { status: 200 });

  } catch (error) {
    console.error("[Documents Debug] Unexpected error:", error);
    diagnostics.unexpectedError = error instanceof Error ? error.message : String(error);
    return NextResponse.json(diagnostics, { status: 500 });
  }
}