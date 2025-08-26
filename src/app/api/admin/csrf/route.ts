import { NextResponse } from "next/server";
import { getClientCSRFToken } from "@/lib/csrf";
import { getAdminSession } from "@/lib/admin-auth";


export async function GET() {
  // Only provide CSRF token to authenticated admin users
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const token = await getClientCSRFToken();
  
  return NextResponse.json({ 
    token,
    expiresIn: 86400 // 24 hours in seconds
  });
}