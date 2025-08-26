#!/usr/bin/env node

/**
 * Script to verify admin credentials work correctly
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');

console.log('===========================================');
console.log('Admin Login Verification');
console.log('===========================================\n');

// Check environment variables
console.log('Environment Check:');
console.log('------------------');
console.log(`✓ SUPER_ADMIN_EMAIL: ${process.env.SUPER_ADMIN_EMAIL ? 'Set (' + process.env.SUPER_ADMIN_EMAIL + ')' : '✗ NOT SET'}`);
console.log(`✓ SUPER_ADMIN_PASSWORD: ${process.env.SUPER_ADMIN_PASSWORD ? 'Set (hidden)' : '✗ NOT SET'}`);
console.log(`✓ SUPER_ADMIN_PASSWORD_HASH: ${process.env.SUPER_ADMIN_PASSWORD_HASH ? 'Set (hash)' : '✗ NOT SET'}`);
console.log(`✓ SUPER_ADMIN_SECRET_KEY: ${process.env.SUPER_ADMIN_SECRET_KEY ? 'Set (hidden)' : '✗ NOT SET'}`);

if (!process.env.SUPER_ADMIN_EMAIL) {
  console.error('\n❌ ERROR: SUPER_ADMIN_EMAIL is not set in environment variables');
  process.exit(1);
}

if (!process.env.SUPER_ADMIN_PASSWORD && !process.env.SUPER_ADMIN_PASSWORD_HASH) {
  console.error('\n❌ ERROR: Neither SUPER_ADMIN_PASSWORD nor SUPER_ADMIN_PASSWORD_HASH is set');
  console.log('\nFor production, set SUPER_ADMIN_PASSWORD_HASH using:');
  console.log('  node scripts/admin-password-generator.js');
  process.exit(1);
}

if (!process.env.SUPER_ADMIN_SECRET_KEY) {
  console.error('\n❌ ERROR: SUPER_ADMIN_SECRET_KEY is not set');
  console.log('\nGenerate a random key using:');
  console.log('  openssl rand -base64 32');
  process.exit(1);
}

console.log('\n✅ All required environment variables are set\n');

// Test password verification
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Enter password to verify: ', async (testPassword) => {
  try {
    let isValid = false;
    
    if (process.env.SUPER_ADMIN_PASSWORD_HASH) {
      // Verify against hash
      isValid = await bcrypt.compare(testPassword, process.env.SUPER_ADMIN_PASSWORD_HASH);
      console.log('\nVerifying against SUPER_ADMIN_PASSWORD_HASH...');
    } else if (process.env.SUPER_ADMIN_PASSWORD) {
      // Compare against plain text (development only)
      isValid = testPassword === process.env.SUPER_ADMIN_PASSWORD;
      console.log('\nVerifying against SUPER_ADMIN_PASSWORD (plain text - development only)...');
    }
    
    if (isValid) {
      console.log('✅ Password verification SUCCESSFUL!\n');
      console.log('You should be able to login with:');
      console.log(`  Email: ${process.env.SUPER_ADMIN_EMAIL}`);
      console.log('  Password: [the password you just entered]');
    } else {
      console.log('❌ Password verification FAILED!\n');
      console.log('The password you entered does not match the configured credentials.');
      
      if (process.env.SUPER_ADMIN_PASSWORD && !process.env.SUPER_ADMIN_PASSWORD_HASH) {
        console.log('\n⚠️  WARNING: You are using plain text password (SUPER_ADMIN_PASSWORD)');
        console.log('For production, generate a hash using:');
        console.log('  node scripts/admin-password-generator.js');
      }
    }
    
    rl.close();
  } catch (error) {
    console.error('\n❌ Error during verification:', error.message);
    rl.close();
    process.exit(1);
  }
});