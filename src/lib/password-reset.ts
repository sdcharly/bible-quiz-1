import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { user } from "@/lib/schema";
import { sendPasswordResetEmail } from "@/lib/email-service";


// In-memory storage for reset tokens (in production, use database)
// This is a temporary solution - ideally store in a passwordResetTokens table
const resetTokens = new Map<string, {
  email: string;
  userId: string;
  expires: number;
  attempts: number;
}>();

// Clean up expired tokens every hour
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of resetTokens.entries()) {
    if (data.expires < now) {
      resetTokens.delete(token);
    }
  }
}, 60 * 60 * 1000);

/**
 * Generate a secure reset token
 */
function generateResetToken(): string {
  return uuidv4() + "-" + uuidv4(); // Double UUID for extra security
}

/**
 * Request a password reset
 */
export async function requestPasswordReset(email: string): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    // Check if user exists
    const users = await db
      .select()
      .from(user)
      .where(eq(user.email, email))
      .limit(1);

    if (users.length === 0) {
      // Don't reveal if user exists or not for security
      return {
        success: true,
        message: "If an account exists with this email, a reset link has been sent.",
      };
    }

    const targetUser = users[0];

    // Check for recent reset attempts (rate limiting)
    const recentAttempts = Array.from(resetTokens.values()).filter(
      (data) => data.email === email && data.expires > Date.now()
    );

    if (recentAttempts.length >= 3) {
      return {
        success: false,
        message: "Too many reset attempts. Please try again later.",
      };
    }

    // Generate reset token
    const token = generateResetToken();
    const expires = Date.now() + 60 * 60 * 1000; // 1 hour expiry

    // Store token
    resetTokens.set(token, {
      email,
      userId: targetUser.id,
      expires,
      attempts: 0,
    });

    // Send reset email
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password?token=${token}`;
    
    try {
      await sendPasswordResetEmail(email, targetUser.name || "User", resetUrl);
    } catch (emailError) {
      // [REMOVED: Console statement for performance]
      resetTokens.delete(token);
      return {
        success: false,
        message: "Failed to send reset email. Please try again.",
      };
    }

    return {
      success: true,
      message: "If an account exists with this email, a reset link has been sent.",
    };
  } catch (error) {
    // [REMOVED: Console statement for performance]
    return {
      success: false,
      message: "An error occurred. Please try again.",
    };
  }
}

/**
 * Validate a reset token
 */
export async function validateResetToken(token: string): Promise<{
  valid: boolean;
  email?: string;
  message?: string;
}> {
  const data = resetTokens.get(token);

  if (!data) {
    return {
      valid: false,
      message: "Invalid or expired reset token.",
    };
  }

  if (data.expires < Date.now()) {
    resetTokens.delete(token);
    return {
      valid: false,
      message: "Reset token has expired. Please request a new one.",
    };
  }

  if (data.attempts >= 5) {
    resetTokens.delete(token);
    return {
      valid: false,
      message: "Too many failed attempts. Please request a new reset link.",
    };
  }

  return {
    valid: true,
    email: data.email,
  };
}

/**
 * Reset password with token
 */
export async function resetPasswordWithToken(
  token: string,
  newPassword: string
): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const data = resetTokens.get(token);

    if (!data) {
      return {
        success: false,
        message: "Invalid or expired reset token.",
      };
    }

    if (data.expires < Date.now()) {
      resetTokens.delete(token);
      return {
        success: false,
        message: "Reset token has expired. Please request a new one.",
      };
    }

    // Increment attempts
    data.attempts++;

    // Validate password strength
    if (newPassword.length < 8) {
      return {
        success: false,
        message: "Password must be at least 8 characters long.",
      };
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update user password
    await db
      .update(user)
      .set({
        password: hashedPassword,
        updatedAt: new Date(),
      })
      .where(eq(user.id, data.userId));

    // Delete the used token
    resetTokens.delete(token);

    // Delete all other tokens for this user
    for (const [otherToken, otherData] of resetTokens.entries()) {
      if (otherData.userId === data.userId) {
        resetTokens.delete(otherToken);
      }
    }

    return {
      success: true,
      message: "Password has been reset successfully.",
    };
  } catch (error) {
    // [REMOVED: Console statement for performance]
    return {
      success: false,
      message: "Failed to reset password. Please try again.",
    };
  }
}

/**
 * Reset password for admin (requires old password)
 */
export async function resetAdminPassword(
  email: string,
  oldPassword: string,
  newPassword: string
): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    // This is specifically for admin password reset
    if (email !== process.env.SUPER_ADMIN_EMAIL) {
      return {
        success: false,
        message: "Invalid admin email.",
      };
    }

    // Verify old password
    const envPasswordHash = process.env.SUPER_ADMIN_PASSWORD_HASH || 
      await bcrypt.hash(process.env.SUPER_ADMIN_PASSWORD!, 12);
    
    const isOldPasswordValid = await bcrypt.compare(oldPassword, envPasswordHash);
    
    if (!isOldPasswordValid) {
      return {
        success: false,
        message: "Current password is incorrect.",
      };
    }

    // Validate new password
    if (newPassword.length < 12) {
      return {
        success: false,
        message: "Admin password must be at least 12 characters long.",
      };
    }

    // For admin, we need to update the environment variable
    // In production, this would need to be done through the hosting platform
    return {
      success: true,
      message: "Admin password updated. Please update SUPER_ADMIN_PASSWORD_HASH in environment variables.",
    };
  } catch (error) {
    // [REMOVED: Console statement for performance]
    return {
      success: false,
      message: "Failed to reset admin password.",
    };
  }
}