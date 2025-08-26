import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { user } from "@/lib/schema";


export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    
    if (id) {
      const [educator] = await db.select()
        .from(user)
        .where(eq(user.id, id))
        .limit(1);
      
      return NextResponse.json({ educator });
    }
    
    // Get all educators
    const educators = await db.select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      approvalStatus: user.approvalStatus,
      approvedBy: user.approvedBy,
      approvedAt: user.approvedAt,
      permissions: user.permissions,
    })
    .from(user)
    .where(eq(user.role, "educator"));
    
    return NextResponse.json({ educators });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}