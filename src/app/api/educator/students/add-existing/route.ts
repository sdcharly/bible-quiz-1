import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import * as crypto from "crypto";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { educatorStudents, user } from "@/lib/schema";
import { auth } from "@/lib/auth";


export async function POST(req: NextRequest) {
  try {
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
    
    // Get studentId from request body
    const { studentId } = await req.json();
    
    if (!studentId) {
      return NextResponse.json(
        { error: "Student ID is required" },
        { status: 400 }
      );
    }

    // Check if relationship already exists
    const existing = await db
      .select()
      .from(educatorStudents)
      .where(
        and(
          eq(educatorStudents.educatorId, educatorId),
          eq(educatorStudents.studentId, studentId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json({
        message: "Relationship already exists",
        exists: true
      });
    }

    // Create the relationship
    await db.insert(educatorStudents).values({
      id: crypto.randomUUID(),
      educatorId,
      studentId,
      status: "active",
      enrolledAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: "Student added to educator successfully"
    });

  } catch (error) {
    // [REMOVED: Console statement for performance]
    return NextResponse.json(
      { error: "Failed to add student" },
      { status: 500 }
    );
  }
}