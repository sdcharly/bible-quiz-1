import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { user } from "@/lib/schema";


export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, role } = body;

    if (!userId || !role) {
      return NextResponse.json(
        { error: "Missing userId or role" },
        { status: 400 }
      );
    }

    // Update the user role in the database
    await db
      .update(user)
      .set({ role })
      .where(eq(user.id, userId));

    return NextResponse.json({
      success: true,
      message: `Role updated to ${role}`,
    });
  } catch (error) {
    // [REMOVED: Console statement for performance]
    return NextResponse.json(
      { error: "Failed to update role" },
      { status: 500 }
    );
  }
}