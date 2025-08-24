import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { documents } from "@/lib/schema";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

/**
 * List all documents in the database with their current IDs
 * This helps identify which documents need their LightRAG IDs corrected
 */
export async function GET() {
  try {
    // Get session
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Get all documents
    const allDocs = await db
      .select()
      .from(documents)
      .orderBy(documents.uploadDate);

    const documentList = allDocs.map(doc => {
      const processedData = doc.processedData as Record<string, unknown> | null;
      
      return {
        // Database info
        internalId: doc.id,
        filename: doc.filename,
        displayName: doc.displayName,
        status: doc.status,
        uploadDate: doc.uploadDate,
        
        // Current IDs stored
        currentIds: {
          trackId: processedData?.trackId || null,
          lightragDocumentId: processedData?.lightragDocumentId || null,
          permanentDocId: processedData?.permanentDocId || null,
          filePath: doc.filePath || null
        },
        
        // Analysis
        hasValidDocId: (processedData?.permanentDocId as string)?.startsWith('doc-') || 
                      (processedData?.lightragDocumentId as string)?.startsWith('doc-') ||
                      false,
        needsCorrection: !(processedData?.permanentDocId as string)?.startsWith('doc-') &&
                        !(processedData?.lightragDocumentId as string)?.startsWith('doc-')
      };
    });

    // Create a simple text list for easy copying
    const simpleList = documentList.map((doc, index) => 
      `${index + 1}. ${doc.filename} (ID: ${doc.internalId}, Status: ${doc.status})`
    ).join('\n');

    return NextResponse.json({
      success: true,
      totalDocuments: documentList.length,
      needingCorrection: documentList.filter(d => d.needsCorrection).length,
      documents: documentList,
      simpleList: simpleList,
      instructions: "Please provide the correct LightRAG document IDs (doc-xxx) for each document that needs correction"
    });

  } catch (error) {
    console.error("Error listing documents:", error);
    return NextResponse.json({
      error: "Failed to list documents",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}