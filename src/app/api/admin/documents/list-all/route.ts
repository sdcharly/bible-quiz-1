import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { documents } from "@/lib/schema";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { sql } from "drizzle-orm";

/**
 * List all documents in the database with their current IDs
 * This helps identify which documents need their LightRAG IDs corrected
 */
export async function GET() {
  console.log("[Documents API] Starting request...");
  
  try {
    // Get session
    const session = await auth.api.getSession({
      headers: await headers()
    });

    console.log("[Documents API] Session check:", {
      hasSession: !!session,
      hasUser: !!session?.user,
      userRole: session?.user?.role
    });

    if (!session?.user) {
      console.log("[Documents API] No session found");
      return NextResponse.json(
        { error: "Unauthorized - Admin access required", documents: [], totalDocuments: 0 },
        { status: 401 }
      );
    }

    if (session.user.role !== 'admin' && session.user.role !== 'super_admin') {
      console.log("[Documents API] User role not admin:", session.user.role);
      return NextResponse.json(
        { error: "Forbidden - Admin role required", documents: [], totalDocuments: 0 },
        { status: 403 }
      );
    }

    // First, let's check if we can connect to the database at all
    try {
      const countResult = await db.execute(sql`SELECT COUNT(*) as count FROM documents`);
      console.log("[Documents API] Raw count query result:", countResult);
    } catch (dbError) {
      console.error("[Documents API] Database connection error:", dbError);
      return NextResponse.json({
        error: "Database connection error",
        details: dbError instanceof Error ? dbError.message : 'Unknown error',
        documents: [],
        totalDocuments: 0
      }, { status: 500 });
    }

    // Get all documents
    console.log("[Documents API] Fetching all documents from database...");
    const allDocs = await db
      .select()
      .from(documents)
      .orderBy(documents.uploadDate);
    
    console.log(`[Documents API] Found ${allDocs.length} documents in database`);

    const documentList = allDocs.map(doc => {
      const processedData = doc.processedData as Record<string, any> | null;
      
      // Check for LightRAG document ID in various places
      const lightragDocId = processedData?.lightragDocumentId || 
                            processedData?.permanentDocId || 
                            processedData?.documentId ||
                            null;
      
      const trackId = processedData?.trackId || processedData?.track_id || null;
      
      return {
        // Database info
        internalId: doc.id,
        filename: doc.filename,
        displayName: doc.displayName || null,
        status: doc.status,
        uploadDate: doc.uploadDate,
        
        // Current IDs stored
        currentIds: {
          trackId: trackId,
          lightragDocumentId: lightragDocId,
          permanentDocId: processedData?.permanentDocId || null,
          filePath: doc.filePath || null
        },
        
        // Analysis - check if we have a valid doc ID or track ID
        hasValidDocId: Boolean(
          lightragDocId?.startsWith('doc-') || 
          trackId?.startsWith('upload_')
        ),
        needsCorrection: doc.status === 'processed' && !lightragDocId?.startsWith('doc-') && !trackId
      };
    });

    // Create a simple text list for easy copying
    const simpleList = documentList.map((doc, index) => 
      `${index + 1}. ${doc.filename} (ID: ${doc.internalId}, Status: ${doc.status})`
    ).join('\n');

    const response = {
      success: true,
      totalDocuments: documentList.length,
      needingCorrection: documentList.filter(d => d.needsCorrection).length,
      documents: documentList,
      simpleList: simpleList,
      instructions: "Please provide the correct LightRAG document IDs (doc-xxx) for each document that needs correction"
    };

    console.log("[Documents API] Returning response with", response.totalDocuments, "documents");
    
    return NextResponse.json(response);

  } catch (error) {
    console.error("Error listing documents:", error);
    return NextResponse.json({
      error: "Failed to list documents",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}