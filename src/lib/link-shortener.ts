import { db } from "@/lib/db";
import { quizShareLinks } from "@/lib/schema";
import { eq } from "drizzle-orm";

/**
 * Simple self-hosted link shortener for quiz share links
 * Generates short URLs in the format: /s/[shortCode]
 */

// Generate a short alphanumeric code
function generateShortCode(length: number = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Create a shortened URL for a quiz share link
export async function createShortUrl(shareCode: string): Promise<string | null> {
  try {
    // Find the share link
    const [shareLink] = await db
      .select()
      .from(quizShareLinks)
      .where(eq(quizShareLinks.shareCode, shareCode));

    if (!shareLink) {
      return null;
    }

    // If already has a short URL, return it
    if (shareLink.shortUrl) {
      return shareLink.shortUrl;
    }

    // Generate a unique short code
    let shortCode: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      shortCode = generateShortCode();
      const [existing] = await db
        .select()
        .from(quizShareLinks)
        .where(eq(quizShareLinks.shortUrl, shortCode));
      
      if (!existing) {
        break;
      }
      
      attempts++;
    } while (attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      console.error("Failed to generate unique short code after", maxAttempts, "attempts");
      return null;
    }

    // Update the share link with the short URL
    await db
      .update(quizShareLinks)
      .set({ 
        shortUrl: shortCode,
        updatedAt: new Date()
      })
      .where(eq(quizShareLinks.id, shareLink.id));

    return shortCode;
  } catch (error) {
    console.error("Error creating short URL:", error);
    return null;
  }
}

// Resolve a short URL to get the original share code
export async function resolveShortUrl(shortCode: string): Promise<string | null> {
  try {
    const [shareLink] = await db
      .select()
      .from(quizShareLinks)
      .where(eq(quizShareLinks.shortUrl, shortCode));

    if (!shareLink) {
      return null;
    }

    // Increment click count
    await db
      .update(quizShareLinks)
      .set({ 
        clickCount: (shareLink.clickCount || 0) + 1,
        updatedAt: new Date()
      })
      .where(eq(quizShareLinks.id, shareLink.id));

    return shareLink.shareCode;
  } catch (error) {
    console.error("Error resolving short URL:", error);
    return null;
  }
}

// Get the full short URL for display
export function getShortUrl(shortCode: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://biblequiz.textr.in';
  return `${baseUrl}/s/${shortCode}`;
}