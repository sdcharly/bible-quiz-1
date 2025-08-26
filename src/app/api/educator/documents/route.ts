import { NextRequest, NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { documents } from "@/lib/schema";
import { auth } from "@/lib/auth";


export async function GET(req: NextRequest) {
  try {
    // Get session using Better Auth
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
    // [REMOVED: Console statement for performance]
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    );
  }
}