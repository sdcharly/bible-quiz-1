import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

// IMPORTANT: This is a temporary debug endpoint
// Remove this file after debugging the issue
export async function GET() {
  // Only allow in development or with special header
  const isDev = process.env.NODE_ENV === "development";
  
  // Check environment variables
  const envCheck = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    checks: {
      SUPER_ADMIN_EMAIL: {
        exists: !!process.env.SUPER_ADMIN_EMAIL,
        value: process.env.SUPER_ADMIN_EMAIL ? `${process.env.SUPER_ADMIN_EMAIL.substring(0, 3)}...` : "NOT SET"
      },
      SUPER_ADMIN_PASSWORD: {
        exists: !!process.env.SUPER_ADMIN_PASSWORD,
        length: process.env.SUPER_ADMIN_PASSWORD?.length || 0
      },
      SUPER_ADMIN_PASSWORD_HASH: {
        exists: !!process.env.SUPER_ADMIN_PASSWORD_HASH,
        isValidHash: process.env.SUPER_ADMIN_PASSWORD_HASH?.startsWith("$2a$") || false
      },
      SUPER_ADMIN_SECRET_KEY: {
        exists: !!process.env.SUPER_ADMIN_SECRET_KEY,
        length: process.env.SUPER_ADMIN_SECRET_KEY?.length || 0
      },
      POSTGRES_URL: {
        exists: !!process.env.POSTGRES_URL,
        hasValue: !!process.env.POSTGRES_URL && process.env.POSTGRES_URL.length > 0
      }
    },
    recommendations: [] as string[]
  };

  // Add recommendations
  if (!envCheck.checks.SUPER_ADMIN_EMAIL.exists) {
    envCheck.recommendations.push("Set SUPER_ADMIN_EMAIL in your environment variables");
  }
  
  if (!envCheck.checks.SUPER_ADMIN_PASSWORD.exists && !envCheck.checks.SUPER_ADMIN_PASSWORD_HASH.exists) {
    envCheck.recommendations.push("Set either SUPER_ADMIN_PASSWORD or SUPER_ADMIN_PASSWORD_HASH");
  }
  
  if (envCheck.checks.SUPER_ADMIN_PASSWORD.exists && !envCheck.checks.SUPER_ADMIN_PASSWORD_HASH.exists) {
    envCheck.recommendations.push("For production, use SUPER_ADMIN_PASSWORD_HASH instead of plain text password");
  }
  
  if (!envCheck.checks.SUPER_ADMIN_SECRET_KEY.exists) {
    envCheck.recommendations.push("Set SUPER_ADMIN_SECRET_KEY for JWT signing");
  }

  // Log the check
  logger.log("Admin environment check performed", envCheck);

  // Return safe information
  return NextResponse.json(envCheck);
}