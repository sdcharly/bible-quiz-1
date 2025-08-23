#!/usr/bin/env tsx

/**
 * Phase 6: Migration Script for Legacy Quizzes
 * 
 * This script ensures all existing quizzes have proper scheduling metadata
 * and are marked as 'legacy' to maintain backward compatibility
 */

import { db } from '../src/lib/db';
import { quizzes } from '../src/lib/schema';
import { sql } from 'drizzle-orm';
import { isNull } from 'drizzle-orm';

async function migrateLegacyQuizzes() {
  console.log('🔄 Starting Legacy Quiz Migration...\n');

  try {
    // Step 1: Count existing quizzes
    const totalQuizzes = await db
      .select({ count: sql<number>`count(*)` })
      .from(quizzes);
    
    console.log(`📊 Total quizzes in database: ${totalQuizzes[0].count}`);

    // Step 2: Find quizzes without scheduling status
    const legacyQuizzes = await db
      .select()
      .from(quizzes)
      .where(isNull(quizzes.schedulingStatus));

    console.log(`🔍 Found ${legacyQuizzes.length} quizzes without scheduling status\n`);

    if (legacyQuizzes.length === 0) {
      console.log('✅ All quizzes already have scheduling status. No migration needed.');
      return;
    }

    // Step 3: Update each legacy quiz
    console.log('📝 Updating legacy quizzes...');
    
    for (const quiz of legacyQuizzes) {
      // Create time configuration from existing data
      const timeConfig = {
        startTime: quiz.startTime?.toISOString(),
        timezone: quiz.timezone,
        duration: quiz.duration,
        configuredAt: quiz.createdAt?.toISOString(),
        configuredBy: quiz.educatorId,
        isLegacy: true
      };

      // Update the quiz
      await db
        .update(quizzes)
        .set({
          schedulingStatus: 'legacy',
          timeConfiguration: timeConfig,
          scheduledBy: quiz.educatorId,
          scheduledAt: quiz.createdAt,
          updatedAt: new Date()
        })
        .where(sql`${quizzes.id} = ${quiz.id}`);

      console.log(`  ✓ Updated quiz: ${quiz.title} (${quiz.id})`);
    }

    // Step 4: Verify migration
    console.log('\n🔍 Verifying migration...');
    
    const verificationCheck = await db
      .select({
        total: sql<number>`count(*)`,
        withStatus: sql<number>`count(${quizzes.schedulingStatus})`,
        legacy: sql<number>`count(case when ${quizzes.schedulingStatus} = 'legacy' then 1 end)`,
        deferred: sql<number>`count(case when ${quizzes.schedulingStatus} = 'deferred' then 1 end)`,
        scheduled: sql<number>`count(case when ${quizzes.schedulingStatus} = 'scheduled' then 1 end)`
      })
      .from(quizzes);

    const stats = verificationCheck[0];
    
    console.log('\n📊 Migration Statistics:');
    console.log(`  Total quizzes: ${stats.total}`);
    console.log(`  With scheduling status: ${stats.withStatus}`);
    console.log(`  Legacy mode: ${stats.legacy}`);
    console.log(`  Deferred mode: ${stats.deferred}`);
    console.log(`  Scheduled mode: ${stats.scheduled}`);
    
    if (stats.total === stats.withStatus) {
      console.log('\n✅ Migration completed successfully!');
      console.log('   All quizzes now have proper scheduling metadata.');
    } else {
      console.log('\n⚠️  Some quizzes may still need migration.');
      console.log(`   Missing: ${stats.total - stats.withStatus} quizzes`);
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
console.log('========================================');
console.log('   Legacy Quiz Migration Script');
console.log('   Phase 6: Backward Compatibility');
console.log('========================================\n');

migrateLegacyQuizzes()
  .then(() => {
    console.log('\n✨ Migration process complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });