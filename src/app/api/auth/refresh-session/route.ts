import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getAdminSession, createAdminSession } from "@/lib/admin-auth";


export async function POST() {
  try {
    // Check if it's an admin session
    const adminSession = await getAdminSession();
    
    if (adminSession) {
      // Refresh admin session by creating a new one
      await createAdminSession(adminSession.id, adminSession.email);
      
      return NextResponse.json({ 
        success: true, 
        message: "Admin session refreshed",
        userType: "admin"
      });
    }

    // Check regular user session
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "No active session found" },
        { status: 401 }
      );
    }

    // For regular users, the session is managed by better-auth
    // Just return success as the cookie-based session is still valid
    return NextResponse.json({ 
      success: true, 
      message: "Session is active",
      userType: session.user.role || "student"
    });

  } catch (error) {
    // [REMOVED: Console statement for performance]
    return NextResponse.json(
      { error: "Failed to refresh session" },
      { status: 500 }
    );
  }
}