// Simple script to check JAhez user timezone
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUserTimezone() {
  console.log('Checking timezone for users with "JAhez" in name...\n');
  
  const { data, error } = await supabase
    .from('user')
    .select('id, name, email, timezone, role')
    .ilike('name', '%jahez%');
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  if (data && data.length > 0) {
    console.log('Found users:');
    data.forEach(user => {
      console.log(`
Name: ${user.name}
Role: ${user.role}
Timezone: ${user.timezone}
Email: ${user.email}
ID: ${user.id}
---`);
    });
    
    // Check if all have default IST
    const allIST = data.every(u => u.timezone === 'Asia/Kolkata');
    if (allIST) {
      console.log('\n⚠️  All matching users have the default IST timezone (Asia/Kolkata)');
      console.log('This is expected for existing users after the migration.');
    }
  } else {
    console.log('No users found with "JAhez" in their name');
  }
  
  // Also check overall stats
  const { data: stats, error: statsError } = await supabase
    .from('user')
    .select('timezone')
    .eq('role', 'student');
  
  if (!statsError && stats) {
    const total = stats.length;
    const istCount = stats.filter(s => s.timezone === 'Asia/Kolkata').length;
    const otherCount = total - istCount;
    
    console.log('\n📊 Overall Student Timezone Stats:');
    console.log(`Total Students: ${total}`);
    console.log(`IST (Asia/Kolkata): ${istCount} (${((istCount/total)*100).toFixed(1)}%)`);
    console.log(`Other Timezones: ${otherCount} (${((otherCount/total)*100).toFixed(1)}%)`);
  }
}

checkUserTimezone().then(() => process.exit(0));