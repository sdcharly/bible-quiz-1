import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "@/lib/db";
import { user, activityLogs } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { getSessionConfig } from "@/lib/session-config";

const ADMIN_SESSION_COOKIE = "admin_session";
const DEFAULT_SESSION_DURATION = 30 * 60 * 1000; // 30 minutes fallback

interface AdminSession {
  id: string;
  email: string;
  role: "admin";
  exp: number;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createAdminSession(adminId: string, email: string): Promise<string> {
  // Get session timeout from configuration
  const sessionConfig = await getSessionConfig();
  const sessionDuration = sessionConfig.adminSessionTimeout || DEFAULT_SESSION_DURATION;
  
  const session: AdminSession = {
    id: adminId,
    email,
    role: "admin",
    exp: Math.floor(Date.now() / 1000) + (sessionDuration / 1000) // JWT exp is in seconds
  };

  const token = jwt.sign(session, process.env.SUPER_ADMIN_SECRET_KEY!);

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: sessionDuration / 1000,
    path: "/" // Changed from "/admin" to "/" to allow API access
  });

  return token;
}

export async function getAdminSession(): Promise<AdminSession | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

    if (!token) return null;

    const session = jwt.verify(token, process.env.SUPER_ADMIN_SECRET_KEY!) as AdminSession;
    
    // JWT exp is in seconds, so compare with current time in seconds
    if (session.exp < Math.floor(Date.now() / 1000)) {
      await clearAdminSession();
      return null;
    }

    return session;
  } catch (error) {
    console.error("Admin session verification error:", error);
    return null;
  }
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
}

export async function requireAdminAuth() {
  const session = await getAdminSession();
  
  if (!session) {
    throw new Error("Unauthorized - Admin access required");
  }
  
  return session;
}

export async function authenticateSuperAdmin(email: string, password: string): Promise<{ success: boolean; adminId?: string; error?: string }> {
  try {
    // Check if it's the super admin credentials
    if (email !== process.env.SUPER_ADMIN_EMAIL) {
      await logActivity(null, "failed_admin_login", "auth", null, { email, reason: "invalid_email" });
      return { success: false, error: "Invalid credentials" };
    }

    // Hash the environment password for comparison (in production, this should be pre-hashed)
    const envPasswordHash = process.env.SUPER_ADMIN_PASSWORD_HASH || await hashPassword(process.env.SUPER_ADMIN_PASSWORD!);
    
    // Verify the provided password against the hash
    const isPasswordValid = await verifyPassword(password, envPasswordHash);
    if (!isPasswordValid) {
      await logActivity(null, "failed_admin_login", "auth", null, { email, reason: "invalid_password" });
      return { success: false, error: "Invalid credentials" };
    }

    // Check if super admin user exists in database, create if not
    const adminUser = await db.select().from(user).where(eq(user.email, email)).limit(1);
    
    let adminId: string;
    if (adminUser.length === 0) {
      // Create super admin user
      adminId = uuidv4();
      await db.insert(user).values({
        id: adminId,
        email: process.env.SUPER_ADMIN_EMAIL!,
        name: "Super Admin",
        role: "admin",
        approvalStatus: "approved",
        emailVerified: true,
        permissions: {
          canPublishQuiz: true,
          canAddStudents: true,
          canEditQuiz: true,
          canDeleteQuiz: true,
          canViewAnalytics: true,
          canExportData: true,
          maxStudents: -1,
          maxQuizzes: -1,
          maxQuestionsPerQuiz: -1
        }
      });
    } else {
      adminId = adminUser[0].id;
      // Update role to admin if not already
      if (adminUser[0].role !== "admin") {
        await db.update(user)
          .set({ role: "admin", approvalStatus: "approved" })
          .where(eq(user.id, adminId));
      }
    }

    await logActivity(adminId, "admin_login", "auth", adminId, { email });
    return { success: true, adminId };
  } catch (error) {
    console.error("Admin authentication error:", error);
    return { success: false, error: "Authentication failed" };
  }
}

export async function logActivity(
  userId: string | null,
  actionType: string,
  entityType: string,
  entityId: string | null,
  details: Record<string, unknown> = {}
) {
  try {
    await db.insert(activityLogs).values({
      id: uuidv4(),
      userId,
      actionType,
      entityType,
      entityId,
      details,
      ipAddress: null, // Will be set from request headers
      userAgent: null, // Will be set from request headers
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
}

export async function checkAdminExists(): Promise<boolean> {
  const adminUser = await db.select().from(user).where(eq(user.role, "admin")).limit(1);
  return adminUser.length > 0;
}