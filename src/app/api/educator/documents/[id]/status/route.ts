import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { LightRAGService } from "@/lib/lightrag-service";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { documents } from "@/lib/schema";


export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get session
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const documentId = (await params).id;

    if (!documentId) {
      return NextResponse.json(
        { error: "Document ID is required" },
        { status: 400 }
      );
    }

    // Get document from database to check status and deletion info
    const [document] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId));

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // If document is deleted, return its deletion info
    if (document.status === "deleted") {
      const processedData = document.processedData as Record<string, unknown>;
      return NextResponse.json({
        success: true,
        data: {
          status: "deleted",
          isComplete: true,
          isFailed: false,
          isProcessing: false,
          progress: null,
          lastChecked: new Date().toISOString(),
          deletionInfo: processedData?.deletionInfo || {}
        }
      });
    }

    // Otherwise get normal processing progress
    const progress = await LightRAGService.getDocumentProcessingProgress(documentId);

    return NextResponse.json({
      success: true,
      data: progress
    });

  } catch (error) {
    // [REMOVED: Console statement for performance]
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Failed to get document status" 
      },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get session
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const documentId = (await params).id;

    if (!documentId) {
      return NextResponse.json(
        { error: "Document ID is required" },
        { status: 400 }
      );
    }

    // Get document from database to check status
    const [document] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId));

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // If document is deleted, return its deletion info
    if (document.status === "deleted") {
      const processedData = document.processedData as Record<string, unknown>;
      return NextResponse.json({
        success: true,
        data: {
          status: "deleted",
          isComplete: true,
          isFailed: false,
          isProcessing: false,
          progress: null,
          lastChecked: new Date().toISOString(),
          deletionInfo: processedData?.deletionInfo || {},
          refreshed: true
        }
      });
    }

    // Force check the current status from LightRAG
    const progress = await LightRAGService.getDocumentProcessingProgress(documentId);

    return NextResponse.json({
      success: true,
      data: {
        ...progress,
        refreshed: true
      }
    });

  } catch (error) {
    // [REMOVED: Console statement for performance]
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Failed to update document status" 
      },
      { status: 500 }
    );
  }
}