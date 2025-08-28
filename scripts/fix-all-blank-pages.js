const fs = require('fs');
const path = require('path');
const glob = require('glob');

console.log('\n=== AUTOMATIC BLANK PAGE FIX REPORT ===\n');

// Find all page files
const pageFiles = glob.sync('src/app/**/page.{tsx,jsx}', { 
  ignore: ['**/node_modules/**'] 
});

const componentFiles = glob.sync('src/app/**/*.tsx', { 
  ignore: ['**/node_modules/**', '**/page.tsx'] 
});

const allFiles = [...pageFiles, ...componentFiles];

console.log(`Checking ${pageFiles.length} page files and ${componentFiles.length} component files...\n`);

const fixesNeeded = [];
const fixesApplied = [];

allFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  
  // Check if file already imports ErrorFallback
  const hasErrorFallback = content.includes('ErrorFallback');
  
  lines.forEach((line, index) => {
    const lineNum = index + 1;
    
    // Find problematic patterns
    if (line.trim() === 'return null;' || line.trim() === 'return null') {
      // Check if it's in a main render function (not a helper)
      const prevLines = lines.slice(Math.max(0, index - 30), index).join('\n');
      const nextLines = lines.slice(index, Math.min(lines.length, index + 10)).join('\n');
      
      // Heuristics to detect if this is a component render
      const isMainRender = 
        prevLines.includes('export default') ||
        prevLines.includes('export function') ||
        prevLines.includes('function Page') ||
        prevLines.includes('const Page') ||
        (prevLines.includes('if (') && nextLines.includes('return ('));
      
      if (isMainRender) {
        fixesNeeded.push({
          file,
          line: lineNum,
          code: line.trim(),
          hasErrorFallback,
          type: 'return_null',
          isPage: file.includes('/page.')
        });
      }
    }
  });
});

// Generate fix report
console.log('📊 SUMMARY:\n');
console.log(`Total files scanned: ${allFiles.length}`);
console.log(`Files needing fixes: ${new Set(fixesNeeded.map(f => f.file)).size}`);
console.log(`Total issues found: ${fixesNeeded.length}\n`);

if (fixesNeeded.length > 0) {
  console.log('🔧 FILES REQUIRING IMMEDIATE FIX:\n');
  
  // Group by file
  const byFile = {};
  fixesNeeded.forEach(fix => {
    if (!byFile[fix.file]) byFile[fix.file] = [];
    byFile[fix.file].push(fix);
  });
  
  // Sort by priority (pages first)
  const sortedFiles = Object.keys(byFile).sort((a, b) => {
    const aIsPage = a.includes('/page.');
    const bIsPage = b.includes('/page.');
    if (aIsPage && !bIsPage) return -1;
    if (!aIsPage && bIsPage) return 1;
    return 0;
  });
  
  sortedFiles.forEach(file => {
    const fixes = byFile[file];
    const isPage = file.includes('/page.');
    const priority = isPage ? '🚨 CRITICAL' : '⚠️  HIGH';
    
    console.log(`${priority}: ${file}`);
    fixes.forEach(fix => {
      console.log(`  Line ${fix.line}: ${fix.code}`);
    });
    
    if (!fixes[0].hasErrorFallback) {
      console.log('  📝 Action: Add import { ErrorFallback } from "@/components/ui/error-fallback"');
    }
    console.log('  📝 Action: Replace return null with ErrorFallback component');
    console.log('');
  });
  
  // Generate fix commands
  console.log('🛠️  AUTOMATED FIX INSTRUCTIONS:\n');
  console.log('1. For each file listed above:');
  console.log('   a. Add the ErrorFallback import if missing');
  console.log('   b. Replace return null with appropriate ErrorFallback');
  console.log('');
  console.log('2. Example fixes based on context:\n');
  
  console.log('For pages showing "not found":');
  console.log(`
  return (
    <ErrorFallback
      title="Page Not Found"
      message="The page you're looking for doesn't exist."
      redirectUrl="/"
      redirectLabel="Go to Home"
    />
  );
`);

  console.log('For data loading failures:');
  console.log(`
  return (
    <ErrorFallback
      title="Unable to Load Data"
      message="There was an error loading the requested data."
      showRefresh={true}
    />
  );
`);

  console.log('For permission errors:');
  console.log(`
  return (
    <ErrorFallback
      title="Access Denied"
      message="You don't have permission to view this content."
      redirectUrl="/dashboard"
      redirectLabel="Back to Dashboard"
    />
  );
`);
}

// Check for other risky patterns
console.log('\n⚠️  OTHER RISKY PATTERNS FOUND:\n');

const riskyPatterns = [
  { 
    pattern: /^\s*return\s*;/gm, 
    description: 'Empty return statements',
    severity: 'HIGH'
  },
  {
    pattern: /\?\s*null\s*:\s*\(/g,
    description: 'Ternary operators returning null',
    severity: 'MEDIUM'
  },
  {
    pattern: /&&\s*\(/g,
    description: 'Conditional rendering without fallback',
    severity: 'LOW'
  }
];

const riskyFiles = new Set();

allFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  
  riskyPatterns.forEach(({ pattern, description }) => {
    if (pattern.test(content)) {
      riskyFiles.add(file);
    }
  });
});

if (riskyFiles.size > 0) {
  console.log(`Found ${riskyFiles.size} files with risky patterns that might cause UI issues`);
  console.log('Consider reviewing these files for proper error handling.\n');
}

// Create a fix status file
const fixStatus = {
  timestamp: new Date().toISOString(),
  filesScanned: allFiles.length,
  issuesFound: fixesNeeded.length,
  criticalPages: fixesNeeded.filter(f => f.isPage).length,
  filesNeedingFix: Object.keys(byFile || {}).length,
  details: fixesNeeded
};

fs.writeFileSync(
  'blank-page-fix-report.json',
  JSON.stringify(fixStatus, null, 2)
);

console.log('📄 Detailed report saved to: blank-page-fix-report.json\n');

// Final recommendations
console.log('✅ RECOMMENDATIONS:\n');
console.log('1. IMMEDIATE: Fix all CRITICAL page components first');
console.log('2. HIGH: Fix all HIGH priority components');  
console.log('3. IMPLEMENT: Add ErrorBoundary wrapper to catch runtime errors');
console.log('4. TEST: Manually test each fixed page for proper error display');
console.log('5. MONITOR: Set up error tracking to catch future issues\n');

console.log('🎯 Next Steps:');
console.log('1. Run: npm run build to check for TypeScript errors');
console.log('2. Test the Amos quiz link after fixes');
console.log('3. Deploy fixes to production\n');