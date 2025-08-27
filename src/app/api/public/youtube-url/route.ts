import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { adminSettings } from "@/lib/schema";
import { logger } from "@/lib/logger";

// Public endpoint to get YouTube URL for homepage
export async function GET() {
  try {
    // Fetch the system_config setting
    const setting = await db
      .select()
      .from(adminSettings)
      .where(eq(adminSettings.settingKey, "system_config"))
      .limit(1);

    if (setting.length === 0) {
      // Return default YouTube URL if no setting exists
      return NextResponse.json({ 
        youtubeUrl: "https://www.youtube.com/embed/zBnGACs7Ddo?rel=0&modestbranding=1&autoplay=0&mute=1" 
      });
    }

    const systemConfig = setting[0].settingValue as any;
    const youtubeUrl = systemConfig?.youtubeVideoUrl || "https://www.youtube.com/watch?v=zBnGACs7Ddo";

    // Convert YouTube URL to embed format if needed
    let embedUrl = youtubeUrl;
    
    // Handle various YouTube URL formats
    if (youtubeUrl.includes("youtube.com/watch?v=")) {
      const videoId = youtubeUrl.split("v=")[1]?.split("&")[0];
      if (videoId) {
        embedUrl = `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&autoplay=0&mute=1`;
      }
    } else if (youtubeUrl.includes("youtu.be/")) {
      const videoId = youtubeUrl.split("youtu.be/")[1]?.split("?")[0];
      if (videoId) {
        embedUrl = `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&autoplay=0&mute=1`;
      }
    } else if (youtubeUrl.includes("youtube.com/embed/")) {
      // Already in embed format, just add parameters if missing
      if (!youtubeUrl.includes("?")) {
        embedUrl = `${youtubeUrl}?rel=0&modestbranding=1&autoplay=0&mute=1`;
      }
    }

    return NextResponse.json({ 
      youtubeUrl: embedUrl,
      originalUrl: youtubeUrl
    });
  } catch (error) {
    logger.error("Error fetching YouTube URL:", error);
    // Return default URL on error
    return NextResponse.json({ 
      youtubeUrl: "https://www.youtube.com/embed/zBnGACs7Ddo?rel=0&modestbranding=1&autoplay=0&mute=1" 
    });
  }
}