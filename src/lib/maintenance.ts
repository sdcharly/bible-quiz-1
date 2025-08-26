import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { adminSettings } from "@/lib/schema";


// Cache maintenance mode status
let maintenanceCache: {
  isEnabled: boolean;
  message: string;
  lastChecked: number;
} | null = null;

const CACHE_DURATION = 60000; // 1 minute cache

export async function checkMaintenanceMode(): Promise<{
  isEnabled: boolean;
  message: string;
}> {
  // Check cache first
  if (maintenanceCache && Date.now() - maintenanceCache.lastChecked < CACHE_DURATION) {
    return {
      isEnabled: maintenanceCache.isEnabled,
      message: maintenanceCache.message,
    };
  }

  try {
    const settings = await db
      .select()
      .from(adminSettings)
      .where(eq(adminSettings.settingKey, "system_config"))
      .limit(1);

    if (settings.length > 0 && settings[0].settingValue) {
      const systemConfig = settings[0].settingValue as {
        maintenanceMode?: boolean;
        maintenanceMessage?: string;
      };
      
      // Update cache
      maintenanceCache = {
        isEnabled: systemConfig.maintenanceMode === true,
        message: systemConfig.maintenanceMessage || "System is under maintenance. Please check back later.",
        lastChecked: Date.now(),
      };

      return {
        isEnabled: maintenanceCache.isEnabled,
        message: maintenanceCache.message,
      };
    }
  } catch (error) {
    // [REMOVED: Console statement for performance]
  }

  // Default to not in maintenance mode
  return {
    isEnabled: false,
    message: "System is under maintenance. Please check back later.",
  };
}

// Function to clear the cache (useful when admin updates settings)
export function clearMaintenanceCache() {
  maintenanceCache = null;
}