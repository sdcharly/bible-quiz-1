import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { logger } from "./logger";

const connectionString = process.env.POSTGRES_URL as string;

if (!connectionString) {
  throw new Error("POSTGRES_URL environment variable is not set");
}

// Optimized database configuration with connection pooling
const dbConfig = {
  // Connection pool settings
  max: 25,                    // Maximum number of connections in pool
  min: 5,                     // Minimum number of connections to maintain
  idle_timeout: 30,           // Close idle connections after 30 seconds
  connect_timeout: 2,         // Connection timeout in seconds
  
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
