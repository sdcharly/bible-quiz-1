#!/usr/bin/env node
/**
 * Script to generate bcrypt hash for super admin password
 * Usage: node scripts/generate-admin-password-hash.js "YourPasswordHere"
 * 
 * The generated hash should be stored in SUPER_ADMIN_PASSWORD_HASH environment variable
 * for production use, instead of storing the plain text password.
 */

const bcrypt = require('bcryptjs');

async function generateHash() {
  const password = process.argv[2];
  
  if (!password) {
    console.error('❌ Please provide a password as an argument');
    console.log('Usage: node scripts/generate-admin-password-hash.js "YourPasswordHere"');
    process.exit(1);
  }
  
  if (password.length < 12) {
    console.warn('⚠️  Warning: Password should be at least 12 characters for security');
  }
  
  try {
    const hash = await bcrypt.hash(password, 12);
    console.log('\n✅ Password hash generated successfully!\n');
    console.log('Add this to your .env file:');
    console.log('----------------------------------------');
    console.log(`SUPER_ADMIN_PASSWORD_HASH="${hash}"`);
    console.log('----------------------------------------');
    console.log('\n🔒 Security Notes:');
    console.log('1. Use SUPER_ADMIN_PASSWORD_HASH in production instead of SUPER_ADMIN_PASSWORD');
    console.log('2. Never commit the plain text password to version control');
    console.log('3. Keep this hash secure and rotate it regularly');
    console.log('4. Consider using a password manager for the original password\n');
  } catch (error) {
    console.error('❌ Error generating hash:', error.message);
    process.exit(1);
  }
}

generateHash();