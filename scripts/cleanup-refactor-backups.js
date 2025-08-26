#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('\n🧹 Cleanup Script for Refactoring Backup Files\n');

// Find all backup files
const backupFiles = execSync(
  'find src/app -name "*.backup.tsx" -o -name "*-old.tsx" -o -name "page-v2.tsx"',
  { cwd: '/Users/sunilcharly/simplequiz', encoding: 'utf-8' }
).trim().split('\n').filter(Boolean);

if (backupFiles.length === 0) {
  console.log('✅ No backup files found to clean up.');
  process.exit(0);
}

console.log(`Found ${backupFiles.length} backup files from refactoring:\n`);
backupFiles.forEach((file, index) => {
  console.log(`  ${index + 1}. ${file}`);
});

console.log('\n⚠️  These files were created during the refactoring process as backups.');
console.log('They are no longer needed since the refactoring is complete.\n');

// Ask for confirmation
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Do you want to delete these backup files? (yes/no): ', (answer) => {
  if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
    console.log('\n🗑️  Deleting backup files...\n');
    
    let deleted = 0;
    let failed = 0;
    
    backupFiles.forEach(file => {
      const fullPath = path.join('/Users/sunilcharly/simplequiz', file);
      try {
        fs.unlinkSync(fullPath);
        console.log(`  ✅ Deleted: ${file}`);
        deleted++;
      } catch (error) {
        console.log(`  ❌ Failed to delete: ${file} - ${error.message}`);
        failed++;
      }
    });
    
    console.log(`\n✨ Cleanup complete!`);
    console.log(`  - Deleted: ${deleted} files`);
    if (failed > 0) {
      console.log(`  - Failed: ${failed} files`);
    }
    
    // Also clean up any empty directories
    console.log('\n🔍 Checking for empty directories...');
    execSync('find src/app -type d -empty -delete', { 
      cwd: '/Users/sunilcharly/simplequiz' 
    });
    console.log('✅ Empty directories cleaned up.\n');
    
  } else {
    console.log('\n❌ Cleanup cancelled. No files were deleted.\n');
  }
  
  rl.close();
});