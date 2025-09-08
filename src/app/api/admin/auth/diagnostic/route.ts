import { NextResponse } from "next/server";
import crypto from "crypto";

export async function GET() {
  // Only show diagnostic info, not actual values
  const diagnostics = {
    environment: process.env.NODE_ENV,
    hasAdminEmail: !!process.env.ADMIN_EMAIL,
    hasSuperAdminEmail: !!process.env.SUPER_ADMIN_EMAIL,
    hasSuperAdminPassword: !!process.env.SUPER_ADMIN_PASSWORD,
    hasSuperAdminSecretKey: !!process.env.SUPER_ADMIN_SECRET_KEY,
    adminEmails: [
      process.env.SUPER_ADMIN_EMAIL ? crypto.createHash('md5').update(process.env.SUPER_ADMIN_EMAIL).digest('hex').substring(0, 8) + '...' : 'not set',
      process.env.ADMIN_EMAIL ? crypto.createHash('md5').update(process.env.ADMIN_EMAIL).digest('hex').substring(0, 8) + '...' : 'not set'
    ],
    timestamp: new Date().toISOString(),
    deploymentVersion: process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 7) || 'unknown'
  };

  return NextResponse.json(diagnostics);
}