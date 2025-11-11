import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { 
  ArrowLeft, Play, Upload, FileText, CheckCircle2, XCircle, 
  AlertTriangle, TrendingUp, Leaf, Building2, Shield, Clock
} from "lucide-react";
import { Link, useParams } from "wouter";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function CompanyDetail() {
  const params = useParams();
  const companyId = parseInt(params.id || "0");
  
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<any>(null);
  const [feedback, setFeedback] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const { data, isLoading, refetch } = trpc.companies.getById.useQuery({ id: companyId });
  const { data: runsData } = trpc.runs.listByCompany.useQuery({ companyId });
  
  const startRunMutation = trpc.runs.start.useMutation({
    onSuccess: (result) => {
      toast.success("ESG analysis started! Run ID: " + result.runId);
      refetch();
      // Poll for updates
      const interval = setInterval(() => {
        refetch();
      }, 3000);
      setTimeout(() => clearInterval(interval), 60000); // Stop after 1 minute
    },
    onError: (error) => {
      toast.error("Failed to start analysis: " + error.message);
    }
  });

  const approveMutation = trpc.actions.approve.useMutation({
    onSuccess: () => {
      toast.success("Action approved successfully");
      setApprovalDialogOpen(false);
      setFeedback("");
      refetch();
    }
  });

  const rejectMutation = trpc.actions.reject.useMutation({
    onSuccess: () => {
      toast.success("Action rejected");
      setApprovalDialogOpen(false);
      setFeedback("");
      refetch();
    }
  });

  const uploadMutation = trpc.documents.upload.useMutation({
    onSuccess: () => {
      toast.success("Document uploaded successfully");
      setUploadDialogOpen(false);
      setUploadFile(null);
      refetch();
    },
    onError: (error) => {
      toast.error("Upload failed: " + error.message);
    }
  });

  const handleFileUpload = async () => {
    if (!uploadFile) {
      toast.error("Please select a file");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result?.toString().split(',')[1];
      if (base64) {
        uploadMutation.mutate({
          companyId,
          filename: uploadFile.name,
          content: base64,
          mime: uploadFile.type,
          kind: uploadFile.type.includes('pdf') ? 'pdf' : 'csv',
        });
      }
    };
    reader.readAsDataURL(uploadFile);
  };

  const handleApprove = () => {
    if (selectedAction) {
      approveMutation.mutate({ id: selectedAction.id, feedback });
    }
  };

  const handleReject = () => {
    if (selectedAction) {
      rejectMutation.mutate({ id: selectedAction.id, feedback });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!data?.company) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Company not found</h2>
          <Link href="/dashboard">
            <Button>Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  const { company, latestMetrics: latestMetricsArray, runs, documents } = data;
  
  // Convert metrics array to scores object
  const latestMetrics = latestMetricsArray && latestMetricsArray.length > 0 ? {
    eScore: latestMetricsArray.find((m: any) => m.category === "environmental")?.value || 0,
    sScore: latestMetricsArray.find((m: any) => m.category === "social")?.value || 0,
    gScore: latestMetricsArray.find((m: any) => m.category === "governance")?.value || 0,
    total: Math.round(latestMetricsArray.reduce((sum: number, m: any) => sum + m.value, 0) / latestMetricsArray.length),
  } : null;
  const latestRun = runs && runs.length > 0 ? runs[0] : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#FF9A76] via-[#C47FA5] to-[#9B6B9E] text-white">
        <div className="container py-8">
          <Link href="/dashboard">
            <Button variant="ghost" className="text-white hover:bg-white/20 mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-4xl font-bold">{company.name}</h1>
                {company.ticker && (
                  <Badge className="bg-white/20 text-white border-white/30">
                    {company.ticker}
                  </Badge>
                )}
              </div>
              <p className="text-white/90 text-lg">
                {company.sector} {company.country && `• ${company.country}`}
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                size="lg"
                className="bg-white text-purple-700 hover:bg-white/90 font-semibold"
                onClick={() => setUploadDialogOpen(true)}
              >
                <Upload className="mr-2 h-5 w-5" />
                Upload Document
              </Button>
              <Button
                size="lg"
                className="bg-green-600 hover:bg-green-700 text-white font-semibold"
                onClick={() => startRunMutation.mutate({ companyId })}
                disabled={startRunMutation.isPending}
              >
                <Play className="mr-2 h-5 w-5" />
                {startRunMutation.isPending ? "Starting..." : "Run Analysis"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-12">
        {/* ESG Scores */}
        {latestMetrics && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6">ESG Scorecard</h2>
            <div className="grid md:grid-cols-4 gap-6">
              <Card className="border-2">
                <CardHeader>
                  <CardDescription>Overall Score</CardDescription>
                  <CardTitle className="text-4xl text-primary">{latestMetrics.total}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-primary h-3 rounded-full transition-all" 
                      style={{ width: `${latestMetrics.total}%` }}
                    ></div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2">
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <Leaf className="w-5 h-5 text-green-600" />
                    <CardDescription>Environmental</CardDescription>
                  </div>
                  <CardTitle className="text-4xl text-green-600">{latestMetrics.eScore}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-green-600 h-3 rounded-full transition-all" 
                      style={{ width: `${latestMetrics.eScore}%` }}
                    ></div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2">
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="w-5 h-5 text-blue-600" />
                    <CardDescription>Social</CardDescription>
                  </div>
                  <CardTitle className="text-4xl text-blue-600">{latestMetrics.sScore}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-blue-600 h-3 rounded-full transition-all" 
                      style={{ width: `${latestMetrics.sScore}%` }}
                    ></div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2">
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-5 h-5 text-purple-600" />
                    <CardDescription>Governance</CardDescription>
                  </div>
                  <CardTitle className="text-4xl text-purple-600">{latestMetrics.gScore}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-purple-600 h-3 rounded-full transition-all" 
                      style={{ width: `${latestMetrics.gScore}%` }}
                    ></div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Tabs for different sections */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="documents">Documents ({documents?.length || 0})</TabsTrigger>
            <TabsTrigger value="runs">Analysis Runs ({runs?.length || 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {latestRun && latestRun.status === "completed" && (
              <RunDetails runId={latestRun.id} />
            )}
            {!latestRun && (
              <Card className="border-2 border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Play className="w-16 h-16 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No analysis yet</h3>
                  <p className="text-muted-foreground mb-6 text-center max-w-md">
                    Upload documents and run ESG analysis to see findings and recommendations
                  </p>
                  <Button onClick={() => startRunMutation.mutate({ companyId })}>
                    <Play className="mr-2 h-4 w-4" />
                    Run Analysis
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <CardTitle>Uploaded Documents</CardTitle>
                <CardDescription>Documents used for ESG analysis</CardDescription>
              </CardHeader>
              <CardContent>
                {documents && documents.length > 0 ? (
                  <div className="space-y-3">
                    {documents.map((doc) => (
                      <div key={doc.id} className="flex items-center gap-3 p-3 border rounded-lg">
                        <FileText className="w-5 h-5 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="font-medium">{doc.filename || 'Untitled'}</p>
                          <p className="text-sm text-muted-foreground">
                            {doc.kind} • {new Date(doc.uploadedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant="outline">{doc.kind}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No documents uploaded yet
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="runs">
            <Card>
              <CardHeader>
                <CardTitle>Analysis History</CardTitle>
                <CardDescription>Previous ESG analysis runs</CardDescription>
              </CardHeader>
              <CardContent>
                {runs && runs.length > 0 ? (
                  <div className="space-y-3">
                    {runs.map((run) => (
                      <div key={run.id} className="flex items-center gap-3 p-3 border rounded-lg">
                        <Clock className="w-5 h-5 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="font-medium">Run #{run.id}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(run.startedAt).toLocaleString()}
                          </p>
                        </div>
                        <Badge variant={run.status === "completed" ? "default" : run.status === "failed" ? "destructive" : "secondary"}>
                          {run.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No analysis runs yet
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>
              Upload ESG reports, CSVs, or other relevant documents
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="file">Select File</Label>
              <Input
                id="file"
                type="file"
                accept=".pdf,.csv,.txt"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              />
              <p className="text-sm text-muted-foreground">
                Supported formats: PDF, CSV, TXT
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleFileUpload} disabled={uploadMutation.isPending || !uploadFile}>
              {uploadMutation.isPending ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Component to display run details
function RunDetails({ runId }: { runId: number }) {
  const { data, isLoading } = trpc.runs.getById.useQuery({ id: runId });
  const [selectedAction, setSelectedAction] = useState<any>(null);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [feedback, setFeedback] = useState("");

  const approveMutation = trpc.actions.approve.useMutation({
    onSuccess: () => {
      toast.success("Action approved");
      setApprovalDialogOpen(false);
    }
  });

  const rejectMutation = trpc.actions.reject.useMutation({
    onSuccess: () => {
      toast.success("Action rejected");
      setApprovalDialogOpen(false);
    }
  });

  if (isLoading || !data) return null;

  const { findings, actions } = data;

  const getSeverityColor = (severity: number) => {
    if (severity >= 4) return "text-red-600 bg-red-50";
    if (severity >= 3) return "text-orange-600 bg-orange-50";
    return "text-yellow-600 bg-yellow-50";
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "greenwashing": return <AlertTriangle className="w-4 h-4" />;
      case "supply_chain": return <TrendingUp className="w-4 h-4" />;
      case "diversity": return <Building2 className="w-4 h-4" />;
      case "governance": return <Shield className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <>
      {/* Findings */}
      <div>
        <h2 className="text-2xl font-bold mb-6">Key Findings</h2>
        <div className="space-y-4">
          {findings && findings.length > 0 ? (
            findings.map((finding) => (
              <Card key={finding.id} className="border-l-4" style={{ borderLeftColor: finding.severity === 'critical' || finding.severity === 'high' ? '#dc2626' : finding.severity === 'medium' ? '#ea580c' : '#eab308' }}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(finding.category)}
                      <CardTitle className="text-lg">{finding.summary}</CardTitle>
                    </div>
                    <Badge className={getSeverityColor(finding.severity as any)}>
                      {finding.severity}
                    </Badge>
                  </div>
                  <CardDescription className="mt-2">{finding.evidence}</CardDescription>
                </CardHeader>
                {finding.details && (
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      <strong>Details:</strong> {finding.details}
                    </p>
                  </CardContent>
                )}
              </Card>
            ))
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center text-muted-foreground">
                No findings available
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Actions */}
      <div>
        <h2 className="text-2xl font-bold mb-6">Recommended Actions</h2>
        <div className="space-y-4">
          {actions && actions.length > 0 ? (
            actions.map((action) => (
              <Card key={action.id} className="border-2">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline">Priority {action.priority}</Badge>
                        <Badge variant={
                          action.status === "approved" ? "default" :
                          action.status === "rejected" ? "destructive" :
                          "secondary"
                        }>
                          {action.status === "approved" && <CheckCircle2 className="w-3 h-3 mr-1" />}
                          {action.status === "rejected" && <XCircle className="w-3 h-3 mr-1" />}
                          {action.status}
                        </Badge>
                      </div>
                      <CardTitle className="text-xl mb-2">{action.title}</CardTitle>
                      <CardDescription>{action.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Expected Impact</p>
                      <p className="text-lg font-semibold text-green-600">+{action.estimatedImpact} pts</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Cost Estimate</p>
                      <p className="text-lg font-semibold">{action.estimatedCost}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Confidence</p>
                      <p className="text-lg font-semibold">{action.confidence}%</p>
                    </div>
                  </div>
                  {action.status === "proposed" && (
                    <div className="flex gap-2">
                      <Button 
                        className="flex-1" 
                        onClick={() => {
                          setSelectedAction(action);
                          setApprovalDialogOpen(true);
                        }}
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Approve
                      </Button>
                      <Button 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => {
                          setSelectedAction(action);
                          setApprovalDialogOpen(true);
                        }}
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Reject
                      </Button>
                    </div>
                  )}
                  {(action.status === "approved" || action.status === "rejected") && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Status updated on {new Date(action.updatedAt).toLocaleDateString()}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center text-muted-foreground">
                No action recommendations available
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Approval Dialog */}
      <Dialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Action Decision</DialogTitle>
            <DialogDescription>
              {selectedAction?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="feedback">Feedback (Optional)</Label>
              <Textarea
                id="feedback"
                placeholder="Add any notes or feedback..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                rejectMutation.mutate({ id: selectedAction?.id, feedback });
              }}
              disabled={rejectMutation.isPending}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Reject
            </Button>
            <Button 
              onClick={() => {
                approveMutation.mutate({ id: selectedAction?.id, feedback });
              }}
              disabled={approveMutation.isPending}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
