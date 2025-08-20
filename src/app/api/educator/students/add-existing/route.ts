import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { educatorStudents, user } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import * as crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    // For initial setup, let's add the existing student to the educator
    const educatorId = "MMlI6NJuBNVBAEL7J4TyAX4ncO1ikns2";
    const studentId = "UeqiVFam4rO2P9KbbnwqofioJxZoQdvf";

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
    console.error("Error adding student:", error);
    return NextResponse.json(
      { error: "Failed to add student" },
      { status: 500 }
    );
  }
}