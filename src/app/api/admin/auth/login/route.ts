import { NextRequest, NextResponse } from "next/server";
import { authenticateSuperAdmin, createAdminSession, logActivity } from "@/lib/admin-auth";
import { headers } from "next/headers";
import { withMiddleware } from "@/lib/api-middleware";

async function handleLogin(request: NextRequest) {
  try {
    let email, password;
    
    try {
      const body = await request.json();
      email = body.email;
      password = body.password;
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      return NextResponse.json(
        { success: false, error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Get IP and user agent for logging
    const headersList = await headers();
    const ipAddress = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || "unknown";
    const userAgent = headersList.get("user-agent") || "unknown";

    // Authenticate admin
    const result = await authenticateSuperAdmin(email, password);

    if (!result.success || !result.adminId) {
      // Log failed attempt
      await logActivity(
        null,
        "failed_admin_login",
        "auth",
        null,
        { email, ipAddress, userAgent }
      );

      return NextResponse.json(
        { success: false, error: result.error || "Invalid credentials" },
        { status: 401 }
      );
    }

    // Create admin session
    await createAdminSession(result.adminId, email);

    // Log successful login
    await logActivity(
      result.adminId,
      "admin_login_success",
      "auth",
      result.adminId,
      { email, ipAddress, userAgent }
    );

    return NextResponse.json({
      success: true,
      message: "Admin authenticated successfully"
    });
  } catch (error) {
    console.error("Admin login error:", error);
    return NextResponse.json(
      { success: false, error: "Authentication failed" },
      { status: 500 }
    );
  }
}

// Apply rate limiting to login endpoint
export const POST = withMiddleware(handleLogin, {
  rateLimit: { type: "login" },
});

export async function DELETE(request: NextRequest) {
  try {
    const { clearAdminSession, getAdminSession, logActivity } = await import("@/lib/admin-auth");
    
    const session = await getAdminSession();
    
    if (session) {
      await logActivity(
        session.id,
        "admin_logout",
        "auth",
        session.id,
        { email: session.email }
      );
    }

    await clearAdminSession();

    return NextResponse.json({
      success: true,
      message: "Logged out successfully"
    });
  } catch (error) {
    console.error("Admin logout error:", error);
    return NextResponse.json(
      { success: false, error: "Logout failed" },
      { status: 500 }
    );
  }
}