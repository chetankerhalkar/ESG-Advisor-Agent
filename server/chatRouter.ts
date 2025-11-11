import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import * as chatTools from "./chatTools";

// Chat message schema
const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
});

// Tool call schemas
const createCompanySchema = z.object({
  name: z.string(),
  ticker: z.string().optional(),
  sector: z.string().optional(),
  country: z.string().optional(),
});

const listCompaniesSchema = z.object({
  query: z.string().optional(),
});

const selectCompanySchema = z.object({
  companyId: z.number(),
});

const uploadDocumentSchema = z.object({
  companyId: z.number(),
  kind: z.enum(["pdf", "csv", "url"]),
  filename: z.string().optional(),
  url: z.string().optional(),
  content: z.string().optional(),
});

const parseAndIngestSchema = z.object({
  documentId: z.number(),
});

const runESGAnalysisSchema = z.object({
  companyId: z.number(),
});

const getRunSummarySchema = z.object({
  runId: z.number(),
});

const describeSchemaSchema = z.object({
  detail: z.enum(["tables", "columns", "relations"]),
});

const sqlQueryReadonlySchema = z.object({
  sql: z.string(),
  companyId: z.number().optional(),
});

const renderChartSchema = z.object({
  kind: z.enum(["line", "bar", "pie", "radar"]),
  x: z.string().optional(),
  y: z.union([z.string(), z.array(z.string())]).optional(),
  data: z.object({
    columns: z.array(z.string()),
    rows: z.array(z.any()),
  }),
  title: z.string().optional(),
  note: z.string().optional(),
});

const openCitationSchema = z.object({
  documentId: z.number(),
  span: z
    .object({
      start: z.number(),
      end: z.number(),
    })
    .optional(),
});

// System prompt for chat assistant
const CHAT_SYSTEM_PROMPT = `You are the ESG Advisor Chat Assistant. You help users operate the ESG Intelligence Agent app and analyze data conversationally.

Core abilities:
1. Company admin (create/list/select companies)
2. Document ingestion (PDF/CSV/URL) with extraction & chunking
3. Gen-BI analytics: translate natural language into safe, read-only SQL; render results as tables/charts
4. ESG run control: start analysis runs, monitor status, summarize outputs with citations

Rules:
- Prefer tool calls when the user expresses intent
- Show SQL only when explicitly requested; never execute non-SELECT queries
- If unsure about schema, call describe_schema first
- Always attach citations to claims from documents or analysis results
- If data is insufficient, ask for specific documents or clarify the metric/window
- Be concise and actionable in responses
- For analytics questions, prefer tables first, then offer charts if helpful

Gen-BI Guidelines:
- Only SELECT/WITH queries allowed
- Prefer explicit column lists; avoid SELECT *
- Add LIMIT 5000 if not present
- Use filters for companyId, date ranges, and period
- If schema is unknown, call describe_schema first

Available Tools:
- create_company: Create a new company
- list_companies: Search and list companies
- select_company: Set active company context
- upload_document: Upload PDF/CSV or URL
- parse_and_ingest: Process uploaded document
- run_esg_analysis: Start ESG analysis for a company
- get_run_summary: Get results from a completed run
- describe_schema: Get database schema info
- sql_query_readonly: Execute read-only SQL queries
- render_chart: Generate chart from data
- open_citation: Show document excerpt with citation`;

// Tool definitions for LLM
const TOOL_DEFINITIONS = [
  {
    type: "function" as const,
    function: {
      name: "create_company",
      description: "Create a new company in the system",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Company name" },
          ticker: { type: "string", description: "Stock ticker symbol (optional)" },
          sector: { type: "string", description: "Industry sector (optional)" },
          country: { type: "string", description: "Country of operation (optional)" },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "list_companies",
      description: "List all companies or search by query",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query for company name/ticker/sector (optional)" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "select_company",
      description: "Select a company as the active context for this conversation",
      parameters: {
        type: "object",
        properties: {
          companyId: { type: "number", description: "Company ID to select" },
        },
        required: ["companyId"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "upload_document",
      description: "Upload a document (PDF/CSV) or URL for a company",
      parameters: {
        type: "object",
        properties: {
          companyId: { type: "number", description: "Company ID" },
          kind: { type: "string", enum: ["pdf", "csv", "url"], description: "Document type" },
          filename: { type: "string", description: "Filename (optional)" },
          url: { type: "string", description: "URL if kind is 'url' (optional)" },
          content: { type: "string", description: "Base64 encoded file content (optional)" },
        },
        required: ["companyId", "kind"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "run_esg_analysis",
      description: "Start an ESG analysis run for a company",
      parameters: {
        type: "object",
        properties: {
          companyId: { type: "number", description: "Company ID to analyze" },
        },
        required: ["companyId"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_run_summary",
      description: "Get summary of a completed ESG analysis run with scores, findings, and actions",
      parameters: {
        type: "object",
        properties: {
          runId: { type: "number", description: "Run ID to summarize" },
        },
        required: ["runId"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "describe_schema",
      description: "Get database schema information for Gen-BI queries",
      parameters: {
        type: "object",
        properties: {
          detail: {
            type: "string",
            enum: ["tables", "columns", "relations"],
            description: "Level of detail to return",
          },
        },
        required: ["detail"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "sql_query_readonly",
      description: "Execute a read-only SQL query (SELECT/WITH only) for analytics",
      parameters: {
        type: "object",
        properties: {
          sql: { type: "string", description: "SQL query to execute (SELECT or WITH only)" },
          companyId: { type: "number", description: "Optional company ID filter" },
        },
        required: ["sql"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "render_chart",
      description: "Generate a chart visualization from data",
      parameters: {
        type: "object",
        properties: {
          kind: { type: "string", enum: ["line", "bar", "pie", "radar"], description: "Chart type" },
          x: { type: "string", description: "X-axis column name (optional)" },
          y: {
            description: "Y-axis column name(s) (optional)",
            anyOf: [
              { type: "string" },
              { type: "array", items: { type: "string" } },
            ],
          },
            data: {
              type: "object",
              properties: {
                columns: { type: "array", items: { type: "string" } },
                rows: {
                  type: "array",
                  items: {
                    anyOf: [
                      {
                        type: "array",
                        items: {
                          anyOf: [
                            { type: "string" },
                            { type: "number" },
                            { type: "boolean" },
                            { type: "null" },
                          ],
                        },
                      },
                      {
                        type: "object",
                        additionalProperties: true,
                      },
                    ],
                  },
                },
              },
              required: ["columns", "rows"],
            },
            title: { type: "string", description: "Chart title (optional)" },
            note: { type: "string", description: "Additional note (optional)" },
        },
        required: ["kind", "data"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "open_citation",
      description: "Open and display a citation from a document",
      parameters: {
        type: "object",
        properties: {
          documentId: { type: "number", description: "Document ID" },
          span: {
            type: "object",
            properties: {
              start: { type: "number" },
              end: { type: "number" },
            },
            description: "Text span to extract (optional)",
          },
        },
        required: ["documentId"],
      },
    },
  },
];

// Execute tool call
async function executeTool(toolName: string, args: any, context: chatTools.ChatContext) {
  switch (toolName) {
    case "create_company":
      return await chatTools.createCompany(args);
    case "list_companies":
      return await chatTools.listCompanies(args);
    case "select_company":
      return await chatTools.selectCompany(args, context);
    case "upload_document":
      return await chatTools.uploadDocument(args);
    case "parse_and_ingest":
      return await chatTools.parseAndIngest(args);
    case "run_esg_analysis":
      return await chatTools.runESGAnalysisTool(args);
    case "get_run_summary":
      return await chatTools.getRunSummary(args);
    case "describe_schema":
      return await chatTools.describeSchema(args);
    case "sql_query_readonly":
      return await chatTools.sqlQueryReadonly(args);
    case "render_chart":
      return await chatTools.renderChart(args);
    case "open_citation":
      return await chatTools.openCitation(args);
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

export const chatRouter = router({
  // Send a chat message and get response with tool calling
  sendMessage: protectedProcedure
    .input(
      z.object({
        messages: z.array(chatMessageSchema),
        activeCompanyId: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const context: chatTools.ChatContext = {
        userId: ctx.user.openId,
        activeCompanyId: input.activeCompanyId,
      };

      // Prepare messages with system prompt
      const messages = [
        { role: "system" as const, content: CHAT_SYSTEM_PROMPT },
        ...input.messages.map((m) => ({
          role: m.role as "user" | "assistant" | "system",
          content: m.content,
        })),
      ];

      // Call LLM with tool support
      const response = await invokeLLM({
        messages,
        tools: TOOL_DEFINITIONS,
        tool_choice: "auto" as const,
      });

      const choice = response.choices[0];
      const message = choice.message;

      // Check if tool calls were made
      if (message.tool_calls && message.tool_calls.length > 0) {
        const toolResults = [];

        for (const toolCall of message.tool_calls) {
          const toolName = toolCall.function.name;
          const toolArgs = JSON.parse(toolCall.function.arguments);

          try {
            const result = await executeTool(toolName, toolArgs, context);
            toolResults.push({
              toolCallId: toolCall.id,
              toolName,
              result,
              success: true,
            });
          } catch (error: any) {
            toolResults.push({
              toolCallId: toolCall.id,
              toolName,
              error: error.message,
              success: false,
            });
          }
        }

        return {
          type: "tool_calls" as const,
          toolCalls: toolResults,
          message: message.content || "",
          activeCompanyId: context.activeCompanyId,
        };
      }

      // Regular text response
      return {
        type: "text" as const,
        message: message.content || "",
        activeCompanyId: context.activeCompanyId,
      };
    }),

  // Get chat history (placeholder - would integrate with a chat history table)
  getHistory: protectedProcedure.query(async ({ ctx }) => {
    // In a real implementation, this would fetch from a chat_messages table
    return {
      messages: [],
    };
  }),
});
