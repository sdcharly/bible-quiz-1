import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { documents } from "@/lib/schema";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

/**
 * Debug endpoint to check what IDs we have stored for documents
 * and what LightRAG actually has
 */
export async function GET() {
  try {
    // Get session
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get all documents
    const allDocs = await db
      .select()
      .from(documents)
      .limit(10); // Limit for debugging

    const results = allDocs.map(doc => {
      const processedData = doc.processedData as Record<string, unknown>;
      return {
        id: doc.id,
        filename: doc.filename,
        status: doc.status,
        trackId: processedData?.trackId,
        lightragDocumentId: processedData?.lightragDocumentId,
        filePath: doc.filePath,
        processedData: processedData,
        uploadDate: doc.uploadDate
      };
    });

    return NextResponse.json({
      success: true,
      message: "Document IDs inspection",
      documents: results,
      analysis: {
        totalDocuments: results.length,
        withTrackId: results.filter(d => d.trackId).length,
        withLightragId: results.filter(d => d.lightragDocumentId).length,
        processingStatus: {
          processing: results.filter(d => d.status === 'processing').length,
          processed: results.filter(d => d.status === 'processed').length,
          failed: results.filter(d => d.status === 'failed').length,
          deleted: results.filter(d => d.status === 'deleted').length
        }
      }
    });

  } catch (error) {
    console.error("Error checking document IDs:", error);
    return NextResponse.json(
      { 
        error: "Failed to check document IDs",
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}