import "dotenv/config";
import { db } from "../src/lib/db";
import { user, permissionTemplates } from "../src/lib/schema";
import { eq, and, isNull, or } from "drizzle-orm";
import { logger } from "../src/lib/logger";

async function migrateEducatorTemplates() {
  console.log("Starting educator template migration...");
  console.log("=====================================");

  try {
    // Step 1: Get the default template
    const [defaultTemplate] = await db
      .select()
      .from(permissionTemplates)
      .where(and(
        eq(permissionTemplates.isDefault, true),
        eq(permissionTemplates.isActive, true)
      ))
      .limit(1);

    if (!defaultTemplate) {
      console.error("❌ No default template found!");
      console.log("Please run 'npx tsx scripts/seed-permission-templates.ts' first");
      process.exit(1);
    }

    console.log(`✓ Found default template: ${defaultTemplate.name} (${defaultTemplate.id})`);
    console.log();

    // Step 2: Get all educators without templates
    const educatorsWithoutTemplates = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        approvalStatus: user.approvalStatus,
        role: user.role,
        permissionTemplateId: user.permissionTemplateId
      })
      .from(user)
      .where(and(
        or(eq(user.role, "educator"), eq(user.role, "pending_educator")),
        isNull(user.permissionTemplateId)
      ));

    if (educatorsWithoutTemplates.length === 0) {
      console.log("✓ All educators already have templates assigned!");
      process.exit(0);
    }

    console.log(`Found ${educatorsWithoutTemplates.length} educators without templates:`);
    educatorsWithoutTemplates.forEach((educator, i) => {
      console.log(`  ${i + 1}. ${educator.name || "Unknown"} (${educator.email}) - ${educator.approvalStatus}`);
    });
    console.log();

    // Step 3: Ask for confirmation
    if (process.env.AUTO_CONFIRM !== "true") {
      console.log(`This will assign the "${defaultTemplate.name}" template to all educators without templates.`);
      console.log("Press Ctrl+C to cancel, or wait 5 seconds to continue...");
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    // Step 4: Update educators with default template
    console.log("Updating educators...");
    
    let successCount = 0;
    let failCount = 0;

    for (const educator of educatorsWithoutTemplates) {
      try {
        await db
          .update(user)
          .set({
            permissionTemplateId: defaultTemplate.id,
            permissions: defaultTemplate.permissions,
            updatedAt: new Date()
          })
          .where(eq(user.id, educator.id));

        successCount++;
        console.log(`  ✓ Updated ${educator.name || educator.email}`);
      } catch (error) {
        failCount++;
        console.error(`  ❌ Failed to update ${educator.name || educator.email}:`, error);
      }
    }

    console.log();
    console.log("Migration Summary:");
    console.log("==================");
    console.log(`✓ Successfully updated: ${successCount} educators`);
    if (failCount > 0) {
      console.log(`❌ Failed to update: ${failCount} educators`);
    }

    // Step 5: Verify the migration
    console.log();
    console.log("Verifying migration...");
    
    const remainingWithoutTemplates = await db
      .select({ count: user.id })
      .from(user)
      .where(and(
        or(eq(user.role, "educator"), eq(user.role, "pending_educator")),
        isNull(user.permissionTemplateId)
      ));

    if (remainingWithoutTemplates.length === 0) {
      console.log("✓ All educators now have templates assigned!");
    } else {
      console.log(`⚠ Warning: ${remainingWithoutTemplates.length} educators still without templates`);
    }

    // Step 6: Show current template usage
    console.log();
    console.log("Current Template Usage:");
    console.log("======================");
    
    // Get all templates
    const allTemplates = await db
      .select({
        id: permissionTemplates.id,
        name: permissionTemplates.name
      })
      .from(permissionTemplates)
      .where(eq(permissionTemplates.isActive, true));

    // Count educators for each template
    for (const template of allTemplates) {
      const [result] = await db
        .select({ count: user.id })
        .from(user)
        .where(and(
          or(eq(user.role, "educator"), eq(user.role, "pending_educator")),
          eq(user.permissionTemplateId, template.id)
        ));
      
      const count = Number(result?.count || 0);
      console.log(`  ${template.name}: ${count} educators`);
    }

    console.log();
    console.log("✓ Migration completed successfully!");
    
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }

  process.exit(0);
}

// Run the migration
migrateEducatorTemplates();