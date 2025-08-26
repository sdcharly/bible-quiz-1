import { NextResponse } from "next/server";
import os from "os";
import { getAdminSession } from "@/lib/admin-auth";
import { logger } from "@/lib/logger";


export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get system metrics
    const cpuUsage = os.loadavg()[0] * 100 / os.cpus().length;
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    
    const systemMetrics = {
      cpu: {
        usage: Math.min(100, cpuUsage),
        cores: os.cpus().length,
        model: os.cpus()[0]?.model || "Unknown"
      },
      memory: {
        total: totalMem,
        used: usedMem,
        free: freeMem,
        percentage: (usedMem / totalMem) * 100
      },
      disk: {
        // Mock disk data as it requires additional libraries
        total: 512 * 1024 * 1024 * 1024, // 512GB
        used: 256 * 1024 * 1024 * 1024, // 256GB
        free: 256 * 1024 * 1024 * 1024, // 256GB
        percentage: 50
      },
      network: {
        latency: Math.random() * 50, // Mock latency
        bandwidth: "1 Gbps",
        requests: Math.floor(Math.random() * 10000)
      },
      uptime: os.uptime() * 1000, // Convert to milliseconds
      nodeVersion: process.version,
      platform: os.platform()
    };

    return NextResponse.json(systemMetrics);
  } catch (error) {
    logger.error("Failed to fetch system metrics:", error);
    return NextResponse.json(
      { error: "Failed to fetch system metrics" },
      { status: 500 }
    );
  }
}