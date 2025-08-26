import { NextRequest, NextResponse } from "next/server";
import { eq, and, inArray } from "drizzle-orm";
import * as crypto from "crypto";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { enrollments, educatorStudents, user, quizzes, quizShareLinks } from "@/lib/schema";
import { sendEmail, emailTemplates } from "@/lib/email-service";
import { createShortUrl, getShortUrl } from "@/lib/link-shortener";
import { auth } from "@/lib/auth";
import { getQuizAvailabilityStatus } from "@/lib/quiz-scheduling";


export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const quizId = params.id;
    const { studentIds, enrollAll, sendNotifications = false } = await req.json();

    // Check if quiz exists and is published
    const quiz = await db
      .select()
      .from(quizzes)
      .where(eq(quizzes.id, quizId))
      .limit(1);

    if (!quiz.length) {
      return NextResponse.json(
        { error: "Quiz not found" },
        { status: 404 }
      );
    }

    if (quiz[0].status !== "published") {
      return NextResponse.json(
        { error: "Quiz must be published before enrolling students" },
        { status: 400 }
      );
    }

    // Check if quiz has expired
    const quizWithStatus = {
      ...quiz[0],
      schedulingStatus: quiz[0].schedulingStatus || 'legacy'
    };
    const availability = getQuizAvailabilityStatus(quizWithStatus);
    if (availability.status === 'ended') {
      const endTime = availability.endTime ? new Date(availability.endTime).toLocaleString() : 'unknown';
      return NextResponse.json(
        { 
          error: `Cannot enroll students in an expired quiz. This quiz ended on ${endTime}.`,
          suggestion: "You can create a new quiz with the same content or use the reassignment feature for specific students who missed the original deadline."
        },
        { status: 400 }
      );
    }

    const educatorId = quiz[0].educatorId;
    let studentsToEnroll: string[] = [];

    if (enrollAll) {
      // Get all active students under this educator
      const allStudents = await db
        .select({ studentId: educatorStudents.studentId })
        .from(educatorStudents)
        .where(
          and(
            eq(educatorStudents.educatorId, educatorId),
            eq(educatorStudents.status, "active")
          )
        );
      
      studentsToEnroll = allStudents.map(s => s.studentId);
    } else if (studentIds && Array.isArray(studentIds)) {
      // Verify that all provided student IDs belong to this educator
      const validStudents = await db
        .select({ studentId: educatorStudents.studentId })
        .from(educatorStudents)
        .where(
          and(
            eq(educatorStudents.educatorId, educatorId),
            inArray(educatorStudents.studentId, studentIds)
          )
        );
      
      studentsToEnroll = validStudents.map(s => s.studentId);
    } else {
      return NextResponse.json(
        { error: "No students specified for enrollment" },
        { status: 400 }
      );
    }

    // Check existing enrollments
    const existingEnrollments = await db
      .select({ studentId: enrollments.studentId })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.quizId, quizId),
          inArray(enrollments.studentId, studentsToEnroll)
        )
      );

    const alreadyEnrolled = new Set(existingEnrollments.map(e => e.studentId));
    const newEnrollments = studentsToEnroll.filter(id => !alreadyEnrolled.has(id));

    // Create new enrollments
    const enrollmentRecords = [];
    for (const studentId of newEnrollments) {
      enrollmentRecords.push({
        id: crypto.randomUUID(),
        quizId,
        studentId,
        enrolledAt: new Date(),
        status: "enrolled" as const,
      });
    }

    if (enrollmentRecords.length > 0) {
      await db.insert(enrollments).values(enrollmentRecords);
    }

    // Get student details for response (including timezone for emails)
    const enrolledStudentDetails = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        timezone: user.timezone,
      })
      .from(user)
      .where(inArray(user.id, newEnrollments));

    // Send email notifications if requested
    if (sendNotifications && newEnrollments.length > 0) {
      // Get educator details
      const session = await auth.api.getSession({
        headers: await headers()
      });
      
      const educatorId = session?.user?.id || quiz[0].educatorId;
      const [educator] = await db
        .select()
        .from(user)
        .where(eq(user.id, educatorId));
      
      // Get or create share link for this quiz
      const shareLink = await db
        .select()
        .from(quizShareLinks)
        .where(eq(quizShareLinks.quizId, quizId))
        .limit(1);

      let shareCode: string;
      let shortUrl: string | null = null;
      
      if (shareLink.length === 0) {
        // Create new share link
        shareCode = crypto.randomBytes(4).toString('hex').toUpperCase();
        const id = crypto.randomUUID();
        
        await db.insert(quizShareLinks).values({
          id,
          quizId,
          educatorId: quiz[0].educatorId,
          shareCode,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        // Generate short URL
        const shortCode = await createShortUrl(shareCode);
        shortUrl = shortCode ? getShortUrl(shortCode) : null;
      } else {
        shareCode = shareLink[0].shareCode;
        if (!shareLink[0].shortUrl) {
          const shortCode = await createShortUrl(shareCode);
          shortUrl = shortCode ? getShortUrl(shortCode) : null;
        } else {
          shortUrl = getShortUrl(shareLink[0].shortUrl);
        }
      }
      
      // Send emails to all newly enrolled students
      const emailPromises = enrolledStudentDetails.map(async (student) => {
        const quizUrl = shortUrl || (shareCode ? `${process.env.NEXT_PUBLIC_APP_URL}/quiz/share/${shareCode}` : undefined);
        
        const emailContent = emailTemplates.quizEnrollmentNotification(
          student.name || "Student",
          educator?.name || "Your Educator",
          quiz[0].title,
          quiz[0].description,
          quiz[0].totalQuestions,
          quiz[0].duration,
          quiz[0].startTime ? new Date(quiz[0].startTime) : null,
          undefined, // No group name for individual bulk enrollments
          quizUrl,
          student.timezone // Pass student's timezone for proper time display
        );
        
        return sendEmail({
          to: student.email,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
        });
      });
      
      // Send emails in parallel but don't wait for them
      Promise.all(emailPromises).catch(error => {
        // [REMOVED: Console statement for performance]
      });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully enrolled ${newEnrollments.length} student(s)${sendNotifications ? ' and sent notifications' : ''}`,
      enrolledCount: newEnrollments.length,
      alreadyEnrolledCount: alreadyEnrolled.size,
      enrolledStudents: enrolledStudentDetails,
      notificationsSent: sendNotifications
    });

  } catch (error) {
    // [REMOVED: Console statement for performance]
    return NextResponse.json(
      { error: "Failed to enroll students" },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch educator's students for selection
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const quizId = params.id;

    // Get quiz to find educator
    const quiz = await db
      .select()
      .from(quizzes)
      .where(eq(quizzes.id, quizId))
      .limit(1);

    if (!quiz.length) {
      return NextResponse.json(
        { error: "Quiz not found" },
        { status: 404 }
      );
    }

    const educatorId = quiz[0].educatorId;

    // Get all students under this educator
    const students = await db
      .select({
        studentId: educatorStudents.studentId,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
      })
      .from(educatorStudents)
      .innerJoin(user, eq(educatorStudents.studentId, user.id))
      .where(
        and(
          eq(educatorStudents.educatorId, educatorId),
          eq(educatorStudents.status, "active")
        )
      );

    // Check which students are already enrolled
    const enrollmentStatus = await db
      .select({ studentId: enrollments.studentId })
      .from(enrollments)
      .where(eq(enrollments.quizId, quizId));

    const enrolledSet = new Set(enrollmentStatus.map(e => e.studentId));

    const studentsWithEnrollment = students.map(student => ({
      ...student,
      isEnrolled: enrolledSet.has(student.studentId),
    }));

    return NextResponse.json({
      students: studentsWithEnrollment,
      total: students.length,
      enrolled: enrolledSet.size,
    });

  } catch (error) {
    // [REMOVED: Console statement for performance]
    return NextResponse.json(
      { error: "Failed to fetch students" },
      { status: 500 }
    );
  }
}