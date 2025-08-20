import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { user, account } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, name, institution } = body;

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(user)
      .where(eq(user.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      );
    }

    // Generate a unique user ID
    const userId = crypto.randomUUID();

    // Create the user directly in the database with educator role
    await db.insert(user).values({
      id: userId,
      name,
      email,
      role: "educator",
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Note: Password handling would need to be integrated with Better Auth
    // For now, we're just creating the user with educator role

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        name,
        email,
        role: "educator",
      },
    });
  } catch (error) {
    console.error("Educator signup error:", error);
    return NextResponse.json(
      { error: "Failed to create educator account" },
      { status: 500 }
    );
  }
}