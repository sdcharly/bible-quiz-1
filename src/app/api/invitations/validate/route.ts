import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invitations, user } from "@/lib/schema";
import { eq, and, gte } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 }
      );
    }

    // Find invitation by token
    const invitation = await db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.token, token),
          eq(invitations.status, "pending"),
          gte(invitations.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!invitation.length) {
      return NextResponse.json(
        { error: "Invalid or expired invitation" },
        { status: 404 }
      );
    }

    // Get educator information
    const educator = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
      })
      .from(user)
      .where(eq(user.id, invitation[0].educatorId))
      .limit(1);

    return NextResponse.json({
      valid: true,
      email: invitation[0].email,
      educatorId: invitation[0].educatorId,
      educatorName: educator[0]?.name || "Educator",
      quizId: invitation[0].quizId,
    });

  } catch (error) {
    console.error("Error validating invitation:", error);
    return NextResponse.json(
      { error: "Failed to validate invitation" },
      { status: 500 }
    );
  }
}