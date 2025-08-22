import { NextRequest, NextResponse } from "next/server";
import { LightRAGService } from "@/lib/lightrag-service";
import { db } from "@/lib/db";
import { documents } from "@/lib/schema";
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
    const { searchParams } = new URL(req.url);
    const checkDocument = searchParams.get('checkDoc');
    
    // Get all documents currently in LightRAG
    const lightragDocuments = await LightRAGService.listAllDocuments();
    
    // Get all local documents for comparison
    const localDocuments = await db.select().from(documents);
    
    // Get pipeline status for context
    const pipelineStatus = await LightRAGService.checkPipelineStatus();
    
    const response: Record<string, unknown> = {
      success: true,
      timestamp: new Date().toISOString(),
      lightragDocuments: {
        total: lightragDocuments.length,
        documents: lightragDocuments.map(doc => ({
          id: doc.id,
          title: doc.title,
          content: doc.content?.substring(0, 100) + ((doc.content?.length || 0) > 100 ? '...' : ''),
          timestamp: doc.timestamp
        }))
      },
      localDocuments: {
        total: localDocuments.length,
        documents: localDocuments.map(doc => ({
          id: doc.id,
          filename: doc.filename,
          status: doc.status,
          lightragDocumentId: (doc.processedData as Record<string, unknown>)?.trackId || (doc.processedData as Record<string, unknown>)?.lightragDocumentId || null
        }))
      },
      pipelineStatus: {
        busy: pipelineStatus.busy,
        docs: pipelineStatus.docs,
        requestPending: pipelineStatus.request_pending
      }
    };
    
    // If checking for a specific document
    if (checkDocument) {
      const lightragHasDoc = lightragDocuments.some(doc => doc.id === checkDocument);
      const localHasDoc = localDocuments.some(doc => 
        doc.id === checkDocument || 
        (doc.processedData as Record<string, unknown>)?.trackId === checkDocument ||
        (doc.processedData as Record<string, unknown>)?.lightragDocumentId === checkDocument
      );
      
      response.specificDocumentCheck = {
        documentId: checkDocument,
        existsInLightRAG: lightragHasDoc,
        existsInLocalDB: localHasDoc,
        recommendation: !lightragHasDoc && !localHasDoc 
          ? "Document appears to be fully deleted" 
          : "Document still exists - deletion may be incomplete"
      };
    }
    
    return NextResponse.json(response);
    
  } catch (error) {
    logger.error('Error fetching LightRAG documents:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const docId = searchParams.get('docId');
    
    if (!docId) {
      return NextResponse.json({
        success: false,
        error: 'Document ID required'
      }, { status: 400 });
    }
    
    logger.log(`Manual cleanup attempt for LightRAG document: ${docId}`);
    
    // Force delete from LightRAG
    const result = await LightRAGService.safeDeleteDocument(docId);
    
    return NextResponse.json({
      success: true,
      message: `Cleanup attempt completed for document ${docId}`,
      result
    });
    
  } catch (error) {
    logger.error('Error in manual cleanup:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}