import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { verifyOTP } from "@/lib/otp-service";
import { db } from "@/lib/db";
import { user } from "@/lib/schema";
import { logger } from "@/lib/logger";


export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, otp } = body;

    if (!email || !otp) {
      return NextResponse.json(
        { error: "Email and verification code are required" },
        { status: 400 }
      );
    }

    // Verify OTP
    const result = await verifyOTP(email, otp, 'educator_email_verification');
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Invalid verification code" },
        { status: 400 }
      );
    }

    // Update user's email verification status
    const [updatedUser] = await db
      .update(user)
      .set({ 
        emailVerified: true,
        updatedAt: new Date()
      })
      .where(eq(user.email, email))
      .returning();

    if (!updatedUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    logger.log(`Email verified for educator: ${email}`);

    return NextResponse.json({
      success: true,
      message: "Email verified successfully",
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        emailVerified: updatedUser.emailVerified,
        role: updatedUser.role
      }
    });

  } catch (error) {
    logger.error("Error verifying OTP:", error);
    return NextResponse.json(
      { error: "Failed to verify code" },
      { status: 500 }
    );
  }
}