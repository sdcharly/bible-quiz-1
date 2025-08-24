import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { documents } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { LightRAGService } from "@/lib/lightrag-service";

/**
 * Cleanup endpoint to fix document IDs in the database
 * This will:
 * 1. Check each document's track ID to get the permanent doc ID
 * 2. Update the database with the correct doc-xxx ID
 * 3. Remove any incorrect internal IDs
 */
export async function POST() {
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

    // Get all documents that might need cleanup
    const allDocs = await db
      .select()
      .from(documents);

    console.error(`[CLEANUP] Found ${allDocs.length} documents to check`);

    const results = [];
    let fixedCount = 0;
    let alreadyCorrectCount = 0;
    let noTrackIdCount = 0;

    for (const doc of allDocs) {
      const processedData = doc.processedData as Record<string, unknown> | null;
      const trackId = processedData?.trackId as string | undefined;
      const currentLightragId = processedData?.lightragDocumentId as string | undefined;
      const permanentDocId = processedData?.permanentDocId as string | undefined;

      console.error(`[CLEANUP] Checking document ${doc.id}:`);
      console.error(`  - Track ID: ${trackId}`);
      console.error(`  - Current LightRAG ID: ${currentLightragId}`);
      console.error(`  - Permanent Doc ID: ${permanentDocId}`);

      // Skip if already has correct permanent doc ID
      if (permanentDocId && permanentDocId.startsWith('doc-')) {
        console.error(`  ✓ Already has correct permanent ID`);
        alreadyCorrectCount++;
        results.push({
          documentId: doc.id,
          filename: doc.filename,
          status: 'already_correct',
          permanentDocId: permanentDocId
        });
        continue;
      }

      // Check if current lightragDocumentId is already correct
      if (currentLightragId && currentLightragId.startsWith('doc-')) {
        console.error(`  ✓ Has correct LightRAG ID, updating permanentDocId`);
        
        // Update to ensure permanentDocId is set
        await db.update(documents)
          .set({
            processedData: {
              ...processedData,
              permanentDocId: currentLightragId,
              lightragDocumentId: currentLightragId
            }
          })
          .where(eq(documents.id, doc.id));

        fixedCount++;
        results.push({
          documentId: doc.id,
          filename: doc.filename,
          status: 'fixed_from_existing',
          permanentDocId: currentLightragId
        });
        continue;
      }

      // If we have a track ID but it's not a doc ID, query LightRAG
      if (trackId && !trackId.startsWith('doc-')) {
        console.error(`  - Querying LightRAG for track ID: ${trackId}`);
        
        try {
          const trackStatus = await LightRAGService.checkDocumentTrackStatus(trackId);
          
          if (trackStatus.documentId && trackStatus.documentId.startsWith('doc-')) {
            console.error(`  ✓ Found permanent ID from LightRAG: ${trackStatus.documentId}`);
            
            // Update database with correct ID
            await db.update(documents)
              .set({
                processedData: {
                  ...processedData,
                  permanentDocId: trackStatus.documentId,
                  lightragDocumentId: trackStatus.documentId,
                  trackId: trackId // Keep original track ID for reference
                }
              })
              .where(eq(documents.id, doc.id));

            fixedCount++;
            results.push({
              documentId: doc.id,
              filename: doc.filename,
              status: 'fixed_from_lightrag',
              permanentDocId: trackStatus.documentId,
              trackId: trackId
            });
          } else {
            console.error(`  ⚠ No permanent ID found from LightRAG`);
            results.push({
              documentId: doc.id,
              filename: doc.filename,
              status: 'no_permanent_id_found',
              trackId: trackId
            });
          }
        } catch (error) {
          console.error(`  ✗ Error querying LightRAG:`, error);
          results.push({
            documentId: doc.id,
            filename: doc.filename,
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }

        // Add delay to avoid overwhelming LightRAG API
        await new Promise(resolve => setTimeout(resolve, 500));
      } else if (trackId && trackId.startsWith('doc-')) {
        // Track ID is actually the doc ID
        console.error(`  ✓ Track ID is actually doc ID: ${trackId}`);
        
        await db.update(documents)
          .set({
            processedData: {
              ...processedData,
              permanentDocId: trackId,
              lightragDocumentId: trackId
            }
          })
          .where(eq(documents.id, doc.id));

        fixedCount++;
        results.push({
          documentId: doc.id,
          filename: doc.filename,
          status: 'fixed_trackid_was_docid',
          permanentDocId: trackId
        });
      } else {
        console.error(`  ⚠ No track ID to work with`);
        noTrackIdCount++;
        results.push({
          documentId: doc.id,
          filename: doc.filename,
          status: 'no_track_id',
          currentData: processedData
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Cleanup completed`,
      summary: {
        totalDocuments: allDocs.length,
        alreadyCorrect: alreadyCorrectCount,
        fixed: fixedCount,
        noTrackId: noTrackIdCount,
        failed: results.filter(r => r.status === 'error' || r.status === 'no_permanent_id_found').length
      },
      results: results
    });

  } catch (error) {
    console.error("Error in cleanup:", error);
    return NextResponse.json({
      error: "Failed to cleanup document IDs",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}