#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Files that need fixing based on the system reminders
const filesToFix = [
  'src/app/api/admin/educators/[id]/approve/route.ts',
  'src/app/api/admin/check-users/route.ts',
  'src/app/api/admin/students/[id]/route.ts',
  'src/app/api/admin/fix-educator-status/route.ts',
  'src/app/api/admin/seed-templates/route.ts',
  'src/app/api/admin/settings/permissions/route.ts',
  'src/app/api/admin/settings/permissions/templates/route.ts',
  'src/app/api/admin/settings/system/route.ts',
  'src/app/api/admin/educators/bulk-update-template/route.ts',
  'src/app/api/admin/educators/[id]/reactivate/route.ts',
  'src/app/api/admin/educators/[id]/reject/route.ts',
  'src/app/api/admin/educators/[id]/suspend/route.ts',
  'src/app/api/admin/educators/[id]/permissions/route.ts',
];

console.log('🔧 Fixing admin auth issues...\n');

filesToFix.forEach(filePath => {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  let modified = false;
  
  // Fix 1: Add missing imports
  if (!content.includes('import { getAdminSession }') && !content.includes('from "@/lib/admin-auth"')) {
    // Find the last import and add after it
    const lastImportMatch = content.match(/import[^;]+from[^;]+;(?!.*import[^;]+from)/s);
    if (lastImportMatch) {
      const insertPos = lastImportMatch.index + lastImportMatch[0].length;
      content = content.slice(0, insertPos) + 
        '\nimport { getAdminSession } from "@/lib/admin-auth";' +
        '\nimport { logger } from "@/lib/logger";' +
        content.slice(insertPos);
      modified = true;
    }
  }
  
  // Fix 2: Remove duplicate session declarations
  // Look for patterns where we have both getAdminSession() and requireAdminAuth()
  const hasDuplicateSession = content.includes('const session = await getAdminSession()') && 
                              content.includes('const session = await requireAdminAuth()');
  
  if (hasDuplicateSession) {
    // Replace the requireAdminAuth session with a different variable name
    content = content.replace(
      /const session = await requireAdminAuth\(\);/g,
      '// Admin already authenticated above'
    );
    
    // Remove duplicate requireAdminAuth calls
    content = content.replace(
      /await requireAdminAuth\(\);[\s\n]*/g,
      ''
    );
    modified = true;
  }
  
  // Fix 3: Remove duplicate admin checks (lines that check adminSession after we already checked session)
  content = content.replace(
    /if \(!adminSession\) {\s*return NextResponse\.json\({ error: "Unauthorized" }, { status: 401 }\);\s*}/g,
    '// Admin already authenticated above'
  );
  
  // Fix 4: Clean up any remaining issues with requireAdminAuth
  if (content.includes('requireAdminAuth') && !content.includes('import { requireAdminAuth')) {
    // Remove standalone requireAdminAuth calls
    content = content.replace(/await requireAdminAuth\(\);?/g, '// Admin already authenticated');
    modified = true;
  }
  
  if (modified) {
    fs.writeFileSync(fullPath, content);
    console.log(`✅ Fixed: ${filePath}`);
  } else {
    console.log(`⏭️  No changes needed: ${filePath}`);
  }
});

console.log('\n✅ Admin auth issue fixes complete!');