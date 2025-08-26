import { NextRequest, NextResponse } from "next/server";
import { validateResetToken, resetPasswordWithToken } from "@/lib/password-reset";
import { withMiddleware } from "@/lib/api-middleware";


async function handleValidateToken(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 }
      );
    }

    const result = await validateResetToken(token);

    if (!result.valid) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      valid: true,
      email: result.email,
    });
  } catch (error) {
    // [REMOVED: Console statement for performance]
    return NextResponse.json(
      { error: "Failed to validate token" },
      { status: 500 }
    );
  }
}

async function handleResetPassword(request: NextRequest) {
  try {
    const { token, password, confirmPassword } = await request.json();

    if (!token || !password || !confirmPassword) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: "Passwords do not match" },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    // Check for common password patterns
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (!(hasUpperCase && hasLowerCase && hasNumbers)) {
      return NextResponse.json(
        { 
          error: "Password must contain uppercase, lowercase, and numbers" 
        },
        { status: 400 }
      );
    }

    const result = await resetPasswordWithToken(token, password);

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    // [REMOVED: Console statement for performance]
    return NextResponse.json(
      { error: "Failed to reset password" },
      { status: 500 }
    );
  }
}

// Apply rate limiting
export const GET = withMiddleware(handleValidateToken, {
  rateLimit: { type: "auth" },
});

export const POST = withMiddleware(handleResetPassword, {
  rateLimit: { type: "auth" },
});