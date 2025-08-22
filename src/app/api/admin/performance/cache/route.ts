import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { Cache } from "@/lib/cache-v2";
import { redisClient } from "@/lib/redis";
import { logger } from "@/lib/logger";

export async function GET(_req: NextRequest) {
  try {
    // Verify admin authentication
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get cache metrics
    const cacheMetrics = Cache.getMetrics();
    
    // Test Redis connection
    let redisStatus = {
      connected: false,
      latency: 0,
      error: null as string | null,
    };

    try {
      const start = Date.now();
      const isConnected = await redisClient.ping();
      redisStatus = {
        connected: isConnected,
        latency: Date.now() - start,
        error: null,
      };
    } catch (error) {
      redisStatus.error = error instanceof Error ? error.message : "Connection failed";
    }

    // Get Redis metrics if available
    const redisMetrics = redisClient.getMetrics();

    return NextResponse.json({
      status: redisStatus,
      metrics: {
        redis: redisMetrics,
        cache: cacheMetrics,
      },
      configuration: {
        redisUrl: process.env.REDIS_URL ? "Configured" : "Not configured",
        upstashUrl: process.env.UPSTASH_REDIS_REST_URL ? "Configured" : "Not configured",
        kvUrl: process.env.KV_URL ? "Configured" : "Not configured",
      },
      recommendations: getRecommendations(redisStatus.connected, cacheMetrics),
    });

  } catch (error) {
    logger.error("Error fetching cache metrics:", error);
    return NextResponse.json(
      { error: "Failed to fetch cache metrics" },
      { status: 500 }
    );
  }
}

// POST endpoint to flush cache
export async function POST(req: NextRequest) {
  try {
    // Verify admin authentication
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { action, pattern } = await req.json();

    if (action === "flush") {
      await Cache.invalidate(pattern || "*");
      
      logger.log(`Cache flushed by admin: ${pattern || "all"}`);
      
      return NextResponse.json({
        success: true,
        message: `Cache ${pattern ? `pattern '${pattern}'` : "fully"} flushed`,
      });
    }

    if (action === "test") {
      // Test cache operations
      const testKey = "test:cache:ping";
      const testValue = { timestamp: Date.now(), random: Math.random() };
      
      // Test set
      const setStart = Date.now();
      await Cache.getInstance().set(testKey, testValue, 60);
      const setLatency = Date.now() - setStart;
      
      // Test get
      const getStart = Date.now();
      const retrieved = await Cache.getInstance().get(testKey);
      const getLatency = Date.now() - getStart;
      
      // Test delete
      const delStart = Date.now();
      await Cache.getInstance().del(testKey);
      const delLatency = Date.now() - delStart;
      
      return NextResponse.json({
        success: true,
        test: {
          set: { success: true, latency: setLatency },
          get: { success: retrieved !== null, latency: getLatency, match: JSON.stringify(retrieved) === JSON.stringify(testValue) },
          delete: { success: true, latency: delLatency },
          totalLatency: setLatency + getLatency + delLatency,
        },
      });
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );

  } catch (error) {
    logger.error("Error in cache operation:", error);
    return NextResponse.json(
      { error: "Failed to perform cache operation" },
      { status: 500 }
    );
  }
}

function getRecommendations(isRedisConnected: boolean, metrics: ReturnType<typeof Cache.getMetrics>): string[] {
  const recommendations: string[] = [];

  if (!isRedisConnected) {
    recommendations.push("Redis is not connected. Configure REDIS_URL or UPSTASH_REDIS_REST_URL for better performance.");
  }

  if (metrics?.memory?.hitRate) {
    const hitRate = parseFloat(metrics.memory.hitRate);
    if (hitRate < 80) {
      recommendations.push(`Cache hit rate is ${metrics.memory.hitRate}. Consider optimizing cache keys and TTL values.`);
    }
  }

  if (metrics?.redis?.avgLatency) {
    const latency = parseFloat(metrics.redis.avgLatency);
    if (latency > 100) {
      recommendations.push(`Redis latency is high (${metrics.redis.avgLatency}). Consider using a Redis instance closer to your application.`);
    }
  }

  if (recommendations.length === 0) {
    recommendations.push("Cache performance is optimal!");
  }

  return recommendations;
}