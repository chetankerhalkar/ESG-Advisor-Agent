import { eq, desc, and, sql, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { 
  users, InsertUser,
  companies, InsertCompany,
  documents, InsertDocument,
  esgMetrics, InsertESGMetric,
  findings, InsertFinding,
  actions, InsertAction,
  runs, InsertRun,
  evalLabels, InsertEvalLabel
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db) {
    try {
      const client = createClient({
        url: "file:./esg-agent.db3",
      });
      _db = drizzle(client);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    // Check if user exists
    const existing = await db.select().from(users).where(eq(users.openId, user.openId)).limit(1);
    
    if (existing.length > 0) {
      // Update existing user
      const updateData: any = {
        updatedAt: new Date(),
        lastSignedIn: user.lastSignedIn || new Date(),
      };
      
      if (user.name !== undefined) updateData.name = user.name;
      if (user.email !== undefined) updateData.email = user.email;
      if (user.loginMethod !== undefined) updateData.loginMethod = user.loginMethod;
      if (user.role !== undefined) updateData.role = user.role;
      else if (user.openId === ENV.ownerOpenId) updateData.role = 'admin';
      
      await db.update(users).set(updateData).where(eq(users.openId, user.openId));
    } else {
      // Insert new user
      const insertData: InsertUser = {
        openId: user.openId,
        name: user.name,
        email: user.email,
        loginMethod: user.loginMethod,
        role: user.openId === ENV.ownerOpenId ? 'admin' : (user.role || 'user'),
        lastSignedIn: user.lastSignedIn || new Date(),
      };
      
      await db.insert(users).values(insertData);
    }
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Company operations
export async function getAllCompanies() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(companies).orderBy(desc(companies.createdAt));
}

export async function getCompanyById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(companies).where(eq(companies.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function findCompanyByName(name: string) {
  const db = await getDb();
  if (!db) return undefined;

  const normalized = name.trim();
  if (!normalized) return undefined;

  try {
    const exactMatch = await db
      .select()
      .from(companies)
      .where(sql`lower(${companies.name}) = ${normalized.toLowerCase()}`)
      .limit(1);

    if (exactMatch.length > 0) {
      return exactMatch[0];
    }

    const partialMatch = await db
      .select()
      .from(companies)
      .where(like(companies.name, `%${normalized}%`))
      .limit(1);

    return partialMatch.length > 0 ? partialMatch[0] : undefined;
  } catch (error) {
    console.error("[Database] Failed to find company by name:", error);
    return undefined;
  }
}

export async function createCompany(data: InsertCompany) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(companies).values(data).returning();
  return result[0];
}

// Document operations
export async function getCompanyDocuments(companyId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(documents).where(eq(documents.companyId, companyId)).orderBy(desc(documents.uploadedAt));
}

export async function createDocument(data: InsertDocument) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(documents).values(data).returning();
  return result[0];
}

export async function updateDocumentStatus(id: number, status: "pending" | "processing" | "completed" | "failed") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(documents).set({ status }).where(eq(documents.id, id));
}

// Run operations
export async function createRun(data: InsertRun) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(runs).values(data).returning();
  return result[0];
}

export async function updateRun(id: number, data: Partial<InsertRun>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(runs).set(data).where(eq(runs.id, id));
}

export async function getRunById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(runs).where(eq(runs.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getCompanyRuns(companyId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(runs).where(eq(runs.companyId, companyId)).orderBy(desc(runs.startedAt));
}

// ESG Metrics operations
export async function createESGMetric(data: InsertESGMetric) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(esgMetrics).values(data).returning();
  return result[0];
}

export async function getRunMetrics(runId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(esgMetrics).where(eq(esgMetrics.runId, runId));
}

// Findings operations
export async function createFinding(data: InsertFinding) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(findings).values(data).returning();
  return result[0];
}

export async function getRunFindings(runId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(findings).where(eq(findings.runId, runId)).orderBy(desc(findings.severity));
}

export async function getCompanyFindings(companyId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(findings).where(eq(findings.companyId, companyId)).orderBy(desc(findings.createdAt));
}

// Actions operations
export async function createAction(data: InsertAction) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(actions).values(data).returning();
  return result[0];
}

export async function getRunActions(runId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(actions).where(eq(actions.runId, runId)).orderBy(desc(actions.priority));
}

export async function getCompanyActions(companyId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(actions).where(eq(actions.companyId, companyId)).orderBy(desc(actions.createdAt));
}

export async function updateActionStatus(id: number, status: "proposed" | "approved" | "rejected" | "in_progress" | "completed") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(actions).set({ status, updatedAt: new Date() }).where(eq(actions.id, id));
}

// Evaluation labels operations
export async function createEvalLabel(data: InsertEvalLabel) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(evalLabels).values(data).returning();
  return result[0];
}

export async function getRunEvalLabels(runId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(evalLabels).where(eq(evalLabels.runId, runId));
}
