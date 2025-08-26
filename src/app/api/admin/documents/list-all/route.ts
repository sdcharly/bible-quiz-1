import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { documents } from "@/lib/schema";
import { getAdminSession } from "@/lib/admin-auth";


/**
 * List all documents in the database with their current IDs
 * This helps identify which documents need their LightRAG IDs corrected
 */
export async function GET() {
  // [REMOVED: Console statement for performance]
  
  try {
    // Check for admin session (uses JWT token from admin login)
    const adminSession = await getAdminSession();
    
    // [REMOVED: Console statement for performance]

    if (!adminSession) {
      // [REMOVED: Console statement for performance]
      return NextResponse.json(
        { error: "Admin access required", documents: [], totalDocuments: 0 },
        { status: 403 }
      );
    }

    // First, let's check if we can connect to the database at all
    try {
      const countResult = await db.execute(sql`SELECT COUNT(*) as count FROM documents`);
      // [REMOVED: Console statement for performance]
    } catch (dbError) {
      // [REMOVED: Console statement for performance]
      return NextResponse.json({
        error: "Database connection error",
        details: dbError instanceof Error ? dbError.message : 'Unknown error',
        documents: [],
        totalDocuments: 0
      }, { status: 500 });
    }

    // Get all documents
    // [REMOVED: Console statement for performance]
    const allDocs = await db
      .select()
      .from(documents)
      .orderBy(documents.uploadDate);
    
    // [REMOVED: Console statement for performance]

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

    // [REMOVED: Console statement for performance]
    
    return NextResponse.json(response);

  } catch (error) {
    // [REMOVED: Console statement for performance]
    return NextResponse.json({
      error: "Failed to list documents",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}