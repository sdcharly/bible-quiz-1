import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { logger } from "./logger";


const connectionString = process.env.POSTGRES_URL as string;

if (!connectionString) {
  throw new Error("POSTGRES_URL environment variable is not set");
}

// Optimized database configuration with connection pooling
// Updated for high concurrency: Supporting 100+ simultaneous students
const dbConfig = {
  // Connection pool settings - Increased for high load
  max: 50,                    // Maximum number of connections in pool (increased from 25)
  min: 10,                    // Minimum number of connections to maintain (increased from 5)
  idle_timeout: 20,           // Close idle connections after 20 seconds (reduced for faster recycling)
  connect_timeout: 5,         // Connection timeout in seconds (increased for network delays)
  
  // Query optimization
  prepare: true,              // Use prepared statements for better performance
  
  // Connection lifecycle
  onnotice: (notice: unknown) => {
    logger.debug("Database notice:", notice);
  },
  
  // Transform undefined to null for better compatibility
  transform: {
    undefined: null,
  },
};

// Create the postgres client with optimized settings
const client = postgres(connectionString, dbConfig);

// Export the drizzle instance
export const db = drizzle(client, { schema });

// Export the raw client for advanced operations if needed
export const pgClient = client;

// Graceful shutdown handler
if (typeof process !== 'undefined') {
  process.on('SIGTERM', async () => {
    logger.log("SIGTERM received, closing database connections...");
    await client.end();
  });
}
