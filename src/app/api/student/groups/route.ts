import { NextRequest, NextResponse } from "next/server";
import { eq, and, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { studentGroups, groupMembers, user, groupEnrollments, quizzes } from "@/lib/schema";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import crypto from 'crypto';

// Cache configuration
const CACHE_TTL = 300; // 5 minutes in seconds
const CACHE_REVALIDATE = 60; // 1 minute stale-while-revalidate

function generateETag(data: any): string {
  return crypto
    .createHash('md5')
    .update(JSON.stringify(data))
    .digest('hex');
}

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Get session
    const session = await auth.api.getSession({
      headers: await headers()
    });

    // Require authenticated student
    if (!session?.user || session.user.role !== 'student') {
      return NextResponse.json(
        { error: "Unauthorized - Student access required" },
        { status: 401 }
      );
    }
    
    const studentId = session.user.id;

    // Check if client has cached version (ETag)
    const ifNoneMatch = req.headers.get('if-none-match');
    
    // Fetch all groups the student belongs to
    const groups = await db
      .select({
        groupId: studentGroups.id,
        groupName: studentGroups.name,
        groupDescription: studentGroups.description,
        groupColor: studentGroups.color,
        groupTheme: studentGroups.theme,
        joinedAt: groupMembers.joinedAt,
        role: groupMembers.role,
        educatorId: studentGroups.educatorId,
        educatorName: user.name,
        educatorEmail: user.email,
        // Get member count
        memberCount: sql<number>`(
          SELECT COUNT(*)::int 
          FROM ${groupMembers} gm
          WHERE gm.group_id = ${studentGroups.id} 
          AND gm.is_active = true
        )`.as('memberCount'),
        // Get assigned quiz count
        assignedQuizzes: sql<number>`(
          SELECT COUNT(*)::int 
          FROM ${groupEnrollments} ge
          WHERE ge.group_id = ${studentGroups.id}
        )`.as('assignedQuizzes')
      })
      .from(groupMembers)
      .innerJoin(studentGroups, eq(groupMembers.groupId, studentGroups.id))
      .innerJoin(user, eq(studentGroups.educatorId, user.id))
      .where(
        and(
          eq(groupMembers.studentId, studentId),
          eq(groupMembers.isActive, true),
          eq(studentGroups.isActive, true)
        )
      )
      .orderBy(groupMembers.joinedAt);

    // Get recent group-assigned quizzes
    const recentGroupQuizzes = await db
      .select({
        quizId: quizzes.id,
        quizTitle: quizzes.title,
        groupId: studentGroups.id,
        groupName: studentGroups.name,
        groupColor: studentGroups.color,
        startTime: quizzes.startTime,
        duration: quizzes.duration,
        totalQuestions: quizzes.totalQuestions
      })
      .from(groupEnrollments)
      .innerJoin(studentGroups, eq(groupEnrollments.groupId, studentGroups.id))
      .innerJoin(quizzes, eq(groupEnrollments.quizId, quizzes.id))
      .innerJoin(groupMembers, and(
        eq(groupMembers.groupId, studentGroups.id),
        eq(groupMembers.studentId, studentId),
        eq(groupMembers.isActive, true)
      ))
      .where(eq(quizzes.status, "published"))
      .orderBy(quizzes.startTime)
      .limit(5);

    const responseData = {
      groups,
      recentGroupQuizzes,
      stats: {
        totalGroups: groups.length,
        totalGroupQuizzes: recentGroupQuizzes.length
      }
    };

    // Generate ETag for this response
    const etag = `"${generateETag({ studentId, data: responseData })}"`;
    
    // Check if client's cached version matches
    if (ifNoneMatch === etag) {
      logger.debug('Groups API: Returning 304 Not Modified');
      return new NextResponse(null, {
        status: 304,
        headers: {
          'ETag': etag,
          'Cache-Control': `private, max-age=${CACHE_TTL}, stale-while-revalidate=${CACHE_REVALIDATE}`,
          'Last-Modified': new Date().toUTCString(),
          'Vary': 'Accept-Encoding, Authorization',
          'X-Response-Time': String(Date.now() - startTime),
        }
      });
    }

    const responseTime = Date.now() - startTime;
    logger.debug('Groups API: Returning fresh data', { responseTime, groupCount: groups.length });

    return NextResponse.json(responseData, {
      headers: {
        // Browser caching headers
        'Cache-Control': `private, max-age=${CACHE_TTL}, stale-while-revalidate=${CACHE_REVALIDATE}`,
        'ETag': etag,
        'Last-Modified': new Date().toUTCString(),
        
        // Performance headers
        'X-Response-Time': String(responseTime),
        'X-Groups-Count': String(groups.length),
        
        // Security headers
        'X-Content-Type-Options': 'nosniff',
        'Vary': 'Accept-Encoding, Authorization',
      }
    });

  } catch (error) {
    logger.error("Error fetching student groups:", error);
    
    // Don't cache error responses
    return NextResponse.json(
      { error: "Failed to fetch groups" },
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-store',
          'X-Response-Time': String(Date.now() - startTime),
        }
      }
    );
  }
}