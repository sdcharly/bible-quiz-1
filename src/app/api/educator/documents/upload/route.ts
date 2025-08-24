import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { documents } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { LightRAGService } from "@/lib/lightrag-service";

export async function POST(req: NextRequest) {
  try {
    // Get session using Better Auth
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

    // Get the file from form data
    const formData = await req.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Enhanced file validation using LightRAG service
    const validation = LightRAGService.validateFileForUpload(file);
    
    if (!validation.isValid) {
      return NextResponse.json({
        success: false,
        error: "File validation failed",
        details: {
          errors: validation.errors,
          warnings: validation.warnings,
          fileInfo: validation.fileInfo
        }
      }, { status: 400 });
    }

    // Log validation warnings if any
    if (validation.warnings.length > 0) {
      console.warn(`Upload warnings for ${file.name}:`, validation.warnings);
    }

    // Generate document ID
    const documentId = crypto.randomUUID();

    // Save initial document metadata to database
    const newDocument = await db.insert(documents).values({
      id: documentId,
      educatorId: educatorId,
      filename: file.name,
      filePath: "",
      fileSize: file.size,
      mimeType: file.type,
      status: "pending",
      uploadDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    console.log(`Starting enhanced upload process for: ${file.name} (${(file.size / 1024).toFixed(1)}KB)`);

    try {
      // Use the enhanced safe upload method
      const uploadResult = await LightRAGService.safeUploadDocument(file);
      
      if (uploadResult.success && uploadResult.uploadResponse) {
        const response = uploadResult.uploadResponse;
        
        // Critical debug logging to identify the issue
        console.error(`[CRITICAL DEBUG] Upload response from LightRAG:`, JSON.stringify(response, null, 2));
        console.error(`[CRITICAL DEBUG] Track ID in response: "${response.track_id}"`);
        console.error(`[CRITICAL DEBUG] Our document ID: "${documentId}"`);
        
        // CRITICAL: Only use LightRAG's track_id, never fallback to internal ID
        if (!response.track_id) {
          console.error(`[CRITICAL ERROR] LightRAG did not return a track_id! Cannot track document status.`);
          
          // Mark as failed since we can't track it
          await db.update(documents)
            .set({ 
              status: "failed",
              processedData: {
                error: "No track_id received from LightRAG - cannot track document",
                lightragResponse: response,
                timestamp: new Date().toISOString()
              }
            })
            .where(eq(documents.id, documentId));
          
          return NextResponse.json({
            success: false,
            error: "Document upload failed: No tracking ID received from LightRAG",
            details: {
              message: "LightRAG did not return a track_id. The document cannot be tracked or used.",
              response: response
            }
          }, { status: 500 });
        }
        
        const trackId = response.track_id;
        console.error(`[CRITICAL DEBUG] Using LightRAG track ID: "${trackId}"`);
        
        
        // Determine final status based on upload response
        let finalStatus: "processing" | "processed" | "failed" = "processing";
        if (response.status === "duplicated") {
          finalStatus = "processed"; // Duplicated files are already processed
        }

        // Update document with upload success
        await db
          .update(documents)
          .set({ 
            status: finalStatus,
            processedData: {
              status: response.status,
              message: response.message,
              trackId: trackId,
              // Don't set lightragDocumentId yet - it will be set when processing completes
              fileName: file.name,
              fileType: file.type,
              fileSize: file.size,
              uploadedAt: new Date().toISOString(),
              processedBy: "LightRAG",
              retryCount: uploadResult.retryCount,
              validationWarnings: validation.warnings.length > 0 ? validation.warnings : undefined
            },
            filePath: trackId,
            processingStartedAt: finalStatus === "processing" ? new Date() : undefined,
            processingCompletedAt: finalStatus === "processed" ? new Date() : undefined
          })
          .where(eq(documents.id, documentId));

        // Start background polling only if document is still processing
        if (finalStatus === "processing") {
          setImmediate(async () => {
            try {
              await LightRAGService.pollDocumentStatus(documentId);
            } catch (error) {
              console.error(`Background polling failed for document ${documentId}:`, error);
            }
          });
        }

        // Prepare success response
        let successMessage = response.message || "Document uploaded successfully";
        if (response.status === "duplicated") {
          successMessage = "Document was already processed (duplicate detected)";
        } else if (uploadResult.retryCount > 0) {
          successMessage += ` (succeeded after ${uploadResult.retryCount} retries)`;
        }

        return NextResponse.json({
          success: true,
          document: {
            ...newDocument[0],
            status: finalStatus,
            lightragResponse: response,
            trackId: trackId
          },
          message: successMessage,
          details: {
            uploadStatus: response.status,
            retryCount: uploadResult.retryCount,
            validationWarnings: validation.warnings.length > 0 ? validation.warnings : undefined,
            processingRequired: finalStatus === "processing"
          }
        });
        
      } else {
        // Upload failed after retries
        await db
          .update(documents)
          .set({ 
            status: "failed",
            processedData: {
              error: uploadResult.error || "Upload failed",
              retryCount: uploadResult.retryCount,
              validationDetails: uploadResult.validation,
              lastAttempt: new Date().toISOString()
            }
          })
          .where(eq(documents.id, documentId));

        // Determine appropriate HTTP status code
        let statusCode = 500;
        if (uploadResult.error?.includes('File validation failed')) {
          statusCode = 400;
        } else if (uploadResult.error?.includes('busy')) {
          statusCode = 429;
        } else if (uploadResult.error?.includes('not supported')) {
          statusCode = 415;
        }

        return NextResponse.json({
          success: false,
          error: uploadResult.error || "Upload failed after all retry attempts",
          document: newDocument[0],
          details: {
            retryCount: uploadResult.retryCount,
            validationErrors: uploadResult.validation.errors,
            validationWarnings: uploadResult.validation.warnings,
            fileInfo: uploadResult.validation.fileInfo
          }
        }, { status: statusCode });
      }

    } catch (uploadError) {
      console.error(`Unexpected error during upload of ${file.name}:`, uploadError);
      
      // Update document status to failed
      await db
        .update(documents)
        .set({ 
          status: "failed",
          processedData: {
            error: "Unexpected upload error",
            details: uploadError instanceof Error ? uploadError.message : "Unknown error",
            timestamp: new Date().toISOString()
          }
        })
        .where(eq(documents.id, documentId));

      return NextResponse.json({
        success: false,
        error: "An unexpected error occurred during upload",
        document: newDocument[0],
        details: {
          errorType: "unexpected_error",
          message: uploadError instanceof Error ? uploadError.message : "Unknown error"
        }
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