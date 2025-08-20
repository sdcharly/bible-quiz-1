import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invitations } from "@/lib/schema";
import { desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const allInvitations = await db
      .select()
      .from(invitations)
      .orderBy(desc(invitations.createdAt));

    return NextResponse.json({
      invitations: allInvitations,
      total: allInvitations.length,
    });
  } catch (error) {
    console.error("Error fetching invitations:", error);
    return NextResponse.json(
      { error: "Failed to fetch invitations" },
      { status: 500 }
    );
  }
}