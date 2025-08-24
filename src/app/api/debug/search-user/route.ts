import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { user } from "@/lib/schema";
import { or, ilike } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const searchTerm = searchParams.get('name') || 'jahez';
    
    // Search for users with various spellings
    const users = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        timezone: user.timezone,
        role: user.role,
        createdAt: user.createdAt,
        phoneNumber: user.phoneNumber,
      })
      .from(user)
      .where(
        or(
          ilike(user.name, `%${searchTerm}%`),
          ilike(user.email, `%${searchTerm}%`)
        )
      );

    return NextResponse.json({
      searchTerm,
      found: users.length,
      users: users.map(u => ({
        ...u,
        phoneNumber: u.phoneNumber ? `${u.phoneNumber.substring(0, 3)}****${u.phoneNumber.slice(-2)}` : null // Partially hide phone for privacy
      }))
    });

  } catch (error) {
    console.error("Error searching users:", error);
    return NextResponse.json(
      { error: "Failed to search users", details: error },
      { status: 500 }
    );
  }
}