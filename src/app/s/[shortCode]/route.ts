import { NextRequest, NextResponse } from "next/server";
import { resolveShortUrl } from "@/lib/link-shortener";
import { logger } from "@/lib/logger";


export async function GET(
  req: NextRequest,
  context: { params: Promise<{ shortCode: string }> }
) {
  try {
    const params = await context.params;
    const shortCode = params.shortCode;

    // Resolve the short URL to get the original share code
    const shareCode = await resolveShortUrl(shortCode);

    if (!shareCode) {
      // Redirect to home page if short URL not found
      return NextResponse.redirect(new URL('/', req.url));
    }

    // Redirect to the full quiz share URL
    const redirectUrl = new URL(`/quiz/share/${shareCode}`, req.url);
    
    // Preserve any query parameters (like email)
    const searchParams = req.nextUrl.searchParams;
    searchParams.forEach((value, key) => {
      redirectUrl.searchParams.append(key, value);
    });

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    logger.error("Error resolving short URL:", error);
    return NextResponse.redirect(new URL('/', req.url));
  }
}