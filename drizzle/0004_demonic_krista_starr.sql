ALTER TABLE "documents" ADD COLUMN "lightrag_processing_status" jsonb;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "processing_started_at" timestamp;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "processing_completed_at" timestamp;