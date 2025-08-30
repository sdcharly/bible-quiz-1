#!/usr/bin/env node

/**
 * Generate Password Hash for Production Admin
 * 
 * Use this to generate a bcrypt hash for your admin password
 * to set in production environment variables
 */

const bcrypt = require('bcryptjs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🔐 Admin Password Hash Generator\n');
console.log('=' .repeat(50));
console.log('\nThis tool generates a bcrypt hash for your admin password.');
console.log('Use the generated hash as SUPER_ADMIN_PASSWORD_HASH in production.\n');

rl.question('Enter the admin password (or press Enter for default): ', async (password) => {
  const adminPassword = password || 'SuperAdmin@2024!Secure';
  
  console.log('\n⏳ Generating hash...\n');
  
  try {
    // Generate hash with cost factor 12 (same as in admin-auth.ts)
    const hash = await bcrypt.hash(adminPassword, 12);
    
    console.log('✅ Hash generated successfully!\n');
    console.log('=' .repeat(50));
    console.log('\n📋 Add these to your production environment variables:\n');
    console.log('SUPER_ADMIN_EMAIL=admin@biblequiz.app');
    console.log(`SUPER_ADMIN_PASSWORD_HASH=${hash}`);
    console.log('SUPER_ADMIN_SECRET_KEY=FvCt6P8LHptMJNyVYXFYPMqniUrZnH2n');
    console.log('\n⚠️  Important: Use SUPER_ADMIN_PASSWORD_HASH (not SUPER_ADMIN_PASSWORD) in production');
    console.log('\n=' .repeat(50));
    
    if (adminPassword === 'SuperAdmin@2024!Secure') {
      console.log('\n📝 Note: You used the default password.');
      console.log('Login credentials will be:');
      console.log('Email: admin@biblequiz.app');
      console.log('Password: SuperAdmin@2024!Secure');
    } else {
      console.log('\n📝 Note: You set a custom password.');
      console.log('Login credentials will be:');
      console.log('Email: admin@biblequiz.app');
      console.log('Password: [The password you just entered]');
    }
    
    console.log('\n🚀 Next steps:');
    console.log('1. Update these environment variables in your production deployment');
    console.log('2. Restart/redeploy your application');
    console.log('3. Test login at https://biblequiz.textr.in/admin/login');
    
  } catch (error) {
    console.error('❌ Error generating hash:', error.message);
  }
  
  rl.close();
});

rl.on('close', () => {
  console.log('\n');
  process.exit(0);
});