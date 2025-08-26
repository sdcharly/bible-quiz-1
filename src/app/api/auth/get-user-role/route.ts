import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { user } from "@/lib/schema";
import { auth } from "@/lib/auth";


export async function GET(req: NextRequest) {
  try {
    // Get session from auth
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session?.user) {
      return NextResponse.json({
        user: null,
        role: null
      });
    }

    return NextResponse.json({
      role: session.user.role,
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: session.user.role,
      },
    });
  } catch (error) {
    // [REMOVED: Console statement for performance]
    return NextResponse.json(
      { error: "Failed to get user role" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, email } = body;

    // Find user by ID or email
    let userData;
    if (userId) {
      userData = await db
        .select()
        .from(user)
        .where(eq(user.id, userId))
        .limit(1);
    } else if (email) {
      userData = await db
        .select()
        .from(user)
        .where(eq(user.email, email))
        .limit(1);
    } else {
      return NextResponse.json(
        { error: "Missing userId or email" },
        { status: 400 }
      );
    }

    if (userData.length === 0) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      role: userData[0].role,
      user: {
        id: userData[0].id,
        email: userData[0].email,
        name: userData[0].name,
        role: userData[0].role,
      },
    });
  } catch (error) {
    // [REMOVED: Console statement for performance]
    return NextResponse.json(
      { error: "Failed to get user role" },
      { status: 500 }
    );
  }
}