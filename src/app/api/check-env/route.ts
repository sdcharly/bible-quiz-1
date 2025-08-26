import { NextResponse } from 'next/server';
import { envSummary, ENV, getEnvironmentName } from '@/lib/env-config';


export async function GET() {
  // Only show detailed info in development or debug mode
  if (ENV.isDevelopment || ENV.isDebugMode) {
    return NextResponse.json({
      ...envSummary,
      details: {
        isDevelopment: ENV.isDevelopment,
        isProduction: ENV.isProduction,
        isDebugMode: ENV.isDebugMode,
        enableLogging: ENV.enableLogging,
        logLevel: ENV.logLevel,
        enableDebugEndpoints: ENV.enableDebugEndpoints,
        deploymentEnv: ENV.deploymentEnv,
      }
    });
  }
  
  // In production, only show basic info
  return NextResponse.json({
    environment: getEnvironmentName(),
    status: 'running',
    debug: false
  });
}