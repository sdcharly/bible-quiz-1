import { NextRequest, NextResponse } from "next/server";
import { eq, sql, and } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { documents, quizzes } from "@/lib/schema";
import { auth } from "@/lib/auth";
import { LightRAGService } from "@/lib/lightrag-service";
import { logger } from "@/lib/logger";


export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    
    // Get session
    const session = await auth.api.getSession({
      headers: await headers()
    });

    // Require authenticated educator
    if (!session?.user || session.user.role !== 'educator') {
      return NextResponse.json(
        { error: "Unauthorized - Educator access required" },
        { status: 401 }
      );
    }
    
    const educatorId = session.user.id;

    // First, fetch the document to get its metadata
    const [document] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, params.id));

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Verify the document belongs to this educator
    if (document.educatorId !== educatorId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    // Get the LightRAG document ID from metadata
    const processedData = document.processedData as Record<string, unknown> | null;
    
    // Prioritize permanent doc ID (doc-xxx), then lightragDocumentId, then trackId
    const permanentDocId = processedData?.permanentDocId as string | undefined;
    const lightragDocId = processedData?.lightragDocumentId as string | undefined;
    const trackId = processedData?.trackId as string | undefined;
    
    // CRITICAL: Only use IDs that start with "doc-" for deletion
    let lightragDocumentId: string | undefined;
    
    if (permanentDocId && permanentDocId.startsWith('doc-')) {
      lightragDocumentId = permanentDocId;
    } else if (lightragDocId && lightragDocId.startsWith('doc-')) {
      lightragDocumentId = lightragDocId;
    } else if (trackId && trackId.startsWith('doc-')) {
      // Sometimes the track ID might actually be the doc ID
      lightragDocumentId = trackId;
    } else {
      // No valid doc ID found
      lightragDocumentId = undefined;
      logger.warn(`No valid LightRAG document ID (doc-xxx) found for deletion`);
    }
    
    logger.debug(`Deletion IDs - permanentDocId: ${permanentDocId}, lightragDocId: ${lightragDocId}, trackId: ${trackId}`);
    logger.debug(`Using for deletion: ${lightragDocumentId}`);
    
    logger.info("Document deletion attempt:", {
      localDocumentId: params.id,
      lightragDocumentId: lightragDocumentId,
      documentStatus: document.status,
      filename: document.filename
    });

    let lightragResult = null;
    const deletionWarnings: string[] = [];

    // Enhanced LightRAG deletion with safety checks
    // Only attempt deletion if we have a valid doc ID (starts with "doc-")
    if (lightragDocumentId && lightragDocumentId.startsWith('doc-') && 
        (document.status === "processed" || document.status === "processing")) {
      try {
        logger.info(`Attempting safe deletion of LightRAG document: ${lightragDocumentId}`);
        
        // Use the enhanced safe deletion method
        lightragResult = await LightRAGService.safeDeleteDocument(String(lightragDocumentId));
        
        logger.info(`LightRAG deletion result for ${lightragDocumentId}:`, lightragResult);

        // Handle different deletion outcomes
        if (!lightragResult.success) {
          deletionWarnings.push(`LightRAG deletion failed: ${lightragResult.error}`);
          
          // Decide whether to continue with local deletion
          if (lightragResult.error?.includes("busy")) {
            return NextResponse.json({
              success: false,
              error: "Cannot delete document: LightRAG is currently busy processing. Please try again in a few moments.",
              retryAfter: 30 // seconds
            }, { status: 429 });
          }
          
          if (lightragResult.error?.includes("not_allowed")) {
            return NextResponse.json({
              success: false,
              error: "Document deletion not allowed: It may be currently in use or protected by LightRAG.",
              details: lightragResult.lightragStatus?.message
            }, { status: 403 });
          }
        } else if (!lightragResult.verified) {
          deletionWarnings.push("Document deleted from LightRAG but verification timeout occurred");
        }

      } catch (error) {
        logger.error(`Error in safe LightRAG deletion for ${lightragDocumentId}:`, error);
        deletionWarnings.push(`LightRAG deletion error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        
        // For network errors, we might want to prevent local deletion
        if (error instanceof Error && error.message.includes('fetch')) {
          return NextResponse.json({
            success: false,
            error: "Cannot verify document deletion from LightRAG due to network issues. Please try again later.",
            retryAfter: 60
          }, { status: 503 });
        }
      }
    } else if (document.status === "processed" && !lightragDocumentId) {
      deletionWarnings.push("Document marked as processed but has no valid LightRAG ID (doc-xxx) - local deletion only");
      logger.warn(`Cannot delete from LightRAG: No valid document ID starting with 'doc-'`);
    } else if (document.status === "failed") {
      logger.info("Document failed processing, safe to delete locally");
    } else if (document.status === "pending") {
      logger.info("Document never processed, safe to delete locally");
    }

    // Check for active quizzes using this document
    let hasQuizDependencies = false;
    let affectedQuizzes: { id: string; title: string; }[] = [];
    try {
      affectedQuizzes = await db
        .select({ id: quizzes.id, title: quizzes.title })
        .from(quizzes)
        .where(sql`${quizzes.documentIds} @> ${JSON.stringify([params.id])}`);

      hasQuizDependencies = affectedQuizzes.length > 0;
      if (hasQuizDependencies) {
        deletionWarnings.push(`Document is being used in ${affectedQuizzes.length} quiz(es)`);
      }
    } catch (quizCheckError) {
      logger.warn("Could not check for quiz dependencies:", quizCheckError);
      deletionWarnings.push("Could not verify quiz dependencies");
    }

    // Mark document as deleted regardless of dependencies
    // This allows us to visually mark it as deleted even if it can't be fully removed
    await db.update(documents)
      .set({ 
        status: "deleted",
        updatedAt: new Date(),
        processedData: {
          ...processedData,
          deletionInfo: {
            deletedAt: new Date().toISOString(),
            deletedBy: educatorId,
            lightragDeleted: lightragResult?.success || false,
            lightragVerified: lightragResult?.verified || false,
            hasQuizDependencies: hasQuizDependencies,
            affectedQuizzes: affectedQuizzes.map(q => q.title),
            failureReason: hasQuizDependencies ? "Document in use by quizzes" : undefined
          }
        }
      })
      .where(eq(documents.id, params.id));

    logger.info(`Successfully marked document ${params.id} as deleted`);

    // Determine the appropriate message based on dependencies
    let message = "Document marked as deleted";
    if (hasQuizDependencies) {
      message = `Document marked as deleted but is still in use by ${affectedQuizzes.length} quiz(es)`;
    } else if (lightragResult?.success) {
      message = "Document deleted successfully from all systems";
    }

    return NextResponse.json({
      success: true,
      message: message,
      details: {
        localDocumentId: params.id,
        lightragDocumentId: lightragDocumentId || null,
        lightragDeletion: lightragResult ? {
          success: lightragResult.success,
          verified: lightragResult.verified,
          status: lightragResult.lightragStatus?.status
        } : null,
        hasQuizDependencies: hasQuizDependencies,
        affectedQuizzes: hasQuizDependencies ? affectedQuizzes : undefined,
        warnings: deletionWarnings.length > 0 ? deletionWarnings : undefined
      }
    });

  } catch (error) {
    logger.error("Error deleting document:", error);
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    
    // Get session
    const session = await auth.api.getSession({
      headers: await headers()
    });

    // Require authenticated educator
    if (!session?.user || session.user.role !== 'educator') {
      return NextResponse.json(
        { error: "Unauthorized - Educator access required" },
        { status: 401 }
      );
    }

    const documentId = params.id;
    const educatorId = session.user.id;

    // Fetch the document
    const document = await db
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.id, documentId),
          eq(documents.educatorId, educatorId)
        )
      )
      .limit(1);

    if (document.length === 0) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      document: document[0]
    });
  } catch (error) {
    logger.error("Error fetching document:", error);
    return NextResponse.json(
      { error: "Failed to fetch document" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    
    // Get session
    const session = await auth.api.getSession({
      headers: await headers()
    });

    // Require authenticated educator
    if (!session?.user || session.user.role !== 'educator') {
      return NextResponse.json(
        { error: "Unauthorized - Educator access required" },
        { status: 401 }
      );
    }

    const documentId = params.id;
    const educatorId = session.user.id;
    const { displayName, remarks } = await request.json();

    // Validate input
    if (!displayName || typeof displayName !== 'string') {
      return NextResponse.json(
        { error: "Display name is required" },
        { status: 400 }
      );
    }

    // Check if document exists and belongs to educator
    const existingDocument = await db
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.id, documentId),
          eq(documents.educatorId, educatorId)
        )
      )
      .limit(1);

    if (existingDocument.length === 0) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Update the document
    const updatedDocument = await db
      .update(documents)
      .set({
        displayName: displayName.trim(),
        remarks: remarks?.trim() || null,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(documents.id, documentId),
          eq(documents.educatorId, educatorId)
        )
      )
      .returning();

    logger.info(`Document metadata updated: ${documentId} by educator ${educatorId}`);

    return NextResponse.json({
      success: true,
      document: updatedDocument[0]
    });
  } catch (error) {
    logger.error("Error updating document metadata:", error);
    return NextResponse.json(
      { error: "Failed to update document" },
      { status: 500 }
    );
  }
}