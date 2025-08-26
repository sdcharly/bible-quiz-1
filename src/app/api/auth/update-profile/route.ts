import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { user } from "@/lib/schema";


export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, phoneNumber, role, timezone, emailVerified } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Find user by email
    const existingUser = await db
      .select()
      .from(user)
      .where(eq(user.email, email.toLowerCase()))
      .limit(1);

    if (!existingUser.length) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Update user profile with phone number, role, and timezone
    const updates: { updatedAt: Date; phoneNumber?: string; role?: "educator" | "student"; timezone?: string; approvalStatus?: "pending" | "approved" | "rejected" | "suspended"; emailVerified?: boolean } = {
      updatedAt: new Date(),
    };
    
    if (phoneNumber !== undefined) {
      updates.phoneNumber = phoneNumber;
    }
    
    if (role !== undefined) {
      updates.role = role;
      // Auto-approve students, educators need approval
      if (role === "student") {
        updates.approvalStatus = "approved";
      } else if (role === "educator") {
        // Set educator to pending approval
        updates.approvalStatus = "pending";
      }
    }
    
    if (timezone !== undefined) {
      updates.timezone = timezone;
    }
    
    if (emailVerified !== undefined) {
      updates.emailVerified = emailVerified;
    }

    await db
      .update(user)
      .set(updates)
      .where(eq(user.id, existingUser[0].id));

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
    });

  } catch (error) {
    // [REMOVED: Console statement for performance]
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}