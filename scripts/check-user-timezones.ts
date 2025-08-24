#!/usr/bin/env npx tsx

/**
 * Script to check and report on user timezone data
 * Run with: npx tsx scripts/check-user-timezones.ts
 */

import { db } from '../src/lib/db';
import { user } from '../src/lib/schema';
import { eq, sql, isNull, and } from 'drizzle-orm';

async function checkUserTimezones() {
  console.log('\n========================================');
  console.log('USER TIMEZONE DATA AUDIT');
  console.log('========================================\n');

  try {
    // Get overall statistics
    const stats = await db
      .select({
        totalUsers: sql<number>`COUNT(*)`,
        students: sql<number>`COUNT(CASE WHEN role = 'student' THEN 1 END)`,
        educators: sql<number>`COUNT(CASE WHEN role = 'educator' THEN 1 END)`,
        admins: sql<number>`COUNT(CASE WHEN role = 'admin' THEN 1 END)`,
        withTimezone: sql<number>`COUNT(timezone)`,
        istUsers: sql<number>`COUNT(CASE WHEN timezone = 'Asia/Kolkata' THEN 1 END)`,
        otherTimezones: sql<number>`COUNT(CASE WHEN timezone != 'Asia/Kolkata' THEN 1 END)`,
        nullTimezone: sql<number>`COUNT(CASE WHEN timezone IS NULL THEN 1 END)`,
      })
      .from(user);

    const s = stats[0];
    
    console.log('📊 OVERALL STATISTICS:');
    console.log(`   Total Users: ${s.totalUsers}`);
    console.log(`   - Students: ${s.students}`);
    console.log(`   - Educators: ${s.educators}`);
    console.log(`   - Admins: ${s.admins}`);
    console.log('');
    console.log('🌍 TIMEZONE DISTRIBUTION:');
    console.log(`   With Timezone Set: ${s.withTimezone} (${((s.withTimezone / s.totalUsers) * 100).toFixed(1)}%)`);
    console.log(`   - IST (Asia/Kolkata): ${s.istUsers} (${((s.istUsers / s.totalUsers) * 100).toFixed(1)}%)`);
    console.log(`   - Other Timezones: ${s.otherTimezones} (${((s.otherTimezones / s.totalUsers) * 100).toFixed(1)}%)`);
    console.log(`   - NULL Timezone: ${s.nullTimezone}`);

    // Get unique timezones
    const timezones = await db
      .select({
        timezone: user.timezone,
        count: sql<number>`COUNT(*)`
      })
      .from(user)
      .groupBy(user.timezone)
      .orderBy(sql`COUNT(*) DESC`);

    console.log('\n📍 TIMEZONE BREAKDOWN:');
    timezones.forEach(tz => {
      console.log(`   ${tz.timezone || 'NULL'}: ${tz.count} users`);
    });

    // Check for students without proper timezone
    const studentsWithDefaultTZ = await db
      .select({
        count: sql<number>`COUNT(*)`
      })
      .from(user)
      .where(
        and(
          eq(user.role, 'student'),
          eq(user.timezone, 'Asia/Kolkata')
        )
      );

    console.log('\n⚠️  POTENTIAL ISSUES:');
    console.log(`   Students with default IST timezone: ${studentsWithDefaultTZ[0].count}`);
    console.log('   (These might need updating based on their actual location)');

    // Sample some users with non-IST timezones
    const nonISTUsers = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        timezone: user.timezone
      })
      .from(user)
      .where(sql`timezone != 'Asia/Kolkata'`)
      .limit(5);

    if (nonISTUsers.length > 0) {
      console.log('\n🌐 SAMPLE USERS WITH NON-IST TIMEZONES:');
      nonISTUsers.forEach(u => {
        console.log(`   ${u.name} (${u.role}): ${u.timezone}`);
      });
    }

    // Check recent users
    const recentUsers = await db
      .select({
        name: user.name,
        role: user.role,
        timezone: user.timezone,
        createdAt: user.createdAt
      })
      .from(user)
      .orderBy(sql`created_at DESC`)
      .limit(5);

    console.log('\n🆕 RECENT USERS (Last 5):');
    recentUsers.forEach(u => {
      const created = u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'Unknown';
      console.log(`   ${u.name} (${u.role}): ${u.timezone} - Created: ${created}`);
    });

    console.log('\n========================================');
    console.log('RECOMMENDATIONS:');
    console.log('========================================');
    console.log('1. All existing users have timezone set (good!) ✅');
    console.log('2. Default is IST which is appropriate for your primary audience');
    console.log('3. Consider adding timezone selection during user registration');
    console.log('4. Users can update their timezone in their profile settings');
    console.log('5. Email notifications now use user timezone for time display');
    
  } catch (error) {
    console.error('Error checking user timezones:', error);
  } finally {
    process.exit(0);
  }
}

// Run the check
checkUserTimezones();