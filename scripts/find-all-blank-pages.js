require('dotenv').config();
const fs = require('fs');
const path = require('path');

console.log('\n=== FINDING ALL BLANK PAGE ISSUES ===\n');

// Critical files to check based on audit
const criticalFiles = [
  '/src/app/educator/groups/[id]/page.tsx',
  '/src/app/quiz/share/[shareCode]/page.tsx', // Already fixed but verify
  '/src/app/student/quiz/[id]/ImprovedQuizPage.tsx',
  '/src/app/educator/quiz/[id]/review/ReviewPageSingleQuestion.tsx',
  '/src/app/admin/(protected)/students/[id]/page.tsx',
  '/src/app/admin/(protected)/educators/[id]/page.tsx',
];

const issues = [];

criticalFiles.forEach(file => {
  const fullPath = path.join(process.cwd(), file);
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${file}`);
    return;
  }
  
  const content = fs.readFileSync(fullPath, 'utf8');
  const lines = content.split('\n');
  
  // Find problematic patterns
  lines.forEach((line, index) => {
    const lineNum = index + 1;
    
    // Check for return null in component body (not in helper functions)
    if (line.trim() === 'return null;' || line.trim() === 'return null') {
      // Check context - is this in a main component or page?
      const prevLines = lines.slice(Math.max(0, index - 20), index).join('\n');
      const isInPageComponent = prevLines.includes('export default') || 
                                prevLines.includes('Page(') || 
                                prevLines.includes('Component(');
      
      if (isInPageComponent) {
        issues.push({
          file,
          line: lineNum,
          code: line.trim(),
          severity: 'CRITICAL',
          fix: 'Replace with error UI component'
        });
      }
    }
    
    // Check for empty returns
    if (line.trim() === 'return;') {
      issues.push({
        file,
        line: lineNum,
        code: line.trim(),
        severity: 'HIGH',
        fix: 'Add proper return value or error handling'
      });
    }
    
    // Check for conditional nulls that might cause blank
    if (line.includes('? null :') || line.includes('&& null')) {
      issues.push({
        file,
        line: lineNum,
        code: line.trim(),
        severity: 'MEDIUM',
        fix: 'Replace null with proper fallback UI'
      });
    }
  });
});

// Report findings
if (issues.length === 0) {
  console.log('✅ No critical blank page issues found!');
} else {
  console.log(`🚨 Found ${issues.length} potential blank page issues:\n`);
  
  // Group by severity
  const critical = issues.filter(i => i.severity === 'CRITICAL');
  const high = issues.filter(i => i.severity === 'HIGH');
  const medium = issues.filter(i => i.severity === 'MEDIUM');
  
  if (critical.length > 0) {
    console.log('❌ CRITICAL ISSUES (Will definitely cause blank pages):\n');
    critical.forEach(issue => {
      console.log(`   ${issue.file}:${issue.line}`);
      console.log(`   Code: ${issue.code}`);
      console.log(`   Fix: ${issue.fix}\n`);
    });
  }
  
  if (high.length > 0) {
    console.log('⚠️  HIGH PRIORITY ISSUES:\n');
    high.forEach(issue => {
      console.log(`   ${issue.file}:${issue.line}`);
      console.log(`   Code: ${issue.code}`);
      console.log(`   Fix: ${issue.fix}\n`);
    });
  }
  
  if (medium.length > 0) {
    console.log('⚠️  MEDIUM PRIORITY ISSUES:\n');
    medium.slice(0, 5).forEach(issue => { // Show first 5
      console.log(`   ${issue.file}:${issue.line}`);
      console.log(`   Code: ${issue.code}`);
      console.log(`   Fix: ${issue.fix}\n`);
    });
    if (medium.length > 5) {
      console.log(`   ... and ${medium.length - 5} more\n`);
    }
  }
}

// Create fix recommendations
console.log('\n📝 FIX TEMPLATE:\n');
console.log('Replace all "return null;" in page components with:');
console.log(`
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100 p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Unable to Load Content
            </h2>
            <p className="text-gray-600 mb-4">
              The requested content could not be loaded. Please try refreshing the page.
            </p>
            <div className="space-y-2">
              <Button 
                onClick={() => window.location.reload()} 
                className="w-full bg-amber-600 hover:bg-amber-700"
              >
                Refresh Page
              </Button>
              <Link href="/">
                <Button variant="outline" className="w-full">Go to Home</Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
`);

console.log('\n✅ Analysis complete!');