import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { createOTP } from "@/lib/otp-service";
import { emailTemplates, sendEmail } from "@/lib/email-service";
import { db } from "@/lib/db";
import { user } from "@/lib/schema";
import { logger } from "@/lib/logger";


export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Check if user exists and is an educator
    const [existingUser] = await db
      .select()
      .from(user)
      .where(eq(user.email, email))
      .limit(1);

    if (!existingUser) {
      return NextResponse.json(
        { error: "No account found with this email" },
        { status: 404 }
      );
    }

    // Only require verification for educators who signed up with email
    if (existingUser.role !== 'educator' && existingUser.role !== 'pending_educator') {
      return NextResponse.json(
        { error: "Email verification is only required for educators" },
        { status: 400 }
      );
    }

    // Check if already verified
    if (existingUser.emailVerified) {
      return NextResponse.json(
        { error: "Email is already verified" },
        { status: 400 }
      );
    }

    // Generate new OTP
    const otpResult = await createOTP(email, 'educator_email_verification');
    
    if ('error' in otpResult) {
      return NextResponse.json(
        { error: otpResult.error },
        { status: 429 } // Too Many Requests
      );
    }

    // Send OTP email
    try {
      const otpEmail = emailTemplates.otpVerification(
        existingUser.name || 'Educator',
        otpResult.otp,
        10 // 10 minutes expiry
      );
      
      await sendEmail({
        to: email,
        subject: otpEmail.subject,
        html: otpEmail.html,
        text: otpEmail.text,
      });
      
      logger.log(`OTP resent to educator: ${email}`);
    } catch (emailError) {
      logger.error('Failed to send OTP email:', emailError);
      return NextResponse.json(
        { error: "Failed to send verification email" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Verification code sent to your email",
      expiresAt: otpResult.expiresAt
    });

  } catch (error) {
    logger.error("Error resending OTP:", error);
    return NextResponse.json(
      { error: "Failed to resend verification code" },
      { status: 500 }
    );
  }
}