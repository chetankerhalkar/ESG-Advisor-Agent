import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { 
  Send, Loader2, Building2, Upload, BarChart3, Play, 
  FileText, CheckCircle2, XCircle, ChevronRight, Pin,
  Maximize2, Minimize2, X, MessageSquare
} from "lucide-react";
import { toast } from "sonner";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  toolCalls?: ToolCall[];
  timestamp: Date;
  imageUrl?: string;
  imageAlt?: string;
}

interface ToolCall {
  toolCallId: string;
  toolName: string;
  result?: any;
  error?: string;
  success: boolean;
}

interface ChatPanelProps {
  activeCompanyId?: number;
  onCompanySelect?: (companyId: number) => void;
}

type ChatState = "expanded" | "collapsed" | "minimized";

type QuickAction = {
  label: string;
  icon: typeof Building2;
  prompt?: string;
  mode?: "prompt" | "bi-report";
};

const QUICK_ACTIONS: QuickAction[] = [
  { label: "New Company", icon: Building2, prompt: "Create a new company", mode: "prompt" },
  { label: "Upload Docs", icon: Upload, prompt: "Upload documents for analysis", mode: "prompt" },
  { label: "Gen BI", icon: BarChart3, mode: "bi-report" },
  { label: "Run ESG", icon: Play, prompt: "Run ESG analysis", mode: "prompt" },
];

const COLORS = ["#FF9A76", "#C47FA5", "#9B6B9E", "#6B5B95", "#4A4E69"];

export default function ChatPanel({ activeCompanyId, onCompanySelect }: ChatPanelProps) {
  const [chatState, setChatState] = useState<ChatState>(() => {
    const saved = localStorage.getItem("chatPanelState");
    return (saved as ChatState) || "expanded";
  });
  
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I'm your ESG Advisor Assistant. I can help you create companies, upload documents, run ESG analysis, and answer analytics questions. What would you like to do?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingBi, setIsGeneratingBi] = useState(false);
  const [pendingBiCompanyPrompt, setPendingBiCompanyPrompt] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sendMessageMutation = trpc.chat.sendMessage.useMutation();
  const generateBiReportMutation = trpc.analytics.generateBiReport.useMutation();
  const findCompanyByNameMutation = trpc.companies.searchByName.useMutation();

  const appendAssistantMessage = (content: string, extras?: Partial<Message>) => {
    setMessages(prev => [
      ...prev,
      {
        role: "assistant",
        content,
        timestamp: new Date(),
        ...extras,
      },
    ]);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    localStorage.setItem("chatPanelState", chatState);
  }, [chatState]);

  const handleSend = async (messageText?: string) => {
    const text = (messageText ?? input).trim();
    if (!text) return;
    if (isLoading) return;

    const userMessage: Message = {
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    if (pendingBiCompanyPrompt) {
      await resolvePendingBiRequest(text);
      return;
    }

    setIsLoading(true);

    try {
      const response = await sendMessageMutation.mutateAsync({
        messages: [...messages, userMessage].map((m) => ({
          role: m.role,
          content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
        })),
        activeCompanyId,
      });

      const assistantMessage: Message = {
        role: "assistant",
        content: typeof response.message === 'string' ? response.message : JSON.stringify(response.message),
        toolCalls: response.type === "tool_calls" ? response.toolCalls : undefined,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (response.activeCompanyId && onCompanySelect) {
        onCompanySelect(response.activeCompanyId);
      }
    } catch (error: any) {
      toast.error("Chat error: " + error.message);
      appendAssistantMessage("Sorry, I encountered an error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!activeCompanyId) {
      toast.error("Please select a company first");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result?.toString().split(",")[1];
      if (base64) {
        const prompt = `Upload this file: ${file.name} (${file.type}) for company ID ${activeCompanyId}`;
        await handleSend(prompt);
      }
    };
    reader.readAsDataURL(file);
  };

  const promptForBiCompany = () => {
    if (pendingBiCompanyPrompt) return;
    appendAssistantMessage("Sure — which company should I generate a BI report for?");
    setPendingBiCompanyPrompt(true);
  };

  const resolvePendingBiRequest = async (companyQuery: string) => {
    const query = companyQuery.trim();
    if (!query) {
      appendAssistantMessage("Please share the company name so I can generate the BI report.");
      setPendingBiCompanyPrompt(true);
      return;
    }

    try {
      const company = await findCompanyByNameMutation.mutateAsync({ query });
      if (!company) {
        appendAssistantMessage(`I couldn't find "${companyQuery}". Please try another name or create the company first.`);
        setPendingBiCompanyPrompt(true);
        return;
      }

      setPendingBiCompanyPrompt(false);
      if (onCompanySelect) {
        onCompanySelect(company.id);
      }
      await generateBiReportForCompany(company.id, company.name);
    } catch (error: any) {
      toast.error("Company lookup failed: " + (error.message || "Unknown error"));
      appendAssistantMessage("I couldn't look up that company. Please try again.");
      setPendingBiCompanyPrompt(true);
    }
  };

  const generateBiReportForCompany = async (companyId: number, companyName?: string) => {
    if (isGeneratingBi) return;

    try {
      setIsGeneratingBi(true);
      const report = await generateBiReportMutation.mutateAsync({
        companyId,
      });

      const summaryText = [
        `Company: ${report.company.name}${report.company.ticker ? ` (${report.company.ticker})` : ""}`,
        `Documents: ${report.summary.documents}`,
        `Runs: ${report.summary.runs}`,
        `Avg ESG Score: ${report.summary.averageScore ?? 0}`,
        `Last Run Status: ${report.summary.lastRunStatus}`,
      ].join("\n");

      appendAssistantMessage(`BI report generated:\n${summaryText}`, {
        imageUrl: report.imageUrl,
        imageAlt: `${report.company.name} BI report`,
      });

      if (onCompanySelect) {
        onCompanySelect(report.company.id);
      }
    } catch (error: any) {
      toast.error("Failed to generate BI report: " + (error.message || "Unknown error"));
    } finally {
      setIsGeneratingBi(false);
    }
  };

  const handleQuickAction = (action: QuickAction) => {
    if (action.mode === "bi-report") {
      promptForBiCompany();
      return;
    }
    if (action.prompt) {
      handleSend(action.prompt);
    }
  };

  const toggleChatState = () => {
    if (chatState === "expanded") {
      setChatState("collapsed");
    } else if (chatState === "collapsed") {
      setChatState("expanded");
    } else {
      setChatState("expanded");
    }
  };

  const minimizeChat = () => {
    setChatState("minimized");
  };

  const expandFromMinimized = () => {
    setChatState("expanded");
  };

  // Minimized state - floating button
  if (chatState === "minimized") {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          size="lg"
          onClick={expandFromMinimized}
          className="rounded-full h-16 w-16 bg-gradient-to-r from-[#FF9A76] to-[#C47FA5] hover:shadow-lg transition-all"
        >
          <MessageSquare className="h-6 w-6 text-white" />
        </Button>
        {messages.length > 1 && (
          <Badge className="absolute -top-2 -right-2 bg-red-500 text-white">
            {messages.length - 1}
          </Badge>
        )}
      </div>
    );
  }

  // Collapsed state - thin sidebar
  if (chatState === "collapsed") {
    return (
      <div className="w-16 h-screen bg-gradient-to-b from-[#FF9A76] via-[#C47FA5] to-[#9B6B9E] flex flex-col items-center py-4 gap-4 border-l">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleChatState}
          className="text-white hover:bg-white/20"
        >
          <MessageSquare className="h-5 w-5" />
        </Button>
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="icon"
          onClick={minimizeChat}
          className="text-white hover:bg-white/20"
        >
          <Minimize2 className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  // Expanded state - full chat panel
  return (
    <div className="w-[400px] flex flex-col h-screen bg-white border-l transition-all duration-300">
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-[#FF9A76] via-[#C47FA5] to-[#9B6B9E] flex items-center justify-between">
        <div className="flex-1">
          <h2 className="text-xl font-bold text-white">ESG Chat Assistant</h2>
          <p className="text-sm text-white/90">Ask questions, run analysis</p>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleChatState}
            className="text-white hover:bg-white/20 h-8 w-8"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={minimizeChat}
            className="text-white hover:bg-white/20 h-8 w-8"
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-3 border-b bg-gray-50">
        <div className="flex gap-2 flex-wrap">
          {QUICK_ACTIONS.map((action) => (
            <Button
              key={action.label}
              variant="outline"
              size="sm"
              onClick={() => handleQuickAction(action)}
              className="text-xs"
              disabled={
                isLoading ||
                (action.mode === "bi-report" ? isGeneratingBi : false)
              }
            >
              <action.icon className="w-3 h-3 mr-1" />
              {action.label}
              {action.mode === "bi-report" && isGeneratingBi && (
                <Loader2 className="w-3 h-3 ml-1 animate-spin" />
              )}
            </Button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
            className={`max-w-[80%] rounded-lg p-3 ${
              message.role === "user"
                ? "bg-gradient-to-r from-[#FF9A76] to-[#C47FA5] text-white"
                : "bg-gray-100 text-gray-900"
            }`}
          >
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            {message.imageUrl && (
              <div className="mt-3 border rounded-lg overflow-hidden bg-white">
                <img
                  src={message.imageUrl}
                  alt={message.imageAlt || "Generated BI report"}
                  className="w-full h-auto"
                />
              </div>
            )}
              
              {/* Tool Call Results */}
              {message.toolCalls && message.toolCalls.length > 0 && (
                <div className="mt-3 space-y-2">
                  {message.toolCalls.map((tool, toolIndex) => (
                    <ToolResultCard key={toolIndex} tool={tool} />
                  ))}
                </div>
              )}

              <p className="text-xs opacity-70 mt-1">
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg p-3">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t bg-gray-50">
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.csv,.txt"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading || !activeCompanyId}
          >
            <Upload className="w-4 h-4" />
          </Button>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Ask me anything about ESG..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button onClick={() => handleSend()} disabled={isLoading || !input.trim()}>
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
        {activeCompanyId && (
          <p className="text-xs text-muted-foreground mt-2">
            Active company: ID {activeCompanyId}
          </p>
        )}
      </div>
    </div>
  );
}

// Tool Result Card Component
function ToolResultCard({ tool }: { tool: ToolCall }) {
  const [isExpanded, setIsExpanded] = useState(true);

  const getToolIcon = (toolName: string) => {
    switch (toolName) {
      case "create_company":
      case "select_company":
        return Building2;
      case "upload_document":
        return Upload;
      case "run_esg_analysis":
        return Play;
      case "sql_query_readonly":
        return BarChart3;
      case "render_chart":
        return BarChart3;
      default:
        return FileText;
    }
  };

  const Icon = getToolIcon(tool.toolName);

  return (
    <Card className="border-2">
      <CardHeader className="p-3 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4" />
            <CardTitle className="text-sm">
              {tool.toolName.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
            </CardTitle>
            {tool.success ? (
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            ) : (
              <XCircle className="w-4 h-4 text-red-600" />
            )}
          </div>
          <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="p-3 pt-0">
          {tool.success && tool.result && (
            <div className="text-sm">
              {/* Render different result types */}
              {tool.result.message && (
                <p className="text-muted-foreground mb-2">{tool.result.message}</p>
              )}
              
              {/* Company list */}
              {tool.result.companies && (
                <div className="space-y-1">
                  {tool.result.companies.slice(0, 5).map((company: any) => (
                    <div key={company.id} className="flex items-center gap-2 text-xs">
                      <Badge variant="outline">{company.id}</Badge>
                      <span>{company.name}</span>
                      {company.ticker && <span className="text-muted-foreground">({company.ticker})</span>}
                    </div>
                  ))}
                </div>
              )}
              
              {/* SQL Query Results */}
              {tool.result.rows && tool.result.columns && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border">
                    <thead>
                      <tr className="bg-gray-100">
                        {tool.result.columns.map((col: string, i: number) => (
                          <th key={i} className="border p-1 text-left">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tool.result.rows.slice(0, 10).map((row: any, i: number) => (
                        <tr key={i}>
                          {tool.result.columns.map((col: string, j: number) => (
                            <td key={j} className="border p-1">{row[col]}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {tool.result.rows.length > 10 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Showing 10 of {tool.result.rowCount} rows
                    </p>
                  )}
                </div>
              )}
              
              {/* Chart */}
              {tool.result.config && (
                <ChartRenderer config={tool.result.config} />
              )}
              
              {/* Run Summary */}
              {tool.result.scores && (
                <div className="space-y-2">
                  <div className="grid grid-cols-4 gap-2">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">E</p>
                      <p className="text-lg font-bold text-green-600">{tool.result.scores.environmental}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">S</p>
                      <p className="text-lg font-bold text-blue-600">{tool.result.scores.social}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">G</p>
                      <p className="text-lg font-bold text-purple-600">{tool.result.scores.governance}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Total</p>
                      <p className="text-lg font-bold">{tool.result.scores.total}</p>
                    </div>
                  </div>
                  {tool.result.findings && tool.result.findings.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold mb-1">Key Findings:</p>
                      <ul className="text-xs space-y-1">
                        {tool.result.findings.slice(0, 3).map((finding: any, i: number) => (
                          <li key={i} className="flex items-start gap-1">
                            <Badge variant="outline" className="text-xs">
                              {finding.category}
                            </Badge>
                            <span>{finding.summary}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          {!tool.success && tool.error && (
            <p className="text-sm text-red-600">{tool.error}</p>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// Chart Renderer Component
function ChartRenderer({ config }: { config: any }) {
  const chartData = config.data.rows.map((row: any) => {
    const obj: any = {};
    config.data.columns.forEach((col: string, i: number) => {
      obj[col] = row[i] !== undefined ? row[i] : row[col];
    });
    return obj;
  });

  const renderChart = () => {
    switch (config.type || "line") {
      case "line":
        return (
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={config.x || config.data.columns[0]} />
            <YAxis />
            <Tooltip />
            <Legend />
            {(Array.isArray(config.y) ? config.y : [config.y || config.data.columns[1]]).map((key: string, i: number) => (
              <Line key={i} type="monotone" dataKey={key} stroke={COLORS[i % COLORS.length]} />
            ))}
          </LineChart>
        );
      
      case "bar":
        return (
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={config.x || config.data.columns[0]} />
            <YAxis />
            <Tooltip />
            <Legend />
            {(Array.isArray(config.y) ? config.y : [config.y || config.data.columns[1]]).map((key: string, i: number) => (
              <Bar key={i} dataKey={key} fill={COLORS[i % COLORS.length]} />
            ))}
          </BarChart>
        );
      
      case "pie":
        return (
          <PieChart>
            <Pie
              data={chartData}
              dataKey={config.y || config.data.columns[1]}
              nameKey={config.x || config.data.columns[0]}
              cx="50%"
              cy="50%"
              outerRadius={80}
              label
            >
              {chartData.map((entry: any, index: number) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        );
      
      case "radar":
        return (
          <RadarChart data={chartData}>
            <PolarGrid />
            <PolarAngleAxis dataKey={config.x || config.data.columns[0]} />
            <PolarRadiusAxis />
            {(Array.isArray(config.y) ? config.y : [config.y || config.data.columns[1]]).map((key: string, i: number) => (
              <Radar key={i} name={key} dataKey={key} stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]} fillOpacity={0.6} />
            ))}
            <Legend />
          </RadarChart>
        );
      
      default:
        return <p className="text-xs text-muted-foreground">Unsupported chart type</p>;
    }
  };

  return (
    <div className="mt-2">
      {config.title && <p className="text-sm font-semibold mb-2">{config.title}</p>}
      <ResponsiveContainer width="100%" height={200}>
        {renderChart()}
      </ResponsiveContainer>
      {config.note && <p className="text-xs text-muted-foreground mt-1">{config.note}</p>}
    </div>
  );
}
