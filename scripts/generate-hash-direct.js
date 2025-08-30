#!/usr/bin/env node

/**
 * Generate Password Hash Directly
 */

const bcrypt = require('bcryptjs');

async function generateHash() {
  const password = 'SuperAdmin@2024!Secure';
  const hash = await bcrypt.hash(password, 12);
  
  console.log('🔐 Production Environment Variables Needed:\n');
  console.log('=' .repeat(60));
  console.log('\nAdd these to your production environment (Vercel/Railway/etc):\n');
  console.log('SUPER_ADMIN_EMAIL=admin@biblequiz.app');
  console.log(`SUPER_ADMIN_PASSWORD_HASH=${hash}`);
  console.log('SUPER_ADMIN_SECRET_KEY=FvCt6P8LHptMJNyVYXFYPMqniUrZnH2n');
  console.log('\n=' .repeat(60));
  console.log('\n⚠️  IMPORTANT:');
  console.log('- Use SUPER_ADMIN_PASSWORD_HASH (not SUPER_ADMIN_PASSWORD) in production');
  console.log('- This is more secure than storing plain text passwords');
  console.log('\n✅ Login credentials after setting these:');
  console.log('Email: admin@biblequiz.app');
  console.log('Password: SuperAdmin@2024!Secure');
}

generateHash().catch(console.error);