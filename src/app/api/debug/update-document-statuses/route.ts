import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { documents } from "@/lib/schema";
import { eq, or, inArray } from "drizzle-orm";
import { LightRAGService } from "@/lib/lightrag-service";
import { logger } from "@/lib/logger";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    // Security: Only allow authenticated users (preferably admin/educator)
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get all documents that might need status updates
    // Include processing, deleted, and any with track IDs that might be ready
    const docsToCheck = await db
      .select()
      .from(documents)
      .where(or(
        eq(documents.status, "processing"),
        eq(documents.status, "deleted"),
        // Also check any documents that have track IDs but might be wrongly marked
        inArray(documents.status, ["pending", "failed"])
      ));

    logger.force(`Found ${docsToCheck.length} documents that need status checking`);

    const results = [];
    let updatedCount = 0;
    const categories = {
      processing: 0,
      deleted: 0,
      pending: 0,
      failed: 0,
      other: 0
    };

    // Check and update status for each document
    for (const doc of docsToCheck) {
      const originalStatus = doc.status as string;
      if (originalStatus in categories) {
        categories[originalStatus as keyof typeof categories]++;
      } else {
        categories.other++;
      }
      
      logger.force(`Checking document: ${doc.id} - ${doc.filename} (status: ${originalStatus})`);
      
      try {
        // Use our fixed updateDocumentProcessingStatus method
        const wasProcessed = await LightRAGService.updateDocumentProcessingStatus(doc.id);
        
        // Re-fetch the document to see if status actually changed
        const [updatedDoc] = await db
          .select()
          .from(documents)
          .where(eq(documents.id, doc.id));
        
        const statusChanged = updatedDoc?.status !== originalStatus;
        
        results.push({
          documentId: doc.id,
          filename: doc.filename,
          originalStatus: originalStatus,
          newStatus: updatedDoc?.status || 'unknown',
          statusChanged: statusChanged,
          wasProcessed: wasProcessed
        });

        if (statusChanged) {
          updatedCount++;
        }

        // Add small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        logger.error(`Error updating document ${doc.id}:`, error);
        results.push({
          documentId: doc.id,
          filename: doc.filename,
          originalStatus: originalStatus,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${docsToCheck.length} documents, updated ${updatedCount} statuses`,
      summary: {
        totalChecked: docsToCheck.length,
        totalUpdated: updatedCount,
        categories: categories,
        executedBy: session.user.email || session.user.id,
        executedAt: new Date().toISOString()
      },
      results: results
    });

  } catch (error) {
    logger.error("Error in update document statuses endpoint:", error);
    return NextResponse.json({
      success: false,
      error: "Failed to update document statuses",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}