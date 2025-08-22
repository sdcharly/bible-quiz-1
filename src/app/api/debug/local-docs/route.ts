import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { documents } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { isDebugEnabled } from "@/lib/env-config";

export async function GET(req: NextRequest) {
  // Block if debug features are not enabled
  if (!isDebugEnabled()) {
    return NextResponse.json(
      { error: "Debug endpoints are disabled" },
      { status: 403 }
    );
  }
  
  try {
    // Get all documents from local database
    const localDocuments = await db.select().from(documents);
    
    return NextResponse.json({
      success: true,
      totalDocuments: localDocuments.length,
      documents: localDocuments.map(doc => ({
        id: doc.id,
        filename: doc.filename,
        status: doc.status,
        lightragDocumentId: (doc.processedData as Record<string, unknown>)?.trackId || (doc.processedData as Record<string, unknown>)?.lightragDocumentId || null,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        processingStartedAt: doc.processingStartedAt,
        processingCompletedAt: doc.processingCompletedAt,
        educatorId: doc.educatorId
      }))
    });
    
  } catch (error) {
    logger.error('Error fetching local documents:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  // Block if debug features are not enabled
  if (!isDebugEnabled()) {
    return NextResponse.json(
      { error: "Debug endpoints are disabled" },
      { status: 403 }
    );
  }
  
  try {
    const { searchParams } = new URL(req.url);
    const docId = searchParams.get('docId');
    
    if (!docId) {
      return NextResponse.json({
        success: false,
        error: 'Document ID required'
      }, { status: 400 });
    }
    
    // Get document details before deletion
    const [document] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, docId));
    
    if (!document) {
      return NextResponse.json({
        success: false,
        error: 'Document not found'
      }, { status: 404 });
    }
    
    // Force delete from local database (for cleanup purposes)
    await db.delete(documents).where(eq(documents.id, docId));
    
    return NextResponse.json({
      success: true,
      message: `Forcefully deleted local document: ${docId}`,
      deletedDocument: {
        id: document.id,
        filename: document.filename,
        status: document.status
      }
    });
    
  } catch (error) {
    logger.error('Error in forced local deletion:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}