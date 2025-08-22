"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

export function MaintenanceCheck() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Skip check for admin, auth, and maintenance pages
    if (
      pathname.startsWith("/admin") ||
      pathname.startsWith("/auth") ||
      pathname === "/maintenance"
    ) {
      return;
    }

    // Check maintenance mode status
    const checkMaintenance = async () => {
      try {
        const response = await fetch("/api/maintenance-status");
        if (response.ok) {
          const data = await response.json();
          if (data.isEnabled) {
            router.push("/maintenance");
          }
        }
      } catch (error) {
        console.error("Failed to check maintenance status:", error);
      }
    };

    checkMaintenance();
    
    // Re-check every 5 minutes
    const interval = setInterval(checkMaintenance, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [pathname, router]);

  return null;
}