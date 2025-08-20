import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { documents } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

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
    
    // The trackId is what LightRAG returns when uploading - this is what we need for deletion
    const lightragDocumentId = processedData?.trackId || processedData?.lightragDocumentId;
    
    console.log("Document deletion attempt:", {
      localDocumentId: params.id,
      lightragDocumentId: lightragDocumentId,
      processedData: processedData
    });

    // Delete from LightRAG if document was processed and has a valid LightRAG ID
    if (lightragDocumentId && document.status === "processed") {
      const lightragUrl = process.env.LIGHTRAG_API_URL || "https://lightrag-jxo2.onrender.com";
      const lightragApiKey = process.env.LIGHTRAG_API_KEY || "01d8343f-fdf7-430f-927e-837df61d44fe";

      try {
        console.log(`Deleting document from LightRAG with ID: ${lightragDocumentId}`);
        
        // Call LightRAG deletion endpoint for specific document
        const lightragResponse = await fetch(`${lightragUrl}/documents/delete_document`, {
          method: "DELETE",
          headers: {
            "accept": "application/json",
            "X-API-Key": lightragApiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            doc_ids: [String(lightragDocumentId)],
            delete_file: false
          }),
        });

        if (!lightragResponse.ok) {
          const errorText = await lightragResponse.text();
          console.error("Failed to delete from LightRAG:", errorText);
          // Continue with local deletion even if LightRAG deletion fails
          // You might want to handle this differently based on your requirements
        } else {
          const result = await lightragResponse.json();
          console.log(`Successfully deleted document ${lightragDocumentId} from LightRAG:`, result);
        }
      } catch (error) {
        console.error("Error deleting from LightRAG:", error);
        // Continue with local deletion even if LightRAG is unreachable
      }
    } else if (document.status === "processed" && !lightragDocumentId) {
      console.warn("Document marked as processed but has no LightRAG ID - skipping LightRAG deletion");
    }

    // Delete from local database
    await db
      .delete(documents)
      .where(eq(documents.id, params.id));

    return NextResponse.json({
      success: true,
      message: "Document deleted successfully",
      deletedFromLightRAG: !!lightragDocumentId,
      lightragDocumentId: lightragDocumentId || null,
      localDocumentId: params.id
    });

  } catch (error) {
    console.error("Error deleting document:", error);
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 }
    );
  }
}