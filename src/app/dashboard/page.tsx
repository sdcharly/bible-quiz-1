"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { getDefaultDashboardPath } from "@/lib/roles";

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  useEffect(() => {
    const checkUserRole = async () => {
      if (!isPending && session?.user) {
        // Fetch the user's role from database
        const roleResponse = await fetch("/api/auth/get-user-role", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: session.user.id,
            email: session.user.email,
          }),
        });
        
        const roleData = await roleResponse.json();
        const dashboardPath = getDefaultDashboardPath(roleData.role || "student");
        router.replace(dashboardPath);
      } else if (!isPending && !session) {
        router.replace("/auth/signin");
      }
    };

    checkUserRole();
  }, [session, isPending, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );
}