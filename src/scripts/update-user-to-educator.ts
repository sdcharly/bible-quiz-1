#!/usr/bin/env node

import fs from "fs";
import path from "path";

// Load environment variables from .env file manually before any other imports
const envPath = path.join(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, "utf8");
  envFile.split("\n").forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const [key, ...valueParts] = trimmed.split("=");
      const value = valueParts.join("=").replace(/^["']|["']$/g, "");
      if (key && !process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

// Now import database-related modules after env vars are loaded
async function main() {
  const { db } = await import("@/lib/db");
  const { user } = await import("@/lib/schema");
  const { eq } = await import("drizzle-orm");
  
  const email = "talmidhouse@gmail.com";
  
  try {
    // First check if user exists
    const existingUser = await db
      .select()
      .from(user)
      .where(eq(user.email, email))
      .limit(1);

    if (existingUser.length === 0) {
      console.log(`User with email ${email} not found.`);
      process.exit(1);
    }

    const currentUser = existingUser[0];
    console.log(`Found user: ${currentUser.name} (${currentUser.email})`);
    console.log(`Current role: ${currentUser.role}`);
    console.log(`Current approval status: ${currentUser.approvalStatus}`);

    // Update the user to educator with full privileges
    const updatedUser = await db
      .update(user)
      .set({
        role: "educator",
        approvalStatus: "approved",
        approvedAt: new Date(),
        permissions: {
          canPublishQuiz: true,
          canAddStudents: true,
          canEditQuiz: true,
          canDeleteQuiz: true,
          canViewAnalytics: true,
          canExportData: true,
          maxStudents: 1000,
          maxQuizzes: 100,
          maxQuestionsPerQuiz: 100
        },
        updatedAt: new Date()
      })
      .where(eq(user.email, email))
      .returning();
    
    console.log("\nSuccessfully updated user:");
    console.log(`- Name: ${updatedUser[0].name}`);
    console.log(`- Email: ${updatedUser[0].email}`);
    console.log(`- New role: ${updatedUser[0].role}`);
    console.log(`- Approval status: ${updatedUser[0].approvalStatus}`);
    console.log(`- Approved at: ${updatedUser[0].approvedAt}`);
    console.log(`- Permissions:`, JSON.stringify(updatedUser[0].permissions, null, 2));
  } catch (error) {
    console.error("Error updating user:", error);
    process.exit(1);
  }
  
  process.exit(0);
}

main().catch(console.error);