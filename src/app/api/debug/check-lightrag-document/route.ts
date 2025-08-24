import { NextRequest, NextResponse } from "next/server";

/**
 * Debug endpoint to directly check a document in LightRAG
 * Pass either track_id or doc_id as query params
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const trackId = searchParams.get('track_id');
    const docId = searchParams.get('doc_id');
    
    if (!trackId && !docId) {
      return NextResponse.json({
        error: "Please provide either track_id or doc_id as query parameter"
      }, { status: 400 });
    }

    const LIGHTRAG_BASE_URL = process.env.LIGHTRAG_BASE_URL || "https://lightrag-6bki.onrender.com";
    const LIGHTRAG_API_KEY = process.env.LIGHTRAG_API_KEY;

    if (!LIGHTRAG_API_KEY) {
      return NextResponse.json({
        error: "LightRAG API key not configured"
      }, { status: 500 });
    }

    // Check track status if track_id provided
    if (trackId) {
      const response = await fetch(`${LIGHTRAG_BASE_URL}/documents/track_status/${trackId}`, {
        method: 'GET',
        headers: {
          'X-API-Key': LIGHTRAG_API_KEY,
          'accept': 'application/json'
        }
      });

      const data = await response.json();
      
      return NextResponse.json({
        success: true,
        endpoint: `/documents/track_status/${trackId}`,
        status: response.status,
        response: data,
        analysis: {
          hasDocuments: data.documents && data.documents.length > 0,
          documentCount: data.total_count || 0,
          statusSummary: data.status_summary,
          permanentDocIds: data.documents?.map((d: { id: string }) => d.id) || [],
          isProcessed: (data.status_summary?.PROCESSED || 0) > 0
        }
      });
    }

    // Check document directly if doc_id provided
    if (docId) {
      const response = await fetch(`${LIGHTRAG_BASE_URL}/documents/${docId}`, {
        method: 'GET',
        headers: {
          'X-API-Key': LIGHTRAG_API_KEY,
          'accept': 'application/json'
        }
      });

      const data = response.ok ? await response.json() : null;
      
      return NextResponse.json({
        success: response.ok,
        endpoint: `/documents/${docId}`,
        status: response.status,
        response: data || { error: "Document not found or error" },
        analysis: {
          exists: response.ok,
          documentId: data?.id,
          status: data?.status
        }
      });
    }

  } catch (error) {
    console.error("Error checking LightRAG document:", error);
    return NextResponse.json({
      error: "Failed to check document",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}