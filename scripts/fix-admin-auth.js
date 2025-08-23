#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// List of admin API routes that need auth (excluding login route)
const adminApiRoutes = [
  'src/app/api/admin/settings/permissions/route.ts',
  'src/app/api/admin/settings/permissions/templates/route.ts',
  'src/app/api/admin/settings/system/route.ts',
  'src/app/api/admin/educators/bulk-update-template/route.ts',
  'src/app/api/admin/educators/[id]/reactivate/route.ts',
  'src/app/api/admin/educators/[id]/reject/route.ts',
  'src/app/api/admin/educators/[id]/suspend/route.ts',
  'src/app/api/admin/educators/[id]/permissions/route.ts',
  'src/app/api/admin/educators/[id]/approve/route.ts',
  'src/app/api/admin/check-user/route.ts',
  'src/app/api/admin/check-users/route.ts',
  'src/app/api/admin/students/[id]/attach-educator/route.ts',
  'src/app/api/admin/students/[id]/route.ts',
  'src/app/api/admin/fix-educator-status/route.ts',
  'src/app/api/admin/seed-templates/route.ts',
];

console.log('🔒 Fixing admin API authentication...\n');

adminApiRoutes.forEach(filePath => {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  
  // Check if already has admin auth
  if (content.includes('getAdminSession') || content.includes('requireAdminApiAuth')) {
    console.log(`✅ Already protected: ${filePath}`);
    return;
  }
  
  // Add import for admin auth
  if (!content.includes("from \"@/lib/admin-auth\"")) {
    // Add after last import
    const lastImportMatch = content.match(/import[^;]+from[^;]+;(?!.*import[^;]+from)/s);
    if (lastImportMatch) {
      const insertPos = lastImportMatch.index + lastImportMatch[0].length;
      content = content.slice(0, insertPos) + 
        '\nimport { getAdminSession } from "@/lib/admin-auth";' +
        '\nimport { logger } from "@/lib/logger";' +
        content.slice(insertPos);
    }
  }
  
  // Find the first exported function (GET, POST, PUT, DELETE, PATCH)
  const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
  let modified = false;
  
  methods.forEach(method => {
    const regex = new RegExp(`export\\s+async\\s+function\\s+${method}\\s*\\([^)]*\\)\\s*{`, 'g');
    if (regex.test(content)) {
      // Add auth check at the beginning of the function
      content = content.replace(regex, (match) => {
        modified = true;
        return match + `
  // Verify admin authentication
  const session = await getAdminSession();
  if (!session) {
    logger.warn("Unauthorized admin API access attempt to ${filePath}");
    return NextResponse.json(
      { error: "Unauthorized - Admin access required" },
      { status: 401 }
    );
  }
  logger.log(\`Admin \${session.email} accessing ${method} ${filePath}\`);
`;
      });
    }
  });
  
  if (modified) {
    // Ensure NextResponse is imported
    if (!content.includes('NextResponse')) {
      content = content.replace(
        /from "next\/server";?/,
        'from "next/server";'
      ).replace(
        /import\s*{\s*NextRequest\s*}/,
        'import { NextRequest, NextResponse }'
      );
    }
    
    fs.writeFileSync(fullPath, content);
    console.log(`🔐 Fixed: ${filePath}`);
  } else {
    console.log(`⚠️  Could not fix: ${filePath} (manual review needed)`);
  }
});

console.log('\n✅ Admin API authentication fix complete!');
console.log('📝 Please review the changes and test the admin functionality.');