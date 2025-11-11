import { integer, sqliteTable, text, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 */
export const users = sqliteTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: integer("id").primaryKey({ autoIncrement: true }),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: text("openId").notNull().unique(),
  name: text("name"),
  email: text("email"),
  loginMethod: text("loginMethod"),
  role: text("role", { enum: ["user", "admin"] }).default("user").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  lastSignedIn: integer("lastSignedIn", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Companies table
export const companies = sqliteTable("companies", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  ticker: text("ticker"),
  sector: text("sector"),
  country: text("country"),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export type Company = typeof companies.$inferSelect;
export type InsertCompany = typeof companies.$inferInsert;

// Documents table
export const documents = sqliteTable("documents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("companyId").notNull().references(() => companies.id),
  kind: text("kind", { enum: ["pdf", "csv", "url"] }).notNull(),
  filename: text("filename"),
  url: text("url"),
  content: text("content"), // For storing text content
  status: text("status", { enum: ["pending", "processing", "completed", "failed"] }).default("pending").notNull(),
  uploadedAt: integer("uploadedAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

// ESG Metrics table
export const esgMetrics = sqliteTable("esg_metrics", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("companyId").notNull().references(() => companies.id),
  runId: integer("runId").references(() => runs.id),
  category: text("category", { enum: ["environmental", "social", "governance"] }).notNull(),
  metric: text("metric").notNull(),
  value: real("value").notNull(),
  unit: text("unit"),
  period: text("period"),
  source: text("source"),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export type ESGMetric = typeof esgMetrics.$inferSelect;
export type InsertESGMetric = typeof esgMetrics.$inferInsert;

// Findings table
export const findings = sqliteTable("findings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("companyId").notNull().references(() => companies.id),
  runId: integer("runId").references(() => runs.id),
  category: text("category", { enum: ["environmental", "social", "governance", "general"] }).notNull(),
  severity: text("severity", { enum: ["critical", "high", "medium", "low", "info"] }).default("medium").notNull(),
  summary: text("summary").notNull(),
  details: text("details"),
  evidence: text("evidence"), // JSON string
  isGreenwashing: integer("isGreenwashing", { mode: "boolean" }).default(false).notNull(),
  confidence: real("confidence").default(0.8).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export type Finding = typeof findings.$inferSelect;
export type InsertFinding = typeof findings.$inferInsert;

// Actions table
export const actions = sqliteTable("actions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("companyId").notNull().references(() => companies.id),
  runId: integer("runId").references(() => runs.id),
  findingId: integer("findingId").references(() => findings.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category", { enum: ["environmental", "social", "governance", "general"] }).notNull(),
  priority: text("priority", { enum: ["critical", "high", "medium", "low"] }).default("medium").notNull(),
  estimatedImpact: real("estimatedImpact"), // Expected score improvement
  estimatedCost: text("estimatedCost"),
  timeline: text("timeline"),
  status: text("status", { enum: ["proposed", "approved", "rejected", "in_progress", "completed"] }).default("proposed").notNull(),
  reasoning: text("reasoning"),
  confidence: real("confidence").default(0.8).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export type Action = typeof actions.$inferSelect;
export type InsertAction = typeof actions.$inferInsert;

// Runs table (tracks ESG analysis runs)
export const runs = sqliteTable("runs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("companyId").notNull().references(() => companies.id),
  status: text("status", { enum: ["pending", "running", "completed", "failed"] }).default("pending").notNull(),
  environmentalScore: real("environmentalScore"),
  socialScore: real("socialScore"),
  governanceScore: real("governanceScore"),
  totalScore: real("totalScore"),
  startedAt: integer("startedAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  completedAt: integer("completedAt", { mode: "timestamp" }),
  error: text("error"),
});

export type Run = typeof runs.$inferSelect;
export type InsertRun = typeof runs.$inferInsert;

// Evaluation labels table (for tracking human feedback)
export const evalLabels = sqliteTable("eval_labels", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  runId: integer("runId").notNull().references(() => runs.id),
  findingId: integer("findingId").references(() => findings.id),
  actionId: integer("actionId").references(() => actions.id),
  labelType: text("labelType", { enum: ["accuracy", "relevance", "usefulness", "correctness"] }).notNull(),
  labelValue: text("labelValue", { enum: ["positive", "negative", "neutral"] }).notNull(),
  feedback: text("feedback"),
  userId: text("userId"),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export type EvalLabel = typeof evalLabels.$inferSelect;
export type InsertEvalLabel = typeof evalLabels.$inferInsert;
