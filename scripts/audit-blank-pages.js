const fs = require('fs');
const path = require('path');
const glob = require('glob');

console.log('\n=== COMPREHENSIVE BLANK PAGE AUDIT ===\n');

// Patterns that might cause blank pages
const dangerousPatterns = [
  { pattern: /return\s+null\s*;/g, description: 'Returns null' },
  { pattern: /return\s*;/g, description: 'Empty return' },
  { pattern: /return\s+\(\s*\)\s*;/g, description: 'Returns empty parentheses' },
  { pattern: /return\s+<>\s*<\/>/g, description: 'Returns empty fragment' },
  { pattern: /^\s*}\s*$/gm, description: 'Empty component body' },
  { pattern: /if\s*\([^)]+\)\s*return\s*null/g, description: 'Conditional return null' },
  { pattern: /if\s*\([^)]+\)\s*return\s*;/g, description: 'Conditional empty return' },
  { pattern: /\?\s*null\s*:/g, description: 'Ternary with null' },
  { pattern: /\?\s*\(\s*\)\s*:/g, description: 'Ternary with empty' },
  { pattern: /&&\s*null/g, description: 'Conditional render with null' },
  { pattern: /\|\|\s*null/g, description: 'Fallback to null' }
];

// Files to check
const filePatterns = [
  'src/app/**/page.tsx',
  'src/app/**/page.jsx',
  'src/app/**/*.tsx',
  'src/components/**/*.tsx',
  'src/components/**/*.jsx'
];

const issues = [];
const criticalIssues = [];

// Function to check a file
function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const fileIssues = [];
  
  // Check each pattern
  dangerousPatterns.forEach(({ pattern, description }) => {
    let match;
    const regex = new RegExp(pattern.source, pattern.flags);
    
    while ((match = regex.exec(content)) !== null) {
      const lineNum = content.substring(0, match.index).split('\n').length;
      const line = lines[lineNum - 1];
      
      // Check if it's in a component (not a helper function)
      const isComponent = /^(export\s+)?(default\s+)?function\s+[A-Z]/.test(content.substring(0, match.index).split('\n').slice(-10).join('\n')) ||
                         /^(export\s+)?(default\s+)?const\s+[A-Z]/.test(content.substring(0, match.index).split('\n').slice(-10).join('\n'));
      
      // Check if it's a page component
      const isPage = filePath.includes('/page.tsx') || filePath.includes('/page.jsx');
      
      fileIssues.push({
        file: filePath,
        line: lineNum,
        pattern: description,
        code: line.trim(),
        isComponent,
        isPage,
        critical: isPage && description.includes('null')
      });
    }
  });
  
  return fileIssues;
}

// Check all files
console.log('Scanning files...\n');

filePatterns.forEach(pattern => {
  const files = glob.sync(pattern, { ignore: ['**/node_modules/**'] });
  
  files.forEach(file => {
    const fileIssues = checkFile(file);
    if (fileIssues.length > 0) {
      issues.push(...fileIssues);
      
      // Separate critical issues (page components returning null)
      const critical = fileIssues.filter(i => i.critical);
      if (critical.length > 0) {
        criticalIssues.push(...critical);
      }
    }
  });
});

// Report critical issues first
if (criticalIssues.length > 0) {
  console.log('🚨 CRITICAL: PAGE COMPONENTS THAT MIGHT SHOW BLANK SCREEN\n');
  console.log('These are the highest priority to fix:\n');
  
  criticalIssues.forEach(issue => {
    console.log(`❌ ${issue.file}:${issue.line}`);
    console.log(`   Pattern: ${issue.pattern}`);
    console.log(`   Code: ${issue.code}`);
    console.log('');
  });
}

// Group issues by file
const issuesByFile = {};
issues.forEach(issue => {
  if (!issuesByFile[issue.file]) {
    issuesByFile[issue.file] = [];
  }
  issuesByFile[issue.file].push(issue);
});

// Sort files by number of issues
const sortedFiles = Object.keys(issuesByFile)
  .sort((a, b) => issuesByFile[b].length - issuesByFile[a].length);

// Report top problematic files
console.log('\n📊 TOP FILES WITH POTENTIAL BLANK PAGE ISSUES\n');
sortedFiles.slice(0, 10).forEach(file => {
  const fileIssues = issuesByFile[file];
  const relPath = file.replace(process.cwd() + '/', '');
  console.log(`${relPath} (${fileIssues.length} issues)`);
  
  // Show unique pattern types
  const patterns = [...new Set(fileIssues.map(i => i.pattern))];
  patterns.forEach(p => {
    const count = fileIssues.filter(i => i.pattern === p).length;
    console.log(`  - ${p}: ${count}`);
  });
  console.log('');
});

// Summary statistics
console.log('\n📈 SUMMARY STATISTICS\n');
console.log(`Total files scanned: ${sortedFiles.length}`);
console.log(`Total potential issues: ${issues.length}`);
console.log(`Critical issues (page components): ${criticalIssues.length}`);
console.log(`Files with issues: ${Object.keys(issuesByFile).length}`);

// Pattern frequency
console.log('\n🔍 ISSUE FREQUENCY BY PATTERN\n');
const patternCounts = {};
issues.forEach(issue => {
  patternCounts[issue.pattern] = (patternCounts[issue.pattern] || 0) + 1;
});

Object.entries(patternCounts)
  .sort((a, b) => b[1] - a[1])
  .forEach(([pattern, count]) => {
    console.log(`${pattern}: ${count}`);
  });

// Check for missing error boundaries
console.log('\n🛡️ ERROR BOUNDARY CHECK\n');
const errorBoundaryFiles = glob.sync('src/**/*ErrorBoundary*.{tsx,jsx}', { ignore: ['**/node_modules/**'] });
if (errorBoundaryFiles.length === 0) {
  console.log('⚠️  WARNING: No error boundary components found!');
  console.log('   Error boundaries prevent entire app crashes');
} else {
  console.log(`✅ Found ${errorBoundaryFiles.length} error boundary component(s)`);
}

// Check for consistent loading states
console.log('\n⏳ LOADING STATE CHECK\n');
const loadingPatterns = [
  /if\s*\(.*loading.*\)\s*return\s*</g,
  /loading\s*\?\s*</g,
  /<.*Loader.*>/g,
  /<.*Loading.*>/g,
  /<.*Skeleton.*>/g
];

let filesWithLoading = 0;
let filesWithoutLoading = 0;

sortedFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const hasLoadingState = loadingPatterns.some(pattern => pattern.test(content));
  
  if (file.includes('/page.')) {
    if (hasLoadingState) {
      filesWithLoading++;
    } else {
      filesWithoutLoading++;
    }
  }
});

console.log(`Pages with loading states: ${filesWithLoading}`);
console.log(`Pages WITHOUT loading states: ${filesWithoutLoading}`);
if (filesWithoutLoading > 0) {
  console.log('⚠️  Some pages lack loading states - users might see blank/jumpy content');
}

// Recommendations
console.log('\n💡 RECOMMENDATIONS\n');
console.log('1. IMMEDIATE: Fix all critical issues (page components returning null)');
console.log('2. HIGH: Add proper error states instead of returning null');
console.log('3. MEDIUM: Implement loading skeletons for all async data fetching');
console.log('4. LOW: Consider adding error boundaries to prevent app crashes');
console.log('5. BEST PRACTICE: Always return meaningful UI, never null or undefined');

console.log('\n✅ Audit complete!\n');