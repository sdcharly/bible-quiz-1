import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invitations, user, quizzes, educatorStudents, quizShareLinks } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import * as crypto from "crypto";
import { sendEmail, emailTemplates } from "@/lib/email-service";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { createShortUrl, getShortUrl } from "@/lib/link-shortener";

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
    
    const actualEducatorId = session.user.id;
    
    const body = await req.json();
    const { emails, quizId } = body;

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json(
        { error: "Email addresses are required" },
        { status: 400 }
      );
    }

    // Verify educator exists
    const educator = await db
      .select()
      .from(user)
      .where(eq(user.id, actualEducatorId))
      .limit(1);

    if (!educator.length || educator[0].role !== "educator") {
      return NextResponse.json(
        { error: "Invalid educator" },
        { status: 403 }
      );
    }

    const educatorData = educator[0];

    // If quizId is provided, verify the quiz exists and belongs to the educator
    if (quizId) {
      const quiz = await db
        .select()
        .from(quizzes)
        .where(eq(quizzes.id, quizId))
        .limit(1);

      if (!quiz.length || quiz[0].educatorId !== actualEducatorId) {
        return NextResponse.json(
          { error: "Quiz not found or doesn't belong to educator" },
          { status: 404 }
        );
      }
    }

    // Get quiz details if provided
    let quizDetails = null;
    if (quizId) {
      const quiz = await db
        .select()
        .from(quizzes)
        .where(eq(quizzes.id, quizId))
        .limit(1);
      
      if (quiz.length) {
        quizDetails = quiz[0];
      }
    }

    const createdInvitations = [];
    const errors = [];

    for (const email of emails) {
      try {
        const normalizedEmail = email.toLowerCase().trim();
        
        // Check if user already exists
        const existingUser = await db
          .select()
          .from(user)
          .where(eq(user.email, normalizedEmail))
          .limit(1);

        if (existingUser.length > 0) {
          // User exists - check if already connected to educator
          const existingRelation = await db
            .select()
            .from(educatorStudents)
            .where(
              and(
                eq(educatorStudents.educatorId, actualEducatorId),
                eq(educatorStudents.studentId, existingUser[0].id)
              )
            )
            .limit(1);

          if (!existingRelation.length) {
            // Add educator-student relationship
            await db.insert(educatorStudents).values({
              id: crypto.randomUUID(),
              educatorId: actualEducatorId,
              studentId: existingUser[0].id,
              status: "active",
              enrolledAt: new Date(),
              updatedAt: new Date(),
            });
          } else if (existingRelation[0].status === "inactive") {
            // Reactivate if inactive
            await db
              .update(educatorStudents)
              .set({ status: "active", updatedAt: new Date() })
              .where(eq(educatorStudents.id, existingRelation[0].id));
          }

          // If quiz is provided, send quiz assignment email with share link
          if (quizDetails) {
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
                educatorId: actualEducatorId,
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
            
            // Use short URL if available, otherwise use full share URL
            // Add UTM parameters for email tracking
            const baseUrl = shortUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'https://biblequiz.textr.in'}/quiz/share/${shareCode}`;
            const quizUrl = `${baseUrl}?utm_source=email&utm_medium=assignment&utm_campaign=quiz_invite`;
            
            const emailContent = emailTemplates.existingUserInvitation(
              educatorData.name || "Your Educator",
              existingUser[0].name || "Student",
              quizDetails.title,
              quizUrl
            );

            await sendEmail({
              to: normalizedEmail,
              subject: emailContent.subject,
              html: emailContent.html,
              text: emailContent.text,
            });

            createdInvitations.push({
              email,
              userExists: true,
              message: "Quiz assignment sent to existing user",
              quizAssigned: true
            });
          } else {
            // Just notify about being added to class
            const emailContent = emailTemplates.studentAddedNotification(
              educatorData.name || "Your Educator",
              existingUser[0].name || "Student"
            );

            await sendEmail({
              to: normalizedEmail,
              subject: emailContent.subject,
              html: emailContent.html,
              text: emailContent.text,
            });

            createdInvitations.push({
              email,
              userExists: true,
              message: "Added to your class and notified"
            });
          }
        } else {
          // New user - create invitation
          const token = crypto.randomBytes(32).toString("hex");
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

          // Create invitation record
          await db.insert(invitations).values({
            id: crypto.randomUUID(),
            educatorId: actualEducatorId,
            quizId: quizId || null,
            email: normalizedEmail,
            token,
            status: "pending",
            expiresAt,
            createdAt: new Date(),
          });

          // Send invitation email
          let invitationUrl: string;
          
          if (quizDetails && quizId) {
            // If quiz is provided, use share link which will handle signup flow
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
                educatorId: actualEducatorId,
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
            
            // Use short URL if available, with email parameter for pre-filling signup
            // Add UTM parameters for email tracking
            const baseUrl = shortUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'https://biblequiz.textr.in'}/quiz/share/${shareCode}`;
            invitationUrl = `${baseUrl}?email=${encodeURIComponent(normalizedEmail)}&utm_source=email&utm_medium=invitation&utm_campaign=quiz_invite`;
          } else {
            // No quiz specified, use regular invitation flow
            invitationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/signup?invitation=${token}`;
          }
          
          const emailContent = emailTemplates.newUserInvitation(
            educatorData.name || "Your Educator",
            invitationUrl,
            quizDetails?.title
          );

          await sendEmail({
            to: normalizedEmail,
            subject: emailContent.subject,
            html: emailContent.html,
            text: emailContent.text,
          });

          createdInvitations.push({
            email,
            token,
            invitationUrl,
            userExists: false,
            message: "Invitation sent to new user"
          });
        }
        
      } catch (error) {
        console.error(`Error processing invitation for ${email}:`, error);
        const errorMessage = error instanceof Error ? error.message : "Failed to process invitation";
        errors.push({ email, error: errorMessage });
      }
    }

    return NextResponse.json({
      success: true,
      invitations: createdInvitations,
      errors,
      message: `Successfully sent ${createdInvitations.length} invitation(s)`,
    });

  } catch (error) {
    console.error("Error sending invitations:", error);
    return NextResponse.json(
      { error: "Failed to send invitations" },
      { status: 500 }
    );
  }
}