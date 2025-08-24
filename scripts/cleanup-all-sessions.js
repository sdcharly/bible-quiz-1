#!/usr/bin/env node

/**
 * Complete Session Cleanup Script
 * WARNING: This script will DELETE ALL sessions from the database
 * Use this for a complete fresh start of the session system
 */

const postgres = require('postgres');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL or POSTGRES_URL not found in environment variables');
  console.error('   Please ensure your .env or .env.local file contains DATABASE_URL or POSTGRES_URL');
  process.exit(1);
}

async function cleanupAllSessions() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║         COMPLETE SESSION CLEANUP UTILITY               ║');
  console.log('║         WARNING: This will DELETE ALL sessions         ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log('');
  
  const sql = postgres(DATABASE_URL);
  
  try {
    // 1. Check current session count
    console.log('📊 Analyzing current session state...');
    const sessionStats = await sql`
      SELECT 
        COUNT(*) as total_count,
        COUNT(DISTINCT "userId") as unique_users,
        COUNT(CASE WHEN "expiresAt" > NOW() THEN 1 END) as active_count,
        COUNT(CASE WHEN "expiresAt" <= NOW() THEN 1 END) as expired_count,
        MIN("createdAt") as oldest_session,
        MAX("createdAt") as newest_session
      FROM session
    `;
    
    const stats = sessionStats[0];
    console.log('');
    console.log('📈 Current Session Statistics:');
    console.log('   ├─ Total sessions: ' + stats.total_count);
    console.log('   ├─ Unique users: ' + stats.unique_users);
    console.log('   ├─ Active sessions: ' + stats.active_count);
    console.log('   ├─ Expired sessions: ' + stats.expired_count);
    
    if (stats.oldest_session) {
      console.log('   ├─ Oldest session: ' + new Date(stats.oldest_session).toLocaleString());
    }
    if (stats.newest_session) {
      console.log('   └─ Newest session: ' + new Date(stats.newest_session).toLocaleString());
    }
    console.log('');
    
    if (stats.total_count == 0) {
      console.log('✅ No sessions found. Database is already clean!');
      await sql.end();
      return;
    }
    
    // 2. Check for active quiz attempts
    console.log('🎯 Checking for active quiz attempts...');
    const activeQuizzes = await sql`
      SELECT 
        COUNT(*) as count
      FROM quiz_attempts
      WHERE status = 'in_progress'
    `;
    
    if (activeQuizzes[0].count > 0) {
      console.log('   ⚠️  Warning: Found ' + activeQuizzes[0].count + ' active quiz attempts');
      console.log('   These may be affected by session cleanup.');
    } else {
      console.log('   ✓ No active quiz attempts found');
    }
    console.log('');
    
    // 3. Perform the cleanup
    console.log('🗑️  DELETING ALL SESSIONS...');
    console.log('');
    
    // Delete ALL sessions
    const deleteResult = await sql`
      DELETE FROM session
      RETURNING id
    `;
    
    const deletedCount = deleteResult.length;
    
    console.log('   ✅ Successfully deleted ' + deletedCount + ' sessions');
    console.log('');
    
    // 4. Verify cleanup
    console.log('🔍 Verifying cleanup...');
    const verification = await sql`
      SELECT COUNT(*) as remaining FROM session
    `;
    
    if (verification[0].remaining == 0) {
      console.log('   ✅ Verification successful: Database is clean');
      console.log('');
      
      // 5. Optimize table
      console.log('🔧 Optimizing database table...');
      try {
        await sql`VACUUM ANALYZE session`;
        console.log('   ✅ Table optimized successfully');
      } catch (e) {
        console.log('   ℹ️  Table optimization skipped (requires superuser)');
      }
      console.log('');
      
      // Success summary
      console.log('╔════════════════════════════════════════════════════════╗');
      console.log('║            🎉 CLEANUP COMPLETED SUCCESSFULLY! 🎉        ║');
      console.log('╚════════════════════════════════════════════════════════╝');
      console.log('');
      console.log('✨ Summary:');
      console.log('   • Removed all ' + deletedCount + ' sessions');
      console.log('   • Database is completely clean');
      console.log('   • Session system ready for fresh start');
      console.log('');
      console.log('📋 Next Steps:');
      console.log('   1. Restart your application server');
      console.log('   2. Clear browser cookies and cache');
      console.log('   3. All users will need to log in again');
      console.log('   4. Test student login for new session creation');
      console.log('');
      console.log('💡 Tips:');
      console.log('   • Sessions will be managed automatically going forward');
      console.log('   • Idle timeout: 30 minutes for students');
      console.log('   • Quiz sessions: Extended to 3 hours');
      console.log('   • Cleanup job runs every 10 minutes automatically');
      console.log('');
      
    } else {
      console.log('   ⚠️  Warning: ' + verification[0].remaining + ' sessions still remain');
      console.log('   Please run the script again or check manually');
      console.log('');
    }
    
  } catch (error) {
    console.error('');
    console.error('❌ ERROR during cleanup:');
    console.error('   ' + error.message);
    console.error('');
    console.error('Troubleshooting:');
    console.error('   1. Check DATABASE_URL is correct');
    console.error('   2. Ensure database is accessible');
    console.error('   3. Verify you have DELETE permissions');
    console.error('   4. Check if session table exists');
    console.error('');
    process.exit(1);
  } finally {
    await sql.end();
  }
}

// Add confirmation prompt
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('');
console.log('⚠️  WARNING: This will DELETE ALL sessions from the database!');
console.log('   All users will be logged out and need to sign in again.');
console.log('');

rl.question('Are you sure you want to continue? (yes/no): ', (answer) => {
  if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
    rl.close();
    cleanupAllSessions().catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
  } else {
    console.log('');
    console.log('✅ Cleanup cancelled. No changes were made.');
    console.log('');
    rl.close();
    process.exit(0);
  }
});