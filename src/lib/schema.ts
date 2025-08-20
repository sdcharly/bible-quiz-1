import { pgTable, text, timestamp, boolean, integer, jsonb, pgEnum, real } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["educator", "student"]);
export const quizStatusEnum = pgEnum("quiz_status", ["draft", "published", "completed", "archived"]);
export const documentStatusEnum = pgEnum("document_status", ["pending", "processing", "processed", "failed"]);
export const enrollmentStatusEnum = pgEnum("enrollment_status", ["enrolled", "in_progress", "completed", "abandoned"]);
export const difficultyEnum = pgEnum("difficulty", ["easy", "intermediate", "hard"]);
export const bloomsLevelEnum = pgEnum("blooms_level", ["knowledge", "comprehension", "application", "analysis", "synthesis", "evaluation"]);

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  role: userRoleEnum("role").notNull().default("student"),
  phoneNumber: text("phone_number"),
  emailVerified: boolean("emailVerified"),
  image: text("image"),
  timezone: text("timezone").notNull().default("Asia/Kolkata"), // Default to IST for Indian users
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
  startTime: timestamp("start_time").notNull(),
  timezone: text("timezone").notNull().default("Asia/Kolkata"), // Quiz timezone for accurate scheduling
  duration: integer("duration").notNull(), // in minutes
  status: quizStatusEnum("status").notNull().default("draft"),
  totalQuestions: integer("total_questions").notNull(),
  passingScore: real("passing_score").default(70),
  shuffleQuestions: boolean("shuffle_questions").default(false),
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

export const enrollments = pgTable("enrollments", {
  id: text("id").primaryKey(),
  quizId: text("quiz_id").notNull().references(() => quizzes.id, { onDelete: "cascade" }),
  studentId: text("student_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  enrolledAt: timestamp("enrolled_at").notNull().defaultNow(),
  status: enrollmentStatusEnum("status").notNull().default("enrolled"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
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
