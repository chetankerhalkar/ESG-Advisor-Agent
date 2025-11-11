import { invokeLLM, InvokeResult } from "./_core/llm";
import * as db from "./db";
import { InsertFinding, InsertAction, InsertESGMetric } from "../drizzle/schema";

/**
 * ESG Agent - Analyzes company documents and generates ESG scores, findings, and action plans
 */

interface AnalysisContext {
  companyId: number;
  runId: number;
  documents: string[];
  companyName: string;
}

interface ESGScores {
  eScore: number;
  sScore: number;
  gScore: number;
  total: number;
  method: string;
}

interface Finding {
  category: string;
  severity: number;
  summary: string;
  evidence: string;
  citation: string;
}

interface ActionPlan {
  title: string;
  rationale: string;
  priority: number;
  expectedImpact: number;
  costEstimate: number;
  confidence: number;
  citations: string[];
}

type AssistantContent =
  InvokeResult["choices"][number]["message"]["content"];

const JSON_FIELD_CANDIDATES = ["json", "output_json", "data", "content"] as const;

function extractTextContent(content: AssistantContent): string {
  if (!content) return "";
  if (typeof content === "string") return content;
  const parts = Array.isArray(content) ? content : [content];
  const chunks: string[] = [];
  for (const part of parts) {
    if (!part) continue;
    if (typeof part === "string") {
      chunks.push(part);
      continue;
    }
    const anyPart = part as any;
    if (typeof anyPart.text === "string") {
      chunks.push(anyPart.text);
      continue;
    }
    if (typeof anyPart.output_text === "string") {
      chunks.push(anyPart.output_text);
      continue;
    }
    for (const key of JSON_FIELD_CANDIDATES) {
      const candidate = anyPart[key];
      if (typeof candidate === "string") {
        chunks.push(candidate);
        break;
      }
      if (candidate && typeof candidate === "object") {
        try {
          chunks.push(JSON.stringify(candidate));
        } catch {
          // ignore JSON errors
        }
        break;
      }
    }
  }
  return chunks.join("\n").trim();
}

function extractJsonContent<T>(content: AssistantContent, fallback: T): T {
  const tryParse = (value: unknown): T | undefined => {
    if (typeof value !== "string" || !value.trim()) return undefined;
    try {
      return JSON.parse(value) as T;
    } catch {
      return undefined;
    }
  };

  if (!content) return fallback;
  if (typeof content === "string") {
    return tryParse(content) ?? fallback;
  }

  const parts = Array.isArray(content) ? content : [content];
  for (const part of parts) {
    if (!part) continue;
    if (typeof part === "string") {
      const parsed = tryParse(part);
      if (parsed) return parsed;
      continue;
    }
    const anyPart = part as any;
    if (typeof anyPart.text === "string") {
      const parsed = tryParse(anyPart.text);
      if (parsed) return parsed;
    }
    for (const key of JSON_FIELD_CANDIDATES) {
      const candidate = anyPart[key];
      if (candidate && typeof candidate === "object") {
        return candidate as T;
      }
      if (typeof candidate === "string") {
        const parsed = tryParse(candidate);
        if (parsed) return parsed;
      }
    }
  }

  return fallback;
}

function clampScore(value: unknown, min = 0, max = 100): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return min;
  return Math.min(max, Math.max(min, Math.round(num)));
}

function coerceNumber(value: unknown, fallback = 0): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function ensureString(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (value === undefined || value === null) return fallback;
  return String(value);
}

function normalizeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function mapFindingSeverity(value: unknown): InsertFinding["severity"] {
  const num = Number(value);
  if (Number.isFinite(num)) {
    if (num <= 0) return "info";
    if (num <= 1) return "low";
    if (num <= 2) return "medium";
    if (num <= 3) return "high";
    return "critical";
  }

  if (typeof value === "string") {
    const normalized = value.toLowerCase();
    if (["critical", "high", "medium", "low", "info"].includes(normalized)) {
      return normalized as InsertFinding["severity"];
    }
  }

  return "medium";
}

function mapFindingCategory(value: unknown): InsertFinding["category"] {
  if (typeof value === "string") {
    const normalized = value.toLowerCase();
    if (["environmental", "social", "governance", "general"].includes(normalized)) {
      return normalized as InsertFinding["category"];
    }
    if (normalized === "greenwashing") return "environmental";
    if (normalized === "supply_chain") return "social";
    if (normalized === "diversity") return "social";
  }
  return "general";
}

function mapActionPriority(value: unknown): InsertAction["priority"] {
  const num = Number(value);
  if (Number.isFinite(num)) {
    if (num <= 1) return "critical";
    if (num <= 2) return "high";
    if (num <= 3) return "medium";
    return "low";
  }
  if (typeof value === "string") {
    const normalized = value.toLowerCase();
    if (["critical", "high", "medium", "low"].includes(normalized)) {
      return normalized as InsertAction["priority"];
    }
  }
  return "medium";
}

function stringifyEvidence(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (value === undefined || value === null) {
    return "";
  }
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

/**
 * Main ESG Analysis Pipeline
 */
export async function runESGAnalysis(context: AnalysisContext): Promise<{
  scores: ESGScores;
  findings: Finding[];
  actions: ActionPlan[];
}> {
  console.log(`[ESG Agent] Starting analysis for company ${context.companyName} (Run ID: ${context.runId})`);

  // Step 1: Analyze documents and extract ESG signals
  const documentAnalysis = await analyzeDocuments(context);

  // Step 2: Calculate ESG scores
  const scores = await calculateESGScores(context, documentAnalysis);

  // Step 3: Detect greenwashing and other issues
  const findings = await detectFindings(context, documentAnalysis);

  // Step 4: Generate action plan
  const actions = await generateActionPlan(context, scores, findings);

  console.log(`[ESG Agent] Analysis complete. Scores: E=${scores.eScore}, S=${scores.sScore}, G=${scores.gScore}`);

  return { scores, findings, actions };
}

/**
 * Analyze documents to extract ESG-relevant information
 */
async function analyzeDocuments(context: AnalysisContext): Promise<string> {
  const documentsText = context.documents.join("\n\n---\n\n");

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are an ESG analysis expert. Analyze the provided documents and extract key ESG signals including:
- Environmental: emissions, energy use, waste management, climate commitments
- Social: labor practices, diversity metrics, community impact, supply chain ethics
- Governance: board structure, executive compensation, transparency, compliance

Provide a comprehensive analysis with specific data points and quotes from the documents.`
      },
      {
        role: "user",
        content: `Analyze these documents for ${context.companyName}:\n\n${documentsText}`
      }
    ]
  });

  return extractTextContent(response.choices[0].message.content);
}

/**
 * Calculate ESG scores based on document analysis
 */
async function calculateESGScores(context: AnalysisContext, analysis: string): Promise<ESGScores> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are an ESG scoring expert. Based on the analysis provided, calculate Environmental (E), Social (S), and Governance (G) scores on a 0-100 scale.

Consider:
- E Score: emissions reduction, renewable energy, waste management, climate commitments
- S Score: employee welfare, diversity & inclusion, community engagement, supply chain ethics
- G Score: board independence, transparency, executive compensation, compliance

Provide scores with justification.`
      },
      {
        role: "user",
        content: `Calculate ESG scores based on this analysis:\n\n${analysis}`
      }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "esg_scores",
        strict: true,
        schema: {
          type: "object",
          properties: {
            eScore: { type: "integer", description: "Environmental score 0-100" },
            sScore: { type: "integer", description: "Social score 0-100" },
            gScore: { type: "integer", description: "Governance score 0-100" },
            justification: { type: "string", description: "Brief justification for scores" }
          },
          required: ["eScore", "sScore", "gScore", "justification"],
          additionalProperties: false
        }
      }
    }
  });

  const payload = extractJsonContent(response.choices[0].message.content, {
    eScore: 0,
    sScore: 0,
    gScore: 0,
    justification: "",
  });

  const eScore = clampScore(payload.eScore);
  const sScore = clampScore(payload.sScore);
  const gScore = clampScore(payload.gScore);
  const total = Math.round((eScore + sScore + gScore) / 3);
  const justification = ensureString(payload.justification);

  return {
    eScore,
    sScore,
    gScore,
    total,
    method: justification
      ? `AI-powered analysis using LLM. ${justification}`
      : "AI-powered analysis using LLM.",
  };
}

/**
 * Detect greenwashing, supply chain issues, and other ESG concerns
 */
async function detectFindings(context: AnalysisContext, analysis: string): Promise<Finding[]> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are an ESG auditor specializing in detecting issues. Analyze the provided information and identify:
1. Greenwashing: claims without evidence or misleading statements
2. Supply chain ethics: labor violations, sourcing issues
3. Diversity concerns: lack of representation, pay gaps
4. Governance issues: conflicts of interest, lack of transparency

For each finding, provide:
- category: 'greenwashing', 'supply_chain', 'diversity', or 'governance'
- severity: 1-5 (5 being most severe)
- summary: brief description
- evidence: specific quotes or data points
- citation: reference to source document

Return 3-7 findings, prioritized by severity.`
      },
      {
        role: "user",
        content: `Detect ESG issues in this analysis:\n\n${analysis}`
      }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "findings",
        strict: true,
        schema: {
          type: "object",
          properties: {
            findings: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  category: { type: "string" },
                  severity: { type: "integer" },
                  summary: { type: "string" },
                  evidence: { type: "string" },
                  citation: { type: "string" }
                },
                required: ["category", "severity", "summary", "evidence", "citation"],
                additionalProperties: false
              }
            }
          },
          required: ["findings"],
          additionalProperties: false
        }
      }
    }
  });

  const result = extractJsonContent<{ findings?: Finding[] }>(
    response.choices[0].message.content,
    { findings: [] }
  );

  return normalizeArray<Finding>(result.findings ?? []);
}

/**
 * Generate prioritized action plan
 */
async function generateActionPlan(
  context: AnalysisContext,
  scores: ESGScores,
  findings: Finding[]
): Promise<ActionPlan[]> {
  const findingsSummary = findings.map(f => `- ${f.category} (severity ${f.severity}): ${f.summary}`).join("\n");

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are an ESG strategy consultant. Based on the ESG scores and findings, create 3-5 prioritized action recommendations.

For each action:
- title: concise action title
- rationale: why this action is important (2-3 sentences)
- priority: 1-5 (1 being highest priority)
- expectedImpact: estimated score improvement (0-20 points)
- costEstimate: estimated cost in USD
- confidence: confidence level 0-100
- citations: array of relevant sources

Focus on high-impact, feasible actions that address the most severe findings.`
      },
      {
        role: "user",
        content: `Generate action plan for ${context.companyName}:

Current Scores: E=${scores.eScore}, S=${scores.sScore}, G=${scores.gScore}

Key Findings:
${findingsSummary}

Provide 3-5 prioritized actions.`
      }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "action_plan",
        strict: true,
        schema: {
          type: "object",
          properties: {
            actions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  rationale: { type: "string" },
                  priority: { type: "integer" },
                  expectedImpact: { type: "integer" },
                  costEstimate: { type: "integer" },
                  confidence: { type: "integer" },
                  citations: { type: "array", items: { type: "string" } }
                },
                required: ["title", "rationale", "priority", "expectedImpact", "costEstimate", "confidence", "citations"],
                additionalProperties: false
              }
            }
          },
          required: ["actions"],
          additionalProperties: false
        }
      }
    }
  });

  const result = extractJsonContent<{ actions?: ActionPlan[] }>(
    response.choices[0].message.content,
    { actions: [] }
  );

  return normalizeArray<ActionPlan>(result.actions ?? []);
}

/**
 * Save analysis results to database
 */
export async function saveAnalysisResults(
  context: AnalysisContext,
  scores: ESGScores,
  findings: Finding[],
  actions: ActionPlan[]
): Promise<void> {
  // Save ESG metrics
  // Save individual metrics
  await db.createESGMetric({
    companyId: context.companyId,
    runId: context.runId,
    category: "environmental",
    metric: "overall_score",
    value: scores.eScore,
    period: new Date().toISOString().slice(0, 7),
  });
  await db.createESGMetric({
    companyId: context.companyId,
    runId: context.runId,
    category: "social",
    metric: "overall_score",
    value: scores.sScore,
    period: new Date().toISOString().slice(0, 7),
  });
  await db.createESGMetric({
    companyId: context.companyId,
    runId: context.runId,
    category: "governance",
    metric: "overall_score",
    value: scores.gScore,
    period: new Date().toISOString().slice(0, 7),
  });

  // Save findings
  for (const finding of findings) {
    await db.createFinding({
      companyId: context.companyId,
      runId: context.runId,
      category: mapFindingCategory(finding.category),
      severity: mapFindingSeverity(finding.severity),
      summary: ensureString(finding.summary, "No summary provided"),
      evidence: stringifyEvidence(finding.evidence),
      details: ensureString(finding.citation),
    });
  }

  // Save actions
  for (const action of actions) {
    await db.createAction({
      companyId: context.companyId,
      runId: context.runId,
      title: ensureString(action.title, "Action recommendation"),
      description: ensureString(action.rationale, "No rationale provided"),
      category: "general",
      priority: mapActionPriority(action.priority),
      estimatedImpact: coerceNumber(action.expectedImpact, 0),
      estimatedCost: ensureString(action.costEstimate ?? "", "0"),
      confidence: coerceNumber(action.confidence, 0),
      reasoning: stringifyEvidence(action.citations ?? []),
      status: "proposed"
    });
  }

  console.log(`[ESG Agent] Results saved to database for run ${context.runId}`);
}
