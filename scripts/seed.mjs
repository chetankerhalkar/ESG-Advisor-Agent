
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { companies, documents, esgMetrics, findings, actions, runs } from "../drizzle/schema.js";

const client = createClient({ url: process.env.DATABASE_URL || "file:./esg-agent.db3" });
const db = drizzle(client);

async function seed() {
  console.log("🌱 Seeding database with demo data...");

  try {
    // Create demo companies
    console.log("Creating demo companies...");

    const company1 = await db.insert(companies).values({
      name: "TechCorp Global",
      ticker: "TECH",
      sector: "Technology",
      country: "United States",
    });

    const company2 = await db.insert(companies).values({
      name: "GreenEnergy Solutions",
      ticker: "GREN",
      sector: "Energy",
      country: "Germany",
    });

    const company3 = await db.insert(companies).values({
      name: "Sustainable Manufacturing Inc",
      ticker: "SUST",
      sector: "Manufacturing",
      country: "Japan",
    });

    const companyId1 = Number(company1.lastInsertRowid);
    const companyId2 = Number(company2.lastInsertRowid);
    const companyId3 = Number(company3.lastInsertRowid);

    console.log(`✓ Created companies: ${companyId1}, ${companyId2}, ${companyId3}`);

    // Create demo documents
    console.log("Creating demo documents...");
    await db.insert(documents).values([
      {
        companyId: companyId1,
        kind: "pdf",
        filename: "TechCorp_ESG_Report_2024.pdf",
        sourceUrl: "https://example.com/techcorp-esg-2024.pdf",
        fileKey: "demo/techcorp-esg-2024.pdf",
        mime: "application/pdf",
        textExcerpt: "TechCorp is committed to reducing carbon emissions by 50% by 2030. Our diversity initiatives have increased representation of underrepresented groups to 35%.",
      },
      {
        companyId: companyId1,
        kind: "csv",
        filename: "emissions_data_2024.csv",
        sourceUrl: "https://example.com/emissions-2024.csv",
        fileKey: "demo/emissions-2024.csv",
        mime: "text/csv",
        textExcerpt: "Year,Scope1,Scope2,Scope3\n2024,1200,3400,8900",
      },
      {
        companyId: companyId2,
        kind: "pdf",
        filename: "GreenEnergy_Sustainability_Report.pdf",
        sourceUrl: "https://example.com/greenenergy-report.pdf",
        fileKey: "demo/greenenergy-report.pdf",
        mime: "application/pdf",
        textExcerpt: "GreenEnergy Solutions achieved 100% renewable energy in operations. Board diversity stands at 40% with strong governance practices.",
      },
    ]);

    console.log("✓ Created demo documents");

    // Create demo run for company 1
    console.log("Creating demo analysis run...");
    const run1 = await db.insert(runs).values({
      companyId: companyId1,
      model: "gpt-4o-mini",
      status: "completed",
      tokenIn: 1500,
      tokenOut: 2500,
      cost: 45,
        finishedAt: new Date(),
    });

    const runId1 = Number(run1.lastInsertRowid);
    console.log(`✓ Created run: ${runId1}`);

    // Create demo ESG metrics
    console.log("Creating demo ESG metrics...");

    await db.insert(esgMetrics).values({
      companyId: companyId1,
      runId: runId1,
      category: "environmental",
      metric: "carbon_emissions",
      value: 78,
      unit: "score",
      period: "2024-11",
        source: "AI-powered analysis using LLM with document parsing and evidence extraction",
        createdAt: new Date(),
    });

    console.log("✓ Created ESG metrics");

    // Create demo findings
    console.log("Creating demo findings...");
    await db.insert(findings).values([
      {
        companyId: companyId1,
        runId: runId1,
        category: "greenwashing",
        severity: "high",
        summary: "Carbon neutrality claims lack third-party verification",
        details: "Company claims carbon neutrality by 2030 but provides no independent audit or verification methodology.",
        evidence: "Company claims carbon neutrality by 2030 but provides no independent audit or verification methodology.",
        isGreenwashing: 1,
        confidence: 0.9,
          citation: "TechCorp ESG Report 2024, Page 12",
          createdAt: new Date(),
      },
      {
        companyId: companyId1,
        runId: runId1,
        category: "supply_chain",
        severity: "critical",
        summary: "Limited supply chain transparency in manufacturing",
        details: "No disclosure of Tier 2 and Tier 3 suppliers. Potential labor rights risks in Southeast Asian facilities.",
        evidence: "No disclosure of Tier 2 and Tier 3 suppliers. Potential labor rights risks in Southeast Asian facilities.",
        isGreenwashing: 0,
        confidence: 0.8,
          citation: "Supply Chain Section, ESG Report 2024",
          createdAt: new Date(),
      },
      {
        companyId: companyId1,
        runId: runId1,
        category: "diversity",
        severity: "medium",
        summary: "Gender pay gap persists in executive compensation",
        details: "Female executives earn 15% less than male counterparts in similar roles.",
        evidence: "Female executives earn 15% less than male counterparts in similar roles.",
        isGreenwashing: 0,
        confidence: 0.85,
          citation: "Compensation Report 2024, Page 45",
          createdAt: new Date(),
      },
      {
        companyId: companyId1,
        runId: runId1,
        category: "governance",
        severity: "low",
        summary: "Board independence could be improved",
        details: "Only 60% of board members are independent. Industry best practice is 75%+.",
        evidence: "Only 60% of board members are independent. Industry best practice is 75%+.",
        isGreenwashing: 0,
        confidence: 0.8,
          citation: "Corporate Governance Statement 2024",
          createdAt: new Date(),
      },
    ]);

    console.log("✓ Created demo findings");

    // Create demo actions
    console.log("Creating demo action recommendations...");
    await db.insert(actions).values([
      {
        companyId: companyId1,
        runId: runId1,
        title: "Implement third-party carbon audit and verification",
        description: "To validate carbon neutrality claims and prevent greenwashing accusations, engage an independent auditor (e.g., Bureau Veritas, SGS) to verify emissions data and reduction targets.",
        category: "environmental",
        priority: "critical",
        estimatedImpact: 12,
        estimatedCost: "150000",
        timeline: "2024-2025",
        status: "proposed",
        reasoning: "Industry best practice for carbon neutrality verification.",
        confidence: 0.85,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        companyId: companyId1,
        runId: runId1,
        title: "Expand supply chain transparency program",
        description: "Map and disclose Tier 2 and Tier 3 suppliers, conduct human rights due diligence audits, and implement supplier code of conduct with regular monitoring.",
        category: "social",
        priority: "critical",
        estimatedImpact: 15,
        estimatedCost: "250000",
        timeline: "2024-2025",
        status: "proposed",
        reasoning: "Improves supply chain transparency and reduces risk.",
        confidence: 0.78,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        companyId: companyId1,
        runId: runId1,
        title: "Address executive compensation gender gap",
        description: "Conduct pay equity analysis and implement corrective measures. Set targets for equal pay and include pay equity metrics in executive compensation scorecards.",
        category: "social",
        priority: "high",
        estimatedImpact: 8,
        estimatedCost: "75000",
        timeline: "2024-2025",
        status: "proposed",
        reasoning: "Promotes diversity and inclusion in executive compensation.",
        confidence: 0.9,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        companyId: companyId1,
        runId: runId1,
        title: "Increase board independence to 75%",
        description: "Recruit additional independent directors with ESG expertise. Prioritize candidates with sustainability, climate science, or social impact backgrounds.",
        category: "governance",
        priority: "medium",
        estimatedImpact: 6,
        estimatedCost: "50000",
        timeline: "2024-2025",
        status: "proposed",
        reasoning: "Aligns with corporate governance best practices.",
        confidence: 0.82,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    console.log("✓ Created demo action recommendations");

    console.log("\n✅ Database seeded successfully!");
    console.log("\nDemo data summary:");
    console.log(`- Companies: 3 (TechCorp Global, GreenEnergy Solutions, Sustainable Manufacturing Inc)`);
    console.log(`- Documents: 3`);
    console.log(`- Analysis Runs: 1 (completed)`);
    console.log(`- ESG Metrics: 1 (E:78, S:82, G:85, Total:82)`);
    console.log(`- Findings: 4 (greenwashing, supply chain, diversity, governance)`);
    console.log(`- Action Recommendations: 4 (all proposed)`);
    console.log("\n🚀 Ready to test! Visit the dashboard to see the demo company.");

  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
