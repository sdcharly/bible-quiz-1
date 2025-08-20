import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { user } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    // Update the first user (sdcharly@gmail.com) to be an educator for testing
    const result = await db
      .update(user)
      .set({ role: "educator" })
      .where(eq(user.email, "sdcharly@gmail.com"))
      .returning();
    
    return NextResponse.json({
      message: "User updated to educator",
      user: result[0] ? {
        id: result[0].id,
        email: result[0].email,
        name: result[0].name,
        role: result[0].role,
      } : null,
    });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}