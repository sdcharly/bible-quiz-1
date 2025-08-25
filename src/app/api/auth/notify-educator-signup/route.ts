import { NextRequest, NextResponse } from "next/server";
import { notifyEducatorSignup } from "@/lib/admin-notifications";
import { emailTemplates, sendEmail } from "@/lib/email-service";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, email, name } = body;

    if (!userId || !email) {
      return NextResponse.json(
        { error: "User ID and email are required" },
        { status: 400 }
      );
    }

    // Send confirmation email to educator
    try {
      const confirmationEmail = emailTemplates.educatorSignupPending(name || 'Educator');
      await sendEmail({
        to: email,
        subject: confirmationEmail.subject,
        html: confirmationEmail.html,
        text: confirmationEmail.text,
      });
      logger.log(`Confirmation email sent to educator: ${email}`);
    } catch (emailError) {
      logger.error('Failed to send confirmation email to educator:', emailError);
      // Don't fail the signup if email fails
    }

    // Send admin notification about new educator signup via OAuth
    try {
      await notifyEducatorSignup({
        id: userId,
        name: name || 'Unknown',
        email: email
      });
      logger.log(`Admin notified of new educator signup via OAuth: ${email}`);
    } catch (notificationError) {
      logger.error('Failed to send admin notification for OAuth educator signup:', notificationError);
      // Don't fail the signup if notification fails
    }

    return NextResponse.json({
      success: true,
      message: "Notifications sent for educator signup"
    });

  } catch (error) {
    logger.error("Error in notify-educator-signup:", error);
    return NextResponse.json(
      { error: "Failed to send notifications" },
      { status: 500 }
    );
  }
}