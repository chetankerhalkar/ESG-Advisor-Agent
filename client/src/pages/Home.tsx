import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_LOGO, APP_TITLE, getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Building2, FileText, Play, TrendingUp, Shield, Leaf } from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const { data: companies, isLoading: loadingCompanies } = trpc.companies.list.useQuery();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section with AICK Studio Gradient */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#FF9A76] via-[#C47FA5] to-[#9B6B9E] text-white">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="container relative py-20 md:py-32">
          <div className="flex flex-col items-center text-center space-y-8">
            <div className="w-24 h-24 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20">
              <Shield className="w-12 h-12 text-white" />
            </div>
            <div className="space-y-4 max-w-3xl">
              <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
                ESG Intelligence Agent
              </h1>
              <p className="text-xl md:text-2xl text-white/90">
                Building agentic AI solutions for ESG analysis, compliance, and sustainable business practices.
              </p>
            </div>
            <div className="flex gap-4 flex-wrap justify-center">
              {isAuthenticated ? (
                <Link href="/dashboard">
                  <Button size="lg" className="bg-white text-purple-700 hover:bg-white/90 font-semibold">
                    <Play className="mr-2 h-5 w-5" />
                    Go to Dashboard
                  </Button>
                </Link>
              ) : (
                <Button
                  size="lg"
                  className="bg-white text-purple-700 hover:bg-white/90 font-semibold"
                  onClick={() => window.location.href = getLoginUrl()}
                >
                  Get Started
                </Button>
              )}
              <Button size="lg" variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20">
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gradient-to-b from-white to-gray-50">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4 text-gray-900">Comprehensive ESG Analysis</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              AI-powered insights for environmental, social, and governance performance
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-2 hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <Leaf className="w-6 h-6 text-green-600" />
                </div>
                <CardTitle>Environmental Analysis</CardTitle>
                <CardDescription>
                  Track emissions, energy use, waste management, and climate commitments with AI-powered insights.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <Building2 className="w-6 h-6 text-blue-600" />
                </div>
                <CardTitle>Social Impact</CardTitle>
                <CardDescription>
                  Analyze labor practices, diversity metrics, community engagement, and supply chain ethics.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-purple-600" />
                </div>
                <CardTitle>Governance</CardTitle>
                <CardDescription>
                  Evaluate board structure, transparency, executive compensation, and regulatory compliance.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Key Features */}
      <section className="py-20 bg-white">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-4xl font-bold text-gray-900">Intelligent ESG Agent</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1">Document Analysis</h3>
                    <p className="text-gray-600">
                      Automatically extract ESG signals from PDFs, CSVs, and web sources with AI-powered parsing.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1">Greenwashing Detection</h3>
                    <p className="text-gray-600">
                      Identify misleading claims and verify ESG statements with evidence-based analysis.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Shield className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1">Action Plans</h3>
                    <p className="text-gray-600">
                      Generate prioritized recommendations with impact estimates, cost analysis, and confidence scores.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-8 border-2 border-purple-100">
              <div className="space-y-4">
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">Environmental Score</span>
                    <span className="text-2xl font-bold text-green-600">78</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-600 h-2 rounded-full" style={{ width: '78%' }}></div>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">Social Score</span>
                    <span className="text-2xl font-bold text-blue-600">82</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: '82%' }}></div>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">Governance Score</span>
                    <span className="text-2xl font-bold text-purple-600">85</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-purple-600 h-2 rounded-full" style={{ width: '85%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {!isAuthenticated && (
        <section className="py-20 bg-gradient-to-br from-[#FF9A76] via-[#C47FA5] to-[#9B6B9E] text-white">
          <div className="container text-center">
            <h2 className="text-4xl font-bold mb-6">Ready to Transform Your ESG Analysis?</h2>
            <p className="text-xl mb-8 text-white/90 max-w-2xl mx-auto">
              Join leading enterprises using AI-powered ESG intelligence for better sustainability decisions.
            </p>
            <Button
              size="lg"
              className="bg-white text-purple-700 hover:bg-white/90 font-semibold"
              onClick={() => window.location.href = getLoginUrl()}
            >
              Start Analyzing Now
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
