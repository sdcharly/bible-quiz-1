import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { documents } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

/**
 * Update a specific document with the correct LightRAG document ID
 * POST body: { internalId: "xxx", lightragDocId: "doc-xxx" }
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { internalId, lightragDocId } = body;

    // Validate inputs
    if (!internalId || !lightragDocId) {
      return NextResponse.json({
        error: "Missing required fields: internalId and lightragDocId"
      }, { status: 400 });
    }

    // Validate that the LightRAG ID has correct format
    if (!lightragDocId.startsWith('doc-')) {
      return NextResponse.json({
        error: `Invalid LightRAG document ID format. Must start with 'doc-' but got: ${lightragDocId}`
      }, { status: 400 });
    }

    // Get the document
    const [document] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, internalId));

    if (!document) {
      return NextResponse.json({
        error: `Document not found with ID: ${internalId}`
      }, { status: 404 });
    }

    // Update the document with the correct LightRAG ID
    const processedData = document.processedData as Record<string, unknown> | null;
    
    await db.update(documents)
      .set({
        processedData: {
          ...processedData,
          permanentDocId: lightragDocId,
          lightragDocumentId: lightragDocId,
          // Keep the original track ID if it exists
          trackId: processedData?.trackId || undefined
        },
        // Also update status to processed if it was stuck in processing
        status: document.status === 'processing' ? 'processed' : document.status,
        updatedAt: new Date()
      })
      .where(eq(documents.id, internalId));

    console.log(`Updated document ${internalId} with LightRAG ID: ${lightragDocId}`);

    return NextResponse.json({
      success: true,
      message: `Document ${document.filename} updated with LightRAG ID: ${lightragDocId}`,
      document: {
        internalId: internalId,
        filename: document.filename,
        lightragDocId: lightragDocId,
        previousIds: {
          trackId: processedData?.trackId,
          lightragDocumentId: processedData?.lightragDocumentId,
          permanentDocId: processedData?.permanentDocId
        }
      }
    });

  } catch (error) {
    console.error("Error updating document ID:", error);
    return NextResponse.json({
      error: "Failed to update document ID",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Batch update multiple documents
 * POST body: { updates: [{ internalId: "xxx", lightragDocId: "doc-xxx" }, ...] }
 */
export async function PUT(request: NextRequest) {
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

    const body = await request.json();
    const { updates } = body;

    if (!updates || !Array.isArray(updates)) {
      return NextResponse.json({
        error: "Missing or invalid updates array"
      }, { status: 400 });
    }

    const results = [];

    for (const update of updates) {
      const { internalId, lightragDocId } = update;

      // Skip invalid entries
      if (!internalId || !lightragDocId || !lightragDocId.startsWith('doc-')) {
        results.push({
          internalId,
          success: false,
          error: !lightragDocId ? 'Missing LightRAG ID' : 
                 !lightragDocId.startsWith('doc-') ? 'Invalid format (must start with doc-)' :
                 'Missing internal ID'
        });
        continue;
      }

      try {
        // Get the document
        const [document] = await db
          .select()
          .from(documents)
          .where(eq(documents.id, internalId));

        if (!document) {
          results.push({
            internalId,
            success: false,
            error: 'Document not found'
          });
          continue;
        }

        // Update the document
        const processedData = document.processedData as Record<string, unknown> | null;
        
        await db.update(documents)
          .set({
            processedData: {
              ...processedData,
              permanentDocId: lightragDocId,
              lightragDocumentId: lightragDocId,
              trackId: processedData?.trackId || undefined
            },
            status: document.status === 'processing' ? 'processed' : document.status,
            updatedAt: new Date()
          })
          .where(eq(documents.id, internalId));

        results.push({
          internalId,
          filename: document.filename,
          lightragDocId,
          success: true
        });

      } catch (error) {
        results.push({
          internalId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: true,
      message: `Batch update completed: ${successCount} succeeded, ${failedCount} failed`,
      summary: {
        total: updates.length,
        succeeded: successCount,
        failed: failedCount
      },
      results
    });

  } catch (error) {
    console.error("Error in batch update:", error);
    return NextResponse.json({
      error: "Failed to batch update document IDs",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}