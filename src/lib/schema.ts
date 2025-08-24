import { pgTable, text, timestamp, boolean, integer, jsonb, pgEnum, real } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["admin", "educator", "student", "pending_educator"]);
export const quizStatusEnum = pgEnum("quiz_status", ["draft", "published", "completed", "archived"]);
export const documentStatusEnum = pgEnum("document_status", ["pending", "processing", "processed", "failed", "deleted"]);
export const approvalStatusEnum = pgEnum("approval_status", ["pending", "approved", "rejected", "suspended"]);
export const enrollmentStatusEnum = pgEnum("enrollment_status", ["enrolled", "in_progress", "completed", "abandoned"]);
export const difficultyEnum = pgEnum("difficulty", ["easy", "intermediate", "hard"]);
export const bloomsLevelEnum = pgEnum("blooms_level", ["knowledge", "comprehension", "application", "analysis", "synthesis", "evaluation"]);

// Permission templates table (defined before user table)
export const permissionTemplates = pgTable("permission_templates", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  permissions: jsonb("permissions").notNull().default({}).$type<{
    canPublishQuiz: boolean;
    canAddStudents: boolean;
    canEditQuiz: boolean;
    canDeleteQuiz: boolean;
    canViewAnalytics: boolean;
    canExportData: boolean;
    maxStudents: number;
    maxQuizzes: number;
    maxQuestionsPerQuiz: number;
  }>(),
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const user: any = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  role: userRoleEnum("role").notNull().default("student"),
  phoneNumber: text("phone_number"),
  emailVerified: boolean("emailVerified"),
  image: text("image"),
  timezone: text("timezone").notNull().default("Asia/Kolkata"), // Default to IST for Indian users
  approvalStatus: approvalStatusEnum("approval_status").notNull().default("pending"),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  approvedBy: text("approved_by").references((): any => user.id),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  permissionTemplateId: text("permission_template_id").references(() => permissionTemplates.id),
  permissions: jsonb("permissions").default({}).$type<{
    canPublishQuiz?: boolean;
    canAddStudents?: boolean;
    canEditQuiz?: boolean;
    canDeleteQuiz?: boolean;
    canViewAnalytics?: boolean;
    canExportData?: boolean;
    maxStudents?: number;
    maxQuizzes?: number;
    maxQuestionsPerQuiz?: number;
  }>(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expiresAt").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

export const documents = pgTable("documents", {
  id: text("id").primaryKey(),
  educatorId: text("educator_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  filename: text("filename").notNull(),
  filePath: text("file_path").notNull(),
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  processedData: jsonb("processed_data"),
  displayName: text("display_name"), // Custom name for user reference
  remarks: text("remarks"), // User notes/remarks about the document
  status: documentStatusEnum("status").notNull().default("pending"),
  lightragProcessingStatus: jsonb("lightrag_processing_status").$type<{
    busy: boolean;
    jobName?: string;
    jobStart?: string;
    docs: number;
    batches: number;
    currentBatch: number;
    totalChunks?: number;
    processedChunks?: number;
    latestMessage?: string;
    lastChecked?: string;
  }>(),
  processingStartedAt: timestamp("processing_started_at"),
  processingCompletedAt: timestamp("processing_completed_at"),
  uploadDate: timestamp("upload_date").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const quizzes = pgTable("quizzes", {
  id: text("id").primaryKey(),
  educatorId: text("educator_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  documentIds: jsonb("document_ids").notNull().$type<string[]>(),
  configuration: jsonb("configuration").notNull(),
  startTime: timestamp("start_time"), // Made nullable for deferred scheduling
  timezone: text("timezone").notNull().default("Asia/Kolkata"), // Quiz timezone for accurate scheduling
  duration: integer("duration").notNull(), // in minutes
  status: quizStatusEnum("status").notNull().default("draft"),
  totalQuestions: integer("total_questions").notNull(),
  shuffleQuestions: boolean("shuffle_questions").default(false),
  
  // Phase 1: New columns for deferred time support
  timeConfiguration: jsonb("time_configuration").$type<{
    startTime?: string;
    timezone?: string;
    duration?: number;
    configuredAt?: string;
    configuredBy?: string;
    isLegacy?: boolean;
  }>(),
  schedulingStatus: text("scheduling_status").default("legacy"),
  scheduledBy: text("scheduled_by"),
  scheduledAt: timestamp("scheduled_at"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const questions = pgTable("questions", {
  id: text("id").primaryKey(),
  quizId: text("quiz_id").notNull().references(() => quizzes.id, { onDelete: "cascade" }),
  questionText: text("question_text").notNull(),
  options: jsonb("options").notNull().$type<{text: string, id: string}[]>(),
  correctAnswer: text("correct_answer").notNull(),
  explanation: text("explanation"),
  difficulty: difficultyEnum("difficulty"),
  bloomsLevel: bloomsLevelEnum("blooms_level"),
  topic: text("topic"),
  book: text("book"),
  chapter: text("chapter"),
  orderIndex: integer("order_index").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Student groups for better organization (moved before enrollments for reference)
export const studentGroups = pgTable("student_groups", {
  id: text("id").primaryKey(),
  educatorId: text("educator_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  theme: text("theme").notNull().default("biblical"), // Theme for group naming
  color: text("color").default("#3B82F6"), // For UI distinction
  maxSize: integer("max_size").default(30),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Group enrollments for tracking group-based quiz assignments (moved before enrollments for reference)
export const groupEnrollments = pgTable("group_enrollments", {
  id: text("id").primaryKey(),
  groupId: text("group_id").notNull().references(() => studentGroups.id, { onDelete: "cascade" }),
  quizId: text("quiz_id").notNull().references(() => quizzes.id, { onDelete: "cascade" }),
  enrolledBy: text("enrolled_by").notNull().references(() => user.id),
  enrolledAt: timestamp("enrolled_at").notNull().defaultNow(),
  sendNotifications: boolean("send_notifications").default(true),
  excludedStudentIds: jsonb("excluded_student_ids").$type<string[]>().default([]), // Students to exclude from this group enrollment
});

export const enrollments = pgTable("enrollments", {
  id: text("id").primaryKey(),
  quizId: text("quiz_id").notNull().references(() => quizzes.id, { onDelete: "cascade" }),
  studentId: text("student_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  enrolledAt: timestamp("enrolled_at").notNull().defaultNow(),
  status: enrollmentStatusEnum("status").notNull().default("enrolled"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  // Group enrollment tracking
  groupEnrollmentId: text("group_enrollment_id").references(() => groupEnrollments.id),
  // Reassignment tracking fields
  isReassignment: boolean("is_reassignment").default(false),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parentEnrollmentId: text("parent_enrollment_id").references((): any => enrollments.id),
  reassignmentReason: text("reassignment_reason"),
  reassignedAt: timestamp("reassigned_at"),
  reassignedBy: text("reassigned_by").references(() => user.id),
});

export const quizAttempts = pgTable("quiz_attempts", {
  id: text("id").primaryKey(),
  quizId: text("quiz_id").notNull().references(() => quizzes.id, { onDelete: "cascade" }),
  studentId: text("student_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  enrollmentId: text("enrollment_id").references(() => enrollments.id, { onDelete: "cascade" }),
  answers: jsonb("answers").notNull().$type<{questionId: string, answer: string, timeSpent: number}[]>().default([]),
  score: real("score"),
  totalCorrect: integer("total_correct"),
  totalQuestions: integer("total_questions"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  timeSpent: integer("time_spent"), // in seconds
  timezone: text("timezone").notNull().default("Asia/Kolkata"), // User's timezone when they took the quiz
  status: text("status").notNull().default("in_progress"), // in_progress, completed, abandoned
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const questionResponses = pgTable("question_responses", {
  id: text("id").primaryKey(),
  attemptId: text("attempt_id").notNull().references(() => quizAttempts.id, { onDelete: "cascade" }),
  questionId: text("question_id").notNull().references(() => questions.id, { onDelete: "cascade" }),
  selectedAnswer: text("selected_answer"),
  isCorrect: boolean("is_correct"),
  timeSpent: integer("time_spent"), // in seconds
  markedForReview: boolean("marked_for_review").default(false),
  answeredAt: timestamp("answered_at").defaultNow(),
});

// New tables for educator-student management
export const educatorStudents = pgTable("educator_students", {
  id: text("id").primaryKey(),
  educatorId: text("educator_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  studentId: text("student_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("active"), // active, inactive
  enrolledAt: timestamp("enrolled_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const invitations = pgTable("invitations", {
  id: text("id").primaryKey(),
  educatorId: text("educator_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  quizId: text("quiz_id").references(() => quizzes.id, { onDelete: "cascade" }), // Optional: specific quiz invitation
  email: text("email").notNull(),
  token: text("token").notNull().unique(),
  status: text("status").notNull().default("pending"), // pending, accepted, expired
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Activity tracking for audit trail
export const activityLogs = pgTable("activity_logs", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
  actionType: text("action_type").notNull(), // login, logout, approve_educator, reject_educator, etc.
  entityType: text("entity_type").notNull(), // user, quiz, document, etc.
  entityId: text("entity_id"),
  details: jsonb("details").$type<Record<string, unknown>>(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Admin settings for system configuration
export const adminSettings = pgTable("admin_settings", {
  id: text("id").primaryKey(),
  settingKey: text("setting_key").notNull().unique(),
  settingValue: jsonb("setting_value").notNull().$type<unknown>(),
  description: text("description"),
  updatedBy: text("updated_by").references(() => user.id),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Quiz share links for easy sharing via chat apps
export const quizShareLinks = pgTable("quiz_share_links", {
  id: text("id").primaryKey(),
  quizId: text("quiz_id").notNull().references(() => quizzes.id, { onDelete: "cascade" }),
  educatorId: text("educator_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  shareCode: text("share_code").notNull().unique(), // Short unique code for the URL
  shortUrl: text("short_url"), // Optional shortened URL
  expiresAt: timestamp("expires_at"), // Optional expiration
  clickCount: integer("click_count").default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Group members (many-to-many relationship)
export const groupMembers = pgTable("group_members", {
  id: text("id").primaryKey(),
  groupId: text("group_id").notNull().references(() => studentGroups.id, { onDelete: "cascade" }),
  studentId: text("student_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
  role: text("role").notNull().default("member"), // member, leader (future)
  isActive: boolean("is_active").default(true),
  addedBy: text("added_by").notNull().references(() => user.id),
  removedAt: timestamp("removed_at"),
  removedBy: text("removed_by").references(() => user.id),
});
