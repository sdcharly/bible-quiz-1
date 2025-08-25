import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { user, account } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { notifyEducatorSignup } from "@/lib/admin-notifications";
import { logger } from "@/lib/logger";

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

    // Create the user directly in the database with educator role (pending approval)
    await db.insert(user).values({
      id: userId,
      name,
      email,
      role: "educator",
      approvalStatus: "pending", // Set to pending for admin approval
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Send OTP verification email to educator
    try {
      const { createOTP } = await import("@/lib/otp-service");
      const { emailTemplates, sendEmail } = await import("@/lib/email-service");
      
      // Generate OTP
      const otpResult = await createOTP(email, 'educator_email_verification');
      
      if ('error' in otpResult) {
        logger.error('Failed to create OTP:', otpResult.error);
      } else {
        // Send OTP email
        const otpEmail = emailTemplates.otpVerification(
          name || 'Educator',
          otpResult.otp,
          10 // 10 minutes expiry
        );
        
        await sendEmail({
          to: email,
          subject: otpEmail.subject,
          html: otpEmail.html,
          text: otpEmail.text,
        });
        
        logger.log(`OTP verification email sent to educator: ${email}`);
      }
    } catch (emailError) {
      logger.error('Failed to send OTP email to educator:', emailError);
      // Don't fail the signup if email fails  
    }

    // Send admin notification about new educator signup
    try {
      await notifyEducatorSignup({
        id: userId,
        name: name || 'Unknown',
        email: email
      });
      logger.log(`Admin notified of new educator signup: ${email}`);
    } catch (notificationError) {
      logger.error('Failed to send admin notification for educator signup:', notificationError);
      // Don't fail the signup if notification fails
    }

    // Note: Password handling would need to be integrated with Better Auth
    // For now, we're just creating the user with educator role

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        name,
        email,
        role: "educator",
        approvalStatus: "pending",
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