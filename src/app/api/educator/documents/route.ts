import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { documents } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    // Try to get session using Better Auth
    const session = await auth.api.getSession({
      headers: await headers()
    });
    
    // For development/testing, use default educator ID if no session
    let educatorId = "MMlI6NJuBNVBAEL7J4TyAX4ncO1ikns2";
    
    if (session?.user) {
      educatorId = session.user.id;
    }

    // Fetch documents for the educator
    const userDocuments = await db
      .select()
      .from(documents)
      .where(eq(documents.educatorId, educatorId))
      .orderBy(desc(documents.uploadDate));

    return NextResponse.json({
      documents: userDocuments,
    });
  } catch (error) {
    console.error("Error fetching documents:", error);
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    );
  }
}