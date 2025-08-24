#!/usr/bin/env npx tsx

/**
 * Script to find JAhez user details
 * Run with: npm run dev (in another terminal), then: npx tsx scripts/find-jahez-user.ts
 */

async function findJahezUser() {
  try {
    // Make sure dev server is running on port 3000
    const response = await fetch('http://localhost:3000/api/debug/check-timezones');
    
    if (!response.ok) {
      console.error('Error: Make sure dev server is running (npm run dev)');
      return;
    }
    
    const data = await response.json();
    
    console.log('\n========================================');
    console.log('SEARCHING FOR JAHEZ USER');
    console.log('========================================\n');
    
    if (data.jahezUsers && data.jahezUsers !== "No users found with 'JAhez' in name") {
      console.log('✅ FOUND USER(S) WITH "JAHEZ" IN NAME:\n');
      
      if (Array.isArray(data.jahezUsers)) {
        data.jahezUsers.forEach((user: any, index: number) => {
          console.log(`User ${index + 1}:`);
          console.log('─'.repeat(40));
          console.log(`Full Name:  ${user.name}`);
          console.log(`Email:      ${user.email}`);
          console.log(`Role:       ${user.role}`);
          console.log(`Timezone:   ${user.timezone}`);
          console.log(`User ID:    ${user.id}`);
          console.log('');
        });
      } else {
        console.log(data.jahezUsers);
      }
    } else {
      console.log('❌ No users found with "JAhez" in their name');
      console.log('\nPossible reasons:');
      console.log('1. User might be spelled differently (Jahaz, Jahez, etc.)');
      console.log('2. User might not exist in the database');
      console.log('3. Case sensitivity issue');
    }
    
    // Show overall statistics
    if (data.statistics) {
      console.log('\n📊 OVERALL DATABASE STATISTICS:');
      console.log('─'.repeat(40));
      console.log(`Total Users:     ${data.statistics.totalUsers}`);
      console.log(`Total Students:  ${data.statistics.students}`);
      console.log(`IST Timezone:    ${data.statistics.istUsers} users`);
      console.log(`NULL Timezone:   ${data.statistics.nullTimezone} users`);
    }
    
    // Show recent students for reference
    if (data.recentStudents && data.recentStudents.length > 0) {
      console.log('\n📝 RECENT STUDENTS (for reference):');
      console.log('─'.repeat(40));
      data.recentStudents.forEach((student: any) => {
        console.log(`- ${student.name} (Timezone: ${student.timezone})`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
    console.log('\nTroubleshooting:');
    console.log('1. Make sure dev server is running: npm run dev');
    console.log('2. Wait for server to fully start');
    console.log('3. Then run this script: npx tsx scripts/find-jahez-user.ts');
  }
}

// Run the search
findJahezUser();