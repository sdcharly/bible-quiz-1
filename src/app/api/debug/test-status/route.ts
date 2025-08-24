import { NextRequest, NextResponse } from "next/server";
import { LightRAGService } from "@/lib/lightrag-service";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    // Test with a sample track ID to see what LightRAG returns
    const sampleTrackIds = [
      "62ef5c67-7a4e-416b-bea9-c77f8e31e6db",
      "49e8efee-de12-4e70-abb3-6afc04eed0fd",
      "2a9b1456-d87e-412e-b5b8-94f1f8f3e9c4"
    ];

    const results = [];

    for (const trackId of sampleTrackIds) {
      logger.force(`[DEBUG] Testing track ID: ${trackId}`);
      try {
        const trackStatus = await LightRAGService.checkDocumentTrackStatus(trackId);
        results.push({
          trackId,
          trackStatus
        });
      } catch (error) {
        logger.force(`[DEBUG] Error checking track ${trackId}:`, error);
        results.push({
          trackId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Checked ${results.length} track IDs`,
      results: results
    });

  } catch (error) {
    logger.error("Error in test status endpoint:", error);
    return NextResponse.json({
      success: false,
      error: "Failed to check status"
    }, { status: 500 });
  }
}