import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { storagePut } from "./storage";
import { runESGAnalysis, saveAnalysisResults } from "./esgAgent";
import { chatRouter } from "./chatRouter";

export const appRouter = router({
  system: systemRouter,
  chat: chatRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Company management
  companies: router({
    list: publicProcedure.query(async () => {
      return await db.getAllCompanies();
    }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const company = await db.getCompanyById(input.id);
        if (!company) throw new Error("Company not found");
        
        const runs = await db.getCompanyRuns(input.id);
        const documents = await db.getCompanyDocuments(input.id);
        const latestMetrics = runs.length > 0 ? await db.getRunMetrics(runs[0].id) : [];
        
        return {
          company,
          latestMetrics,
          runs,
          documents
        };
      }),

    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        ticker: z.string().optional(),
        sector: z.string().optional(),
        country: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return await db.createCompany(input);
      }),

    searchByName: protectedProcedure
      .input(z.object({ query: z.string() }))
      .mutation(async ({ input }) => {
        const company = await db.findCompanyByName(input.query);
        if (!company) return null;
        return {
          id: company.id,
          name: company.name,
          ticker: company.ticker,
          sector: company.sector,
          country: company.country,
        };
      }),
  }),

  // Document management
  documents: router({
    upload: protectedProcedure
      .input(z.object({
        companyId: z.number(),
        filename: z.string(),
        content: z.string(), // base64 encoded
        mime: z.string(),
        kind: z.string(),
      }))
      .mutation(async ({ input }) => {
        // Decode base64 and upload to S3
        const buffer = Buffer.from(input.content, 'base64');
        const fileKey = `companies/${input.companyId}/documents/${Date.now()}-${input.filename}`;
        const { url } = await storagePut(fileKey, buffer, input.mime);

        // Extract text excerpt (first 500 chars)
        const textContent = buffer.toString('utf-8').slice(0, 500);

        // Save document metadata
        return await db.createDocument({
          companyId: input.companyId,
          kind: input.kind as "pdf" | "csv" | "url",
          url: url,
          filename: input.filename,
          content: textContent,
          status: "completed",
        });
      }),

    getByCompany: publicProcedure
      .input(z.object({ companyId: z.number() }))
      .query(async ({ input }) => {
        return await db.getCompanyDocuments(input.companyId);
      }),
  }),

  // ESG Analysis runs
  runs: router({
    start: protectedProcedure
      .input(z.object({ companyId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const company = await db.getCompanyById(input.companyId);
        if (!company) throw new Error("Company not found");

        // Create run record
        const run = await db.createRun({
          companyId: input.companyId,
          status: "running",
        });

        // Get documents for analysis
        const documents = await db.getCompanyDocuments(input.companyId);
        const documentTexts = documents.map((d: any) => 
          `[${d.kind}] ${d.filename || 'Untitled'}: ${d.content?.substring(0, 200) || 'No content'}`
        );

        // Run analysis in background (don't await)
        (async () => {
          try {
            const result = await runESGAnalysis({
              companyId: input.companyId,
              runId: run.id,
              documents: documentTexts,
              companyName: company.name,
            });

            await saveAnalysisResults(
              {
                companyId: input.companyId,
                runId: run.id,
                documents: documentTexts,
                companyName: company.name,
              },
              result.scores,
              result.findings,
              result.actions
            );

            await db.updateRun(run.id, { 
              status: "completed",
              completedAt: new Date()
            });
          } catch (error) {
            console.error("[ESG Agent] Analysis failed:", error);
            await db.updateRun(run.id, { status: "failed" });
          }
        })();

        return { runId: run.id, status: "started" };
      }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const run = await db.getRunById(input.id);
        if (!run) throw new Error("Run not found");

        const findings = await db.getRunFindings(input.id);
        const actions = await db.getRunActions(input.id);
        const metrics = await db.getRunMetrics(input.id);

        return {
          run,
          findings,
          actions,
          metrics,
        };
      }),

    listByCompany: publicProcedure
      .input(z.object({ companyId: z.number() }))
      .query(async ({ input }) => {
        return await db.getCompanyRuns(input.companyId);
      }),
  }),

  // Action management
  actions: router({
    approve: protectedProcedure
      .input(z.object({
        id: z.number(),
        feedback: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.updateActionStatus(input.id, "approved");
        return { success: true };
      }),

    reject: protectedProcedure
      .input(z.object({
        id: z.number(),
        feedback: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.updateActionStatus(input.id, "rejected");
        return { success: true };
      }),
  }),

  // Evaluation tracking
  eval: router({
    addLabel: protectedProcedure
      .input(z.object({
        findingId: z.number(),
        label: z.string(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return await db.createEvalLabel({
          runId: 0, // TODO: Get from finding
          findingId: input.findingId,
          labelType: "usefulness",
          labelValue: input.label as "positive" | "negative" | "neutral",
          feedback: input.notes,
        });
      }),
  }),

  analytics: router({
    generateBiReport: protectedProcedure
      .input(z.object({ companyId: z.number() }))
      .mutation(async ({ input }) => {
        const company = await db.getCompanyById(input.companyId);
        if (!company) {
          throw new Error("Company not found");
        }

        const documents = await db.getCompanyDocuments(input.companyId);
        const companyRuns = await db.getCompanyRuns(input.companyId);
        const latestRun = companyRuns[0];
        const latestMetrics = latestRun
          ? await db.getRunMetrics(latestRun.id)
          : [];

        const esgScores = {
          environmental: Math.round(
            latestMetrics.find((m) => m.category === "environmental")?.value ??
              0
          ),
          social: Math.round(
            latestMetrics.find((m) => m.category === "social")?.value ?? 0
          ),
          governance: Math.round(
            latestMetrics.find((m) => m.category === "governance")?.value ?? 0
          ),
        };

        const avgScore = Math.round(
          (esgScores.environmental +
            esgScores.social +
            esgScores.governance) /
            3
        );

        const svg = buildBiReportSvg({
          companyName: company.name,
          ticker: company.ticker || "",
          scores: esgScores,
          documents: documents.length,
          runs: companyRuns.length,
          lastUpdated:
            latestRun?.completedAt ||
            latestRun?.startedAt ||
            new Date().toISOString(),
          lastRunStatus: latestRun?.status ?? "no runs",
          averageScore: avgScore,
        });

        return {
          company: {
            id: company.id,
            name: company.name,
            ticker: company.ticker,
          },
          summary: {
            documents: documents.length,
            runs: companyRuns.length,
            lastRunStatus: latestRun?.status ?? "pending",
            averageScore: avgScore,
            esgScores,
          },
          imageUrl: `data:image/svg+xml;base64,${Buffer.from(svg).toString(
            "base64"
          )}`,
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;

type BiReportParams = {
  companyName: string;
  ticker?: string;
  scores: { environmental: number; social: number; governance: number };
  documents: number;
  runs: number;
  lastUpdated: string | Date;
  lastRunStatus: string;
  averageScore: number;
};

function buildBiReportSvg({
  companyName,
  ticker,
  scores,
  documents,
  runs,
  lastUpdated,
  lastRunStatus,
  averageScore,
}: BiReportParams): string {
  const width = 640;
  const height = 360;
  const chartOriginX = 80;
  const chartOriginY = 260;
  const chartHeight = 180;
  const barWidth = 80;
  const gap = 50;
  const categories: Array<{
    key: keyof typeof scores;
    label: string;
    color: string;
  }> = [
    { key: "environmental", label: "Environmental", color: "#4caf50" },
    { key: "social", label: "Social", color: "#2196f3" },
    { key: "governance", label: "Governance", color: "#ab47bc" },
  ];

  const bars = categories
    .map((cat, index) => {
      const value = Math.max(0, Math.min(100, scores[cat.key] || 0));
      const barHeight = (value / 100) * chartHeight;
      const x = chartOriginX + index * (barWidth + gap);
      const y = chartOriginY - barHeight;
      return `
        <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" rx="8" fill="${cat.color}" />
        <text x="${x + barWidth / 2}" y="${y - 10}" text-anchor="middle" font-size="16" font-family="Inter" fill="#111827" font-weight="600">${value}</text>
        <text x="${x + barWidth / 2}" y="${chartOriginY + 24}" text-anchor="middle" font-size="12" font-family="Inter" fill="#4b5563">${cat.label}</text>
      `;
    })
    .join("\n");

  const summaryLines = [
    `Documents: ${documents}`,
    `Runs: ${runs}`,
    `Last Run Status: ${capitalize(lastRunStatus)}`,
    `Avg ESG Score: ${averageScore || 0}`,
  ];

  const summaryText = summaryLines
    .map(
      (line, idx) =>
        `<text x="${width - 220}" y="${140 + idx * 24}" font-size="14" font-family="Inter" fill="#111827">${escapeSvgText(
          line
        )}</text>`
    )
    .join("\n");

  const timestamp = new Date(lastUpdated).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" fill="#f9fafb" rx="24"/>
  <text x="40" y="60" font-size="24" font-family="Inter" fill="#111827" font-weight="600">
    ${escapeSvgText(companyName)}${ticker ? ` (${escapeSvgText(ticker)})` : ""}
  </text>
  <text x="40" y="88" font-size="14" font-family="Inter" fill="#6b7280">ESG BI Snapshot</text>
  <text x="${width - 40}" y="60" font-size="12" font-family="Inter" fill="#6b7280" text-anchor="end">
    Updated ${escapeSvgText(timestamp)}
  </text>
  <line x1="40" y1="110" x2="${width - 40}" y2="110" stroke="#e5e7eb" stroke-width="1" />
  <text x="40" y="140" font-size="16" font-family="Inter" fill="#111827" font-weight="600">Overview</text>
  ${summaryText}
  <g>
    ${bars}
  </g>
</svg>`;
}

function escapeSvgText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function capitalize(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}
