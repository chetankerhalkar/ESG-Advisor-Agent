import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Building2, FileText, Play, Plus, TrendingUp } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import ChatPanel from "@/components/ChatPanel";

export default function Dashboard() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newCompany, setNewCompany] = useState({ name: "", ticker: "", sector: "", country: "" });
  const [selectedCompany, setSelectedCompany] = useState<number | undefined>();

  const { data: companies, isLoading, refetch } = trpc.companies.list.useQuery();
  const createCompanyMutation = trpc.companies.create.useMutation({
    onSuccess: () => {
      toast.success("Company created successfully");
      setCreateDialogOpen(false);
      setNewCompany({ name: "", ticker: "", sector: "", country: "" });
      refetch();
    },
    onError: (error) => {
      toast.error("Failed to create company: " + error.message);
    }
  });

  const handleCreateCompany = () => {
    if (!newCompany.name) {
      toast.error("Company name is required");
      return;
    }
    createCompanyMutation.mutate(newCompany);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="flex-1">
      {/* Header with gradient */}
      <div className="bg-gradient-to-r from-[#FF9A76] via-[#C47FA5] to-[#9B6B9E] text-white">
        <div className="container py-12">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">ESG Dashboard</h1>
              <p className="text-white/90 text-lg">Manage companies and analyze ESG performance</p>
            </div>
            <Button
              size="lg"
              className="bg-white text-purple-700 hover:bg-white/90 font-semibold"
              onClick={() => setCreateDialogOpen(true)}
            >
              <Plus className="mr-2 h-5 w-5" />
              Add Company
            </Button>
          </div>
        </div>
      </div>

      <div className="container py-12">
        {/* Stats Overview */}
        <div className="grid md:grid-cols-4 gap-6 mb-12">
          <Card className="border-2">
            <CardHeader className="pb-3">
              <CardDescription>Total Companies</CardDescription>
              <CardTitle className="text-3xl">{companies?.length || 0}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-muted-foreground">
                <Building2 className="mr-2 h-4 w-4" />
                Tracked entities
              </div>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardHeader className="pb-3">
              <CardDescription>Avg ESG Score</CardDescription>
              <CardTitle className="text-3xl text-green-600">--</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-muted-foreground">
                <TrendingUp className="mr-2 h-4 w-4" />
                Overall performance
              </div>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardHeader className="pb-3">
              <CardDescription>Active Runs</CardDescription>
              <CardTitle className="text-3xl text-blue-600">0</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-muted-foreground">
                <Play className="mr-2 h-4 w-4" />
                In progress
              </div>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardHeader className="pb-3">
              <CardDescription>Documents</CardDescription>
              <CardTitle className="text-3xl text-purple-600">0</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-muted-foreground">
                <FileText className="mr-2 h-4 w-4" />
                Analyzed files
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Companies List */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Companies</h2>
          {companies && companies.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {companies.map((company) => (
                <Link key={company.id} href={`/company/${company.id}`}>
                  <Card className="border-2 hover:shadow-lg transition-all cursor-pointer hover:border-primary">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg flex items-center justify-center mb-3">
                          <Building2 className="w-6 h-6 text-purple-600" />
                        </div>
                        {company.ticker && (
                          <span className="px-2 py-1 bg-primary/10 text-primary text-xs font-semibold rounded">
                            {company.ticker}
                          </span>
                        )}
                      </div>
                      <CardTitle className="text-xl">{company.name}</CardTitle>
                      <CardDescription>
                        {company.sector && <span>{company.sector}</span>}
                        {company.sector && company.country && <span> • </span>}
                        {company.country && <span>{company.country}</span>}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button variant="outline" className="w-full" size="sm">
                        View Analysis
                      </Button>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <Card className="border-2 border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Building2 className="w-16 h-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No companies yet</h3>
                <p className="text-muted-foreground mb-6 text-center max-w-md">
                  Get started by adding your first company to analyze ESG performance
                </p>
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Company
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Create Company Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Company</DialogTitle>
            <DialogDescription>
              Create a new company profile for ESG analysis
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Company Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Acme Corporation"
                value={newCompany.name}
                onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ticker">Stock Ticker</Label>
              <Input
                id="ticker"
                placeholder="e.g., ACME"
                value={newCompany.ticker}
                onChange={(e) => setNewCompany({ ...newCompany, ticker: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sector">Sector</Label>
              <Input
                id="sector"
                placeholder="e.g., Technology"
                value={newCompany.sector}
                onChange={(e) => setNewCompany({ ...newCompany, sector: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                placeholder="e.g., United States"
                value={newCompany.country}
                onChange={(e) => setNewCompany({ ...newCompany, country: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateCompany} disabled={createCompanyMutation.isPending}>
              {createCompanyMutation.isPending ? "Creating..." : "Create Company"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>

      {/* Chat Panel */}
      <div className="h-screen sticky top-0 flex-shrink-0">
        <ChatPanel activeCompanyId={selectedCompany} onCompanySelect={setSelectedCompany} />
      </div>
    </div>
  );
}
