import { db } from "../lib/db";
import { user } from "../lib/schema";
import { eq, and } from "drizzle-orm";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function fixStudentApprovalStatus() {
  console.log("Starting to fix student approval status...");

  try {
    // Find all students with pending approval status
    const pendingStudents = await db
      .select()
      .from(user)
      .where(
        and(
          eq(user.role, "student"),
          eq(user.approvalStatus, "pending")
        )
      );

    console.log(`Found ${pendingStudents.length} students with pending approval status`);

    if (pendingStudents.length === 0) {
      console.log("No students need approval status update");
      return;
    }

    // Update all pending students to approved
    for (const student of pendingStudents) {
      await db
        .update(user)
        .set({
          approvalStatus: "approved",
          updatedAt: new Date()
        })
        .where(eq(user.id, student.id));
      
      console.log(`✓ Updated student: ${student.name} (${student.email}) - Status: pending → approved`);
    }

    // Verify the updates
    const stillPending = await db
      .select()
      .from(user)
      .where(
        and(
          eq(user.role, "student"),
          eq(user.approvalStatus, "pending")
        )
      );

    if (stillPending.length === 0) {
      console.log("\n✅ Success! All students now have approved status");
    } else {
      console.log(`\n⚠️  Warning: ${stillPending.length} students still have pending status`);
    }

    // Show summary
    const allStudents = await db
      .select()
      .from(user)
      .where(eq(user.role, "student"));

    const statusSummary = {
      total: allStudents.length,
      approved: allStudents.filter(s => s.approvalStatus === "approved").length,
      pending: allStudents.filter(s => s.approvalStatus === "pending").length,
      rejected: allStudents.filter(s => s.approvalStatus === "rejected").length,
      suspended: allStudents.filter(s => s.approvalStatus === "suspended").length,
    };

    console.log("\n📊 Student Status Summary:");
    console.log(`Total Students: ${statusSummary.total}`);
    console.log(`Approved: ${statusSummary.approved}`);
    console.log(`Pending: ${statusSummary.pending}`);
    console.log(`Rejected: ${statusSummary.rejected}`);
    console.log(`Suspended: ${statusSummary.suspended}`);

  } catch (error) {
    console.error("Error fixing student approval status:", error);
    process.exit(1);
  }

  process.exit(0);
}

// Run the fix
fixStudentApprovalStatus();