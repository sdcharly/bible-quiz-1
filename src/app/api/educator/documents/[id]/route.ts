import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { documents, quizzes } from "@/lib/schema";
import { eq, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { LightRAGService } from "@/lib/lightrag-service";

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

    let educatorId = "MMlI6NJuBNVBAEL7J4TyAX4ncO1ikns2"; // Default for testing
    
    if (session?.user) {
      educatorId = session.user.id;
    }

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
    const lightragDocumentId = processedData?.trackId || processedData?.lightragDocumentId;
    
    console.log("Document deletion attempt:", {
      localDocumentId: params.id,
      lightragDocumentId: lightragDocumentId,
      documentStatus: document.status,
      filename: document.filename
    });

    let lightragResult = null;
    const deletionWarnings: string[] = [];

    // Enhanced LightRAG deletion with safety checks
    if (lightragDocumentId && (document.status === "processed" || document.status === "processing")) {
      try {
        console.log(`Attempting safe deletion of LightRAG document: ${lightragDocumentId}`);
        
        // Use the enhanced safe deletion method
        lightragResult = await LightRAGService.safeDeleteDocument(String(lightragDocumentId));
        
        console.log(`LightRAG deletion result for ${lightragDocumentId}:`, lightragResult);

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
        console.error(`Error in safe LightRAG deletion for ${lightragDocumentId}:`, error);
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
      deletionWarnings.push("Document marked as processed but has no LightRAG ID - local deletion only");
    } else if (document.status === "failed") {
      console.log("Document failed processing, safe to delete locally");
    } else if (document.status === "pending") {
      console.log("Document never processed, safe to delete locally");
    }

    // Check for active quizzes using this document before deletion
    try {
      const affectedQuizzes = await db
        .select({ id: quizzes.id, title: quizzes.title })
        .from(quizzes)
        .where(sql`${quizzes.documentIds} @> ${JSON.stringify([params.id])}`);

      if (affectedQuizzes.length > 0) {
        return NextResponse.json({
          success: false,
          error: `Cannot delete document: It is being used in ${affectedQuizzes.length} quiz(es). Please remove it from quizzes first.`,
          affectedQuizzes: affectedQuizzes
        }, { status: 409 });
      }
    } catch (quizCheckError) {
      console.warn("Could not check for quiz dependencies:", quizCheckError);
      deletionWarnings.push("Could not verify quiz dependencies");
    }

    // Delete from local database
    await db.delete(documents).where(eq(documents.id, params.id));

    console.log(`Successfully deleted document ${params.id} from local database`);

    return NextResponse.json({
      success: true,
      message: "Document deleted successfully",
      details: {
        localDocumentId: params.id,
        lightragDocumentId: lightragDocumentId || null,
        lightragDeletion: lightragResult ? {
          success: lightragResult.success,
          verified: lightragResult.verified,
          status: lightragResult.lightragStatus?.status
        } : null,
        warnings: deletionWarnings.length > 0 ? deletionWarnings : undefined
      }
    });

  } catch (error) {
    console.error("Error deleting document:", error);
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 }
    );
  }
}