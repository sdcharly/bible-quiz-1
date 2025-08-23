import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { quizzes, quizShareLinks } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import * as crypto from "crypto";
import { createShortUrl, getShortUrl } from "@/lib/link-shortener";

// Generate a short, unique share code
function generateShareCode(): string {
  // Generate 8 character alphanumeric code
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const quizId = params.id;
    
    // Get session
    const session = await auth.api.getSession({
      headers: await headers()
    });

    // Require authenticated educator
    if (!session?.user || session.user.role !== 'educator') {
      return NextResponse.json(
        { error: "Unauthorized - Educator access required" },
        { status: 401 }
      );
    }
    
    const educatorId = session.user.id;

    // Verify quiz exists and belongs to educator
    const [quiz] = await db
      .select()
      .from(quizzes)
      .where(
        and(
          eq(quizzes.id, quizId),
          eq(quizzes.educatorId, educatorId)
        )
      );

    if (!quiz) {
      return NextResponse.json(
        { error: "Quiz not found or doesn't belong to educator" },
        { status: 404 }
      );
    }

    // Check if share link already exists
    const [existingLink] = await db
      .select()
      .from(quizShareLinks)
      .where(eq(quizShareLinks.quizId, quizId));

    if (existingLink) {
      // Return existing link
      const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://biblequiz.textr.in'}/quiz/share/${existingLink.shareCode}`;
      
      // Generate short URL if it doesn't exist
      let shortUrl = existingLink.shortUrl;
      if (!shortUrl) {
        const shortCode = await createShortUrl(existingLink.shareCode);
        if (shortCode) {
          shortUrl = getShortUrl(shortCode);
        }
      } else {
        shortUrl = existingLink.shortUrl ? getShortUrl(existingLink.shortUrl) : null;
      }
      
      return NextResponse.json({
        shareCode: existingLink.shareCode,
        shareUrl,
        shortUrl,
        createdAt: existingLink.createdAt,
        clickCount: existingLink.clickCount
      });
    }

    // Generate new share link
    const shareCode = generateShareCode();
    const id = crypto.randomUUID();

    await db.insert(quizShareLinks).values({
      id,
      quizId,
      educatorId,
      shareCode,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://biblequiz.textr.in'}/quiz/share/${shareCode}`;
    
    // Generate short URL
    const shortCode = await createShortUrl(shareCode);
    const shortUrl = shortCode ? getShortUrl(shortCode) : null;

    return NextResponse.json({
      shareCode,
      shareUrl,
      shortUrl,
      createdAt: new Date(),
      clickCount: 0
    });

  } catch (error) {
    console.error("Error creating share link:", error);
    return NextResponse.json(
      { error: "Failed to create share link" },
      { status: 500 }
    );
  }
}

// Regenerate share link (creates new one, invalidates old)
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const quizId = params.id;
    
    // Get session
    const session = await auth.api.getSession({
      headers: await headers()
    });

    // Require authenticated educator
    if (!session?.user || session.user.role !== 'educator') {
      return NextResponse.json(
        { error: "Unauthorized - Educator access required" },
        { status: 401 }
      );
    }
    
    const educatorId = session.user.id;

    // Verify quiz exists and belongs to educator
    const [quiz] = await db
      .select()
      .from(quizzes)
      .where(
        and(
          eq(quizzes.id, quizId),
          eq(quizzes.educatorId, educatorId)
        )
      );

    if (!quiz) {
      return NextResponse.json(
        { error: "Quiz not found or doesn't belong to educator" },
        { status: 404 }
      );
    }

    // Delete existing share link if any
    await db
      .delete(quizShareLinks)
      .where(eq(quizShareLinks.quizId, quizId));

    // Generate new share link
    const shareCode = generateShareCode();
    const id = crypto.randomUUID();

    await db.insert(quizShareLinks).values({
      id,
      quizId,
      educatorId,
      shareCode,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://biblequiz.textr.in'}/quiz/share/${shareCode}`;
    
    // Generate short URL
    const shortCode = await createShortUrl(shareCode);
    const shortUrl = shortCode ? getShortUrl(shortCode) : null;

    return NextResponse.json({
      shareCode,
      shareUrl,
      shortUrl,
      createdAt: new Date(),
      clickCount: 0
    });

  } catch (error) {
    console.error("Error regenerating share link:", error);
    return NextResponse.json(
      { error: "Failed to regenerate share link" },
      { status: 500 }
    );
  }
}