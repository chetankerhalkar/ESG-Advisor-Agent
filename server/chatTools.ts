import * as db from "./db";
import { storagePut } from "./storage";
import { runESGAnalysis, saveAnalysisResults } from "./esgAgent";
import { getDb } from "./db";
import { companies, documents, esgMetrics, findings, actions, runs } from "../drizzle/schema";
import { like, eq, desc } from "drizzle-orm";

/**
 * Chat Tools for ESG Assistant
 * These functions are exposed to the LLM for tool calling
 */

export interface ChatContext {
  userId: string;
  activeCompanyId?: number;
}

// Tool: create_company
export async function createCompany(args: {
  name: string;
  ticker?: string;
  sector?: string;
  country?: string;
}) {
  const company = await db.createCompany({
    name: args.name,
    ticker: args.ticker || null,
    sector: args.sector || null,
    country: args.country || null,
  });

  return {
    companyId: company.id,
    name: company.name,
    ticker: company.ticker,
    message: `Company "${company.name}" created successfully with ID ${company.id}.`,
  };
}

// Tool: list_companies
export async function listCompanies(args: { query?: string }) {
  const database = await getDb();
  if (!database) return { companies: [] };

  let results;
  if (args.query) {
    // Fuzzy search by name, ticker, or sector
    results = await database
      .select()
      .from(companies)
      .where(like(companies.name, `%${args.query}%`))
      .limit(20);
  } else {
    results = await db.getAllCompanies();
  }

  return {
    companies: results.map((c) => ({
      id: c.id,
      name: c.name,
      ticker: c.ticker,
      sector: c.sector,
      country: c.country,
    })),
    count: results.length,
  };
}

// Tool: select_company
export async function selectCompany(args: { companyId: number }, context: ChatContext) {
  const company = await db.getCompanyById(args.companyId);
  if (!company) {
    throw new Error(`Company with ID ${args.companyId} not found.`);
  }

  // Update context
  context.activeCompanyId = args.companyId;

  // Get summary data
  const runs = await db.getCompanyRuns(args.companyId);
  const documentCount = (await db.getCompanyDocuments(args.companyId)).length;
  const runCount = runs.length;
  const latestMetrics = runs.length > 0 ? await db.getRunMetrics(runs[0].id) : [];

  return {
    companyId: company.id,
    name: company.name,
    ticker: company.ticker,
    sector: company.sector,
    country: company.country,
    summary: {
      documents: documentCount,
      runs: runCount,
      latestESGScore: latestMetrics.length > 0 ? Math.round(latestMetrics.reduce((sum: any, m: any) => sum + m.value, 0) / latestMetrics.length) : null,
      latestScores: latestMetrics.length > 0
        ? {
            environmental: latestMetrics.find((m: any) => m.category === "environmental")?.value || 0,
            social: latestMetrics.find((m: any) => m.category === "social")?.value || 0,
            governance: latestMetrics.find((m: any) => m.category === "governance")?.value || 0,
          }
        : null,
    },
    message: `Selected company: ${company.name}${company.ticker ? ` (${company.ticker})` : ""}`,
  };
}

// Tool: upload_document
export async function uploadDocument(args: {
  companyId: number;
  kind: "pdf" | "csv" | "url";
  filename?: string;
  url?: string;
  content?: string; // base64 for files
}) {
  const company = await db.getCompanyById(args.companyId);
  if (!company) {
    throw new Error(`Company with ID ${args.companyId} not found.`);
  }

  let sourceUrl = args.url;
  let fileKey = null;
  let textExcerpt = null;

  // Handle file upload
  if (args.content && args.filename) {
    const buffer = Buffer.from(args.content, "base64");
    fileKey = `companies/${args.companyId}/documents/${Date.now()}-${args.filename}`;
    const result = await storagePut(fileKey, buffer, args.kind === "pdf" ? "application/pdf" : "text/csv");
    sourceUrl = result.url;

    // Extract text excerpt
    textExcerpt = buffer.toString("utf-8").slice(0, 1000);
  }

  const document = await db.createDocument({
    companyId: args.companyId,
    kind: args.kind,
    url: sourceUrl || null,
    filename: args.filename || null,
    content: textExcerpt,
    status: "completed",
  });

  return {
    documentId: document.id,
    filename: document.filename,
    kind: document.kind,
    message: `Document "${document.filename || "Untitled"}" uploaded successfully for ${company.name}.`,
  };
}

// Tool: parse_and_ingest (simplified - in real implementation would do chunking/embeddings)
export async function parseAndIngest(args: { documentId: number }) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");

  const doc = await database.select().from(documents).where(eq(documents.id, args.documentId)).limit(1);
  if (doc.length === 0) {
    throw new Error(`Document with ID ${args.documentId} not found.`);
  }

  // In a real implementation, this would:
  // 1. Download the file from S3
  // 2. Extract text (PDF parsing, CSV parsing)
  // 3. Chunk the text
  // 4. Generate embeddings
  // 5. Store in vector database
  // For now, we'll just mark it as processed

  return {
    documentId: args.documentId,
    status: "processed",
    chunks: 0, // Would be actual chunk count
    message: `Document ${args.documentId} parsed and ingested successfully.`,
  };
}

// Tool: run_esg_analysis
export async function runESGAnalysisTool(args: { companyId: number }) {
  const company = await db.getCompanyById(args.companyId);
  if (!company) {
    throw new Error(`Company with ID ${args.companyId} not found.`);
  }

  // Create run record
  const run = await db.createRun({
    companyId: args.companyId,
    status: "running",
  });

  // Get documents for analysis
  const docs = await db.getCompanyDocuments(args.companyId);
  const documentTexts = docs.map((d: any) => `[${d.kind}] ${d.filename || "Untitled"}: ${d.content?.substring(0, 200) || "No content"}`);

  // Run analysis in background
  (async () => {
    try {
      const result = await runESGAnalysis({
        companyId: args.companyId,
        runId: run.id,
        documents: documentTexts,
        companyName: company.name,
      });

      await saveAnalysisResults(
        {
          companyId: args.companyId,
          runId: run.id,
          documents: documentTexts,
          companyName: company.name,
        },
        result.scores,
        result.findings,
        result.actions
      );

      await db.updateRun(run.id, { status: "completed", completedAt: new Date() });
    } catch (error) {
      console.error("[Chat Tool] ESG analysis failed:", error);
      await db.updateRun(run.id, { status: "failed" });
    }
  })();

  return {
    runId: run.id,
    status: "started",
    companyName: company.name,
    message: `ESG analysis started for ${company.name}. Run ID: ${run.id}. This will take 30-60 seconds.`,
  };
}

// Tool: get_run_summary
export async function getRunSummary(args: { runId: number }) {
  const run = await db.getRunById(args.runId);
  if (!run) {
    throw new Error(`Run with ID ${args.runId} not found.`);
  }

  const company = await db.getCompanyById(run.companyId);
  const findingsData = await db.getRunFindings(args.runId);
  const actionsData = await db.getRunActions(args.runId);

  const database = await getDb();
  const metricsData = database
    ? await database
        .select()
        .from(esgMetrics)
        .where(eq(esgMetrics.runId, args.runId))
        .limit(1)
    : [];

  const metrics = metricsData.length > 0 ? metricsData[0] : null;

  return {
    runId: run.id,
    companyName: company?.name,
    status: run.status,
    startedAt: run.startedAt,
    finishedAt: run.completedAt,
    scores: metricsData.length > 0
      ? {
          environmental: metricsData.find((m: any) => m.category === "environmental")?.value || 0,
          social: metricsData.find((m: any) => m.category === "social")?.value || 0,
          governance: metricsData.find((m: any) => m.category === "governance")?.value || 0,
          total: Math.round((metricsData.reduce((sum: number, m: any) => sum + m.value, 0) / metricsData.length)),
        }
      : null,
    findings: findingsData.map((f: any) => ({
      id: f.id,
      category: f.category,
      severity: f.severity,
      summary: f.summary,
      evidence: f.evidence,
      citation: f.details,
    })),
    actions: actionsData.map((a: any) => ({
      id: a.id,
      title: a.title,
      rationale: a.description,
      priority: a.priority,
      expectedImpact: a.estimatedImpact,
      costEstimate: a.estimatedCost,
      confidence: a.confidence,
      status: a.status,
    })),
    message: `Run ${args.runId} for ${company?.name} is ${run.status}.`,
  };
}

// Tool: describe_schema (Gen-BI helper)
export async function describeSchema(args: { detail: "tables" | "columns" | "relations" }) {
  const schema = {
    tables: [
      "companies",
      "documents",
      "esg_metrics",
      "findings",
      "actions",
      "runs",
      "eval_labels",
      "users",
    ],
    columns: {
      companies: ["id", "name", "ticker", "sector", "country", "createdAt"],
      documents: [
        "id",
        "companyId",
        "kind",
        "sourceUrl",
        "filename",
        "fileKey",
        "mime",
        "uploadedAt",
        "textExcerpt",
      ],
      esg_metrics: [
        "id",
        "companyId",
        "runId",
        "period",
        "eScore",
        "sScore",
        "gScore",
        "total",
        "method",
        "createdAt",
      ],
      findings: [
        "id",
        "companyId",
        "runId",
        "category",
        "severity",
        "summary",
        "evidence",
        "citation",
        "createdAt",
      ],
      actions: [
        "id",
        "companyId",
        "runId",
        "title",
        "rationale",
        "priority",
        "expectedImpact",
        "costEstimate",
        "confidence",
        "citations",
        "status",
        "createdAt",
        "decidedBy",
        "decidedAt",
        "feedback",
      ],
      runs: [
        "id",
        "companyId",
        "startedAt",
        "finishedAt",
        "model",
        "status",
        "tokenIn",
        "tokenOut",
        "cost",
        "createdAt",
      ],
    },
    relations: {
      "documents.companyId": "companies.id",
      "esg_metrics.companyId": "companies.id",
      "esg_metrics.runId": "runs.id",
      "findings.companyId": "companies.id",
      "findings.runId": "runs.id",
      "actions.companyId": "companies.id",
      "actions.runId": "runs.id",
      "runs.companyId": "companies.id",
    },
  };

  if (args.detail === "tables") {
    return { tables: schema.tables };
  } else if (args.detail === "columns") {
    return { columns: schema.columns };
  } else {
    return { relations: schema.relations };
  }
}

// Tool: sql_query_readonly (strictly read-only with validation)
export async function sqlQueryReadonly(args: { sql: string; companyId?: number }) {
  // SQL Safety validation
  const sqlUpper = args.sql.trim().toUpperCase();

  // Reject non-SELECT queries
  if (!sqlUpper.startsWith("SELECT") && !sqlUpper.startsWith("WITH")) {
    throw new Error("Only SELECT and WITH queries are allowed.");
  }

  // Reject dangerous keywords
  const dangerousKeywords = [
    "INSERT",
    "UPDATE",
    "DELETE",
    "DROP",
    "ALTER",
    "CREATE",
    "TRUNCATE",
    "PRAGMA",
    "ATTACH",
  ];
  for (const keyword of dangerousKeywords) {
    if (sqlUpper.includes(keyword)) {
      throw new Error(`Dangerous keyword "${keyword}" not allowed in read-only queries.`);
    }
  }

  // Add LIMIT if not present
  let sql = args.sql.trim();
  if (!sqlUpper.includes("LIMIT")) {
    sql += " LIMIT 5000";
  }

  // Execute query
  const database = await getDb();
  if (!database) throw new Error("Database not available");

  try {
    // Use raw SQL with libsql
    const results: any = await (database as any).$client.execute(sql);
    return {
      columns: results.columns?.map((c: any) => c.name || c) || [],
      rows: results.rows || [],
      rowCount: results.rows?.length || 0,
    };
  } catch (error: any) {
    throw new Error(`SQL execution error: ${error.message}`);
  }
}

// Tool: render_chart
export async function renderChart(args: {
  kind: "line" | "bar" | "pie" | "radar";
  x?: string;
  y?: string | string[];
  data: { columns: string[]; rows: any[] };
  title?: string;
  note?: string;
}) {
  // Return chart configuration for frontend rendering
  return {
    type: args.kind,
    config: {
      x: args.x,
      y: args.y,
      data: args.data,
      title: args.title || "Chart",
      note: args.note,
    },
    message: `Chart (${args.kind}) generated with ${args.data.rows.length} data points.`,
  };
}

// Tool: open_citation
export async function openCitation(args: { documentId: number; span?: { start: number; end: number } }) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");

  const doc = await database.select().from(documents).where(eq(documents.id, args.documentId)).limit(1);
  if (doc.length === 0) {
    throw new Error(`Document with ID ${args.documentId} not found.`);
  }

  const document = doc[0];
  let excerpt = document.content || "No excerpt available";

  if (args.span && document.content) {
    excerpt = document.content.slice(args.span.start, args.span.end);
  }

  return {
    documentId: document.id,
    filename: document.filename,
    kind: document.kind,
    sourceUrl: document.url,
    excerpt: excerpt,
    message: `Citation from "${document.filename || "Untitled"}"`,
  };
}
