#!/usr/bin/env node

/**
 * Script to generate a bcrypt hash for the super admin password
 * Use this to create SUPER_ADMIN_PASSWORD_HASH for production
 */

const bcrypt = require('bcryptjs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('===========================================');
console.log('Super Admin Password Hash Generator');
console.log('===========================================\n');
console.log('This script will generate a bcrypt hash for your admin password.');
console.log('Use the generated hash as SUPER_ADMIN_PASSWORD_HASH in production.\n');

rl.question('Enter password to hash: ', async (password) => {
  if (!password || password.length < 8) {
    console.error('\nError: Password must be at least 8 characters long');
    rl.close();
    process.exit(1);
  }

  try {
    console.log('\nGenerating hash with cost factor 12 (recommended for production)...');
    const hash = await bcrypt.hash(password, 12);
    
    console.log('\n===========================================');
    console.log('PASSWORD HASH GENERATED SUCCESSFULLY');
    console.log('===========================================\n');
    console.log('Add this to your environment variables:\n');
    console.log(`SUPER_ADMIN_PASSWORD_HASH=${hash}\n`);
    console.log('For Vercel deployment:');
    console.log('1. Go to your project settings in Vercel dashboard');
    console.log('2. Navigate to Environment Variables');
    console.log('3. Add SUPER_ADMIN_PASSWORD_HASH with the above value');
    console.log('4. Make sure to also set:');
    console.log('   - SUPER_ADMIN_EMAIL (your admin email)');
    console.log('   - SUPER_ADMIN_SECRET_KEY (a random 32+ character string)');
    console.log('\nIMPORTANT: Do NOT use SUPER_ADMIN_PASSWORD in production.');
    console.log('Always use the hash (SUPER_ADMIN_PASSWORD_HASH) for security.\n');
    
    // Verify the hash works
    const isValid = await bcrypt.compare(password, hash);
    console.log('Hash verification:', isValid ? '✓ Success' : '✗ Failed');
    
    rl.close();
    process.exit(0);
  } catch (error) {
    console.error('\nError generating hash:', error.message);
    rl.close();
    process.exit(1);
  }
});