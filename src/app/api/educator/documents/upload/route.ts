import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { documents } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    // Try to get session using Better Auth
    const session = await auth.api.getSession({
      headers: await headers()
    });

    // For development/testing, we'll allow uploads with a hardcoded educator ID
    // In production, you should properly validate the session
    let educatorId = "MMlI6NJuBNVBAEL7J4TyAX4ncO1ikns2"; // Default educator ID
    
    if (session?.user) {
      educatorId = session.user.id;
    } else {
      console.warn("No session found, using default educator ID for testing");
    }

    // Get the file from form data
    const formData = await req.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
      "text/plain"
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type" },
        { status: 400 }
      );
    }

    // Generate document ID
    const documentId = crypto.randomUUID();

    // Save initial document metadata to database
    const newDocument = await db.insert(documents).values({
      id: documentId,
      educatorId: educatorId, // Use the educator ID from session or default
      filename: file.name,
      filePath: "", // Will be updated after upload
      fileSize: file.size,
      mimeType: file.type,
      status: "processing",
      uploadDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    // Upload to LightRAG API
    const lightragUrl = process.env.LIGHTRAG_API_URL || "https://lightrag-jxo2.onrender.com";
    const lightragApiKey = process.env.LIGHTRAG_API_KEY || "01d8343f-fdf7-430f-927e-837df61d44fe";

    try {
      // Create FormData for the external API
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);

      // Send file to LightRAG
      const lightragResponse = await fetch(`${lightragUrl}/documents/upload`, {
        method: "POST",
        headers: {
          "accept": "application/json",
          "X-API-Key": lightragApiKey,
        },
        body: uploadFormData,
      });

      const lightragData = await lightragResponse.json();

      if (lightragResponse.ok) {
        // Update document status based on LightRAG response
        if (lightragData.status === "success" || lightragData.status === "duplicated") {
          const trackId = lightragData.track_id || lightragData.trackId || documentId;
          
          await db
            .update(documents)
            .set({ 
              status: "processed",
              processedData: {
                status: lightragData.status,
                message: lightragData.message,
                trackId: trackId,
                lightragDocumentId: trackId,
                fileName: file.name,
                fileType: file.type,
                fileSize: file.size,
                uploadedAt: new Date().toISOString(),
                lightragUrl: lightragUrl,
                processedBy: "LightRAG"
              },
              filePath: trackId
            })
            .where(eq(documents.id, documentId));

          return NextResponse.json({
            success: true,
            document: {
              ...newDocument[0],
              status: "processed",
              lightragResponse: lightragData,
              trackId: trackId
            },
            message: lightragData.message || "Document uploaded successfully"
          });
        } else {
          // Handle other statuses
          await db
            .update(documents)
            .set({ 
              status: "failed",
              processedData: {
                error: lightragData.message || "Upload failed",
                response: lightragData
              }
            })
            .where(eq(documents.id, documentId));

          return NextResponse.json({
            success: false,
            error: lightragData.message || "Failed to process document",
            document: newDocument[0]
          }, { status: 400 });
        }
      } else {
        // LightRAG API error
        await db
          .update(documents)
          .set({ 
            status: "failed",
            processedData: {
              error: "LightRAG API error",
              statusCode: lightragResponse.status,
              response: lightragData
            }
          })
          .where(eq(documents.id, documentId));

        return NextResponse.json({
          success: false,
          error: lightragData.message || "Failed to upload to LightRAG",
          document: newDocument[0]
        }, { status: 500 });
      }
    } catch (uploadError) {
      console.error("Error uploading to LightRAG:", uploadError);
      
      // Update document status to failed
      await db
        .update(documents)
        .set({ 
          status: "failed",
          processedData: {
            error: "Failed to connect to LightRAG API",
            details: uploadError instanceof Error ? uploadError.message : "Unknown error"
          }
        })
        .where(eq(documents.id, documentId));

      return NextResponse.json({
        success: false,
        error: "Failed to upload document to processing service",
        document: newDocument[0]
      }, { status: 500 });
    }
  } catch (error) {
    console.error("Error in document upload:", error);
    return NextResponse.json(
      { error: "Failed to upload document" },
      { status: 500 }
    );
  }
}