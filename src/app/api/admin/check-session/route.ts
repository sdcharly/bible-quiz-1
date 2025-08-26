import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";


export async function GET() {
  try {
    const session = await getAdminSession();
    
    if (!session) {
      return NextResponse.json(
        { 
          authenticated: false,
          message: "No admin session found" 
        },
        { status: 401 }
      );
    }
    
    return NextResponse.json({
      authenticated: true,
      session: {
        id: session.id,
        email: session.email,
        role: session.role,
        expiresAt: new Date(session.exp * 1000).toISOString()
      }
    });
  } catch (error) {
    // [REMOVED: Console statement for performance]
    return NextResponse.json(
      { 
        authenticated: false,
        error: "Session check failed" 
      },
      { status: 500 }
    );
  }
}