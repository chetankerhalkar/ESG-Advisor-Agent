# ESG Intelligence Agent

> AI-powered platform for comprehensive Environmental, Social, and Governance (ESG) analysis, compliance tracking, and sustainable business practices.

![ESG Intelligence Agent](https://img.shields.io/badge/ESG-Intelligence%20Agent-9B6B9E?style=for-the-badge)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)
![tRPC](https://img.shields.io/badge/tRPC-11-2596BE?style=flat-square)
![OpenAI](https://img.shields.io/badge/OpenAI-API-412991?style=flat-square&logo=openai)

---

## 🌟 Features

### Core ESG Analysis
- **AI-Powered Document Analysis** - Automatically extract ESG signals from PDFs, CSVs, and web sources
- **Comprehensive Scoring** - Environmental, Social, and Governance metrics with detailed breakdowns
- **Greenwashing Detection** - Identify misleading claims and verify ESG statements with evidence-based analysis
- **Action Plan Generation** - Prioritized recommendations with impact estimates, cost analysis, and confidence scores
- **Supply Chain Ethics** - Analyze labor practices, diversity metrics, and community engagement

### Chat Assistant & Gen-BI
- **Conversational AI Interface** - Natural language interaction for all ESG operations
- **12 Tool Functions** - Create companies, upload documents, run analysis, query data
- **Gen-BI Analytics** - Translate questions into safe SQL queries with automatic chart generation
- **Interactive Visualizations** - Line, bar, pie, and radar charts with Recharts
- **Tool Result Cards** - Expandable cards showing company info, SQL results, ESG scores, and charts
- **Quick Actions** - One-click access to common tasks (New Company, Upload Docs, Ask BI, Run ESG)

### Chat Window Controls
- **Expand/Collapse** - Toggle between full panel and thin sidebar
- **Minimize** - Convert to floating button with message counter
- **State Persistence** - Remembers your preferred chat state in localStorage
- **Smooth Transitions** - Animated state changes for better UX

### User Experience
- **Beautiful AICK Studio Theme** - Coral-to-purple gradient design matching aickstudio.ai
- **Responsive Dashboard** - Company management with real-time stats
- **Document Upload Center** - Drag-drop interface for PDFs and CSVs
- **Real-time Updates** - Live progress tracking for analysis runs
- **Human-in-the-Loop** - Approve or reject AI-generated action recommendations

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and pnpm
- OpenAI API key
- **No database server required!** (Uses SQLite)

### Installation

```bash
# 1. Extract or clone the project
unzip esg-agent.zip && cd esg-agent

# 2. Install dependencies
pnpm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your database URL and OpenAI API key

# 4. Set up database
pnpm db:push

# 5. (Optional) Seed sample data
npx tsx scripts/seed.ts

# 6. Start development server
pnpm dev
```

Open http://localhost:3000 and start analyzing ESG performance!

**📖 For detailed setup instructions, see [SETUP_GUIDE.md](./SETUP_GUIDE.md)**

---

## 📊 Tech Stack

### Frontend
- **React 19** - Latest React with concurrent features
- **TypeScript** - Type-safe development
- **Vite** - Lightning-fast build tool
- **Tailwind CSS 4** - Utility-first styling with OKLCH colors
- **shadcn/ui** - Beautiful, accessible components
- **Recharts** - Composable charting library
- **Wouter** - Lightweight routing

### Backend
- **Express 4** - Web framework
- **tRPC 11** - End-to-end typesafe APIs
- **Drizzle ORM** - TypeScript ORM for MySQL/TiDB
- **OpenAI API** - GPT-4 for ESG analysis
- **Superjson** - Automatic serialization of complex types

### Database
- **SQLite 3** - Local file database (no server required!)
- **8 Tables** - Users, companies, documents, metrics, findings, actions, runs, eval_labels
- **libsql/client** - Modern SQLite driver for Node.js

### Infrastructure
- **S3-compatible Storage** - Document and file storage
- **JWT Authentication** - Secure session management
- **OAuth Integration** - Manus platform authentication

---

## 🗂️ Project Structure

```
esg-agent/
├── client/                      # Frontend React application
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChatPanel.tsx   # Chat assistant with expand/collapse/minimize
│   │   │   └── ui/             # shadcn/ui components
│   │   ├── pages/
│   │   │   ├── Home.tsx        # Landing page
│   │   │   ├── Dashboard.tsx   # Company management dashboard
│   │   │   └── CompanyDetail.tsx # ESG analysis interface
│   │   ├── lib/trpc.ts         # tRPC client setup
│   │   └── App.tsx             # Routes and layout
│   └── index.html
├── server/                      # Backend Express + tRPC
│   ├── routers.ts              # Main API router
│   ├── chatRouter.ts           # Chat assistant endpoints
│   ├── chatTools.ts            # 12 chat tool implementations
│   ├── esgAgent.ts             # ESG analysis logic
│   ├── db.ts                   # Database helpers
│   └── storage.ts              # S3 storage helpers
├── drizzle/
│   └── schema.ts               # Database schema (8 tables)
├── sample-data/                # Sample CSV and PDF files
│   ├── techcorp_emissions_2024.csv
│   ├── greenenergy_diversity_2024.csv
│   ├── sustainable_mfg_safety_2024.csv
│   └── *.txt (PDF content)
├── scripts/
│   └── seed.ts                 # Database seeding
├── .env                        # Environment variables (create this)
├── SETUP_GUIDE.md             # Detailed setup instructions
└── README.md                   # This file
```

---

## 💬 Chat Assistant Usage

The Chat Assistant supports natural language interactions for all ESG operations.

### Example Conversations

**Create a Company:**
```
User: Create a new company: Tesla Inc, ticker TSLA, sector Automotive, US
Assistant: ✓ Company created successfully! Tesla Inc (TSLA) added to your portfolio.
```

**Upload Documents:**
```
User: Upload the TechCorp emissions CSV for company ID 1
Assistant: ✓ Document uploaded and parsed. Found 8 quarters of emissions data.
```

**Run ESG Analysis:**
```
User: Run ESG analysis for Tesla
Assistant: ✓ Analysis complete!
         Environmental: 78 | Social: 82 | Governance: 85 | Total: 82
         Found 4 key findings and 3 recommended actions.
```

**Gen-BI Analytics:**
```
User: Show me ESG scores trend for all companies
Assistant: [SQL Query Executed]
         [Interactive Line Chart Displayed]
         Showing ESG scores for 3 companies over 4 quarters.
```

**Get Insights:**
```
User: Which company has the highest environmental score?
Assistant: GreenEnergy Solutions leads with an Environmental score of 92,
         driven by 100% renewable operations and carbon-negative targets.
```

### Available Tools

1. **create_company** - Add new companies to the system
2. **list_companies** - Search and list all companies
3. **select_company** - Set active company context
4. **upload_document** - Upload PDF/CSV files
5. **parse_and_ingest** - Process uploaded documents
6. **run_esg_analysis** - Start ESG analysis runs
7. **get_run_summary** - Get analysis results with scores and findings
8. **describe_schema** - Get database schema for Gen-BI
9. **sql_query_readonly** - Execute safe SELECT queries
10. **render_chart** - Generate visualizations (line/bar/pie/radar)
11. **open_citation** - Show document excerpts with citations
12. **Human approval** - Approve/reject AI recommendations

---

## 📈 Sample Data

The `sample-data/` directory contains realistic ESG data for three companies:

### 1. TechCorp Global (Technology)
- **CSV**: Quarterly emissions data (Scope 1/2/3, renewable energy %)
- **PDF**: Comprehensive ESG report with carbon reduction targets
- **Highlights**: 65% renewable energy, 14% emissions reduction vs 2023

### 2. GreenEnergy Solutions (Energy)
- **CSV**: Workforce diversity and safety metrics by department
- **PDF**: Sustainability report with 100% renewable operations
- **Highlights**: MSCI ESG Rating AAA, CDP Climate A, 40% women in workforce

### 3. Sustainable Manufacturing Inc. (Manufacturing)
- **CSV**: Monthly safety incidents and compliance data
- **PDF**: ESG performance with focus on safety and operations
- **Highlights**: LTIFR 0.48, ISO 9001/14001/45001/27001 certified

**See [sample-data/README.md](./sample-data/README.md) for detailed usage instructions.**

---

## 🎨 Design System

### Color Palette (OKLCH Format)
- **Primary Gradient**: `#FF9A76` (Coral) → `#C47FA5` (Rose) → `#9B6B9E` (Purple)
- **Environmental**: `oklch(0.65 0.15 145)` (Green)
- **Social**: `oklch(0.60 0.12 240)` (Blue)
- **Governance**: `oklch(0.55 0.10 300)` (Purple)

### Typography
- **Font**: Inter (Google Fonts)
- **Headings**: Bold, gradient text for hero sections
- **Body**: Regular, high contrast for readability

### Components
- **Cards**: Border-2, hover effects, gradient icons
- **Buttons**: Gradient primary, outline secondary
- **Chat**: Expandable panel with smooth transitions

---

## 🔐 Security

### Best Practices Implemented
- ✅ JWT-based authentication with secure session cookies
- ✅ SQL injection prevention with parameterized queries
- ✅ Read-only SQL for Gen-BI (no INSERT/UPDATE/DELETE)
- ✅ API key validation and rate limiting
- ✅ CORS configuration for production
- ✅ Environment variable isolation
- ✅ Input sanitization and validation

### Production Checklist
- [ ] Rotate JWT_SECRET to a strong random value
- [ ] Enable HTTPS/SSL for all connections
- [ ] Set up database backups
- [ ] Configure rate limiting for OpenAI API
- [ ] Enable audit logging for sensitive operations
- [ ] Review and restrict CORS origins
- [ ] Set up monitoring and alerting

---

## 📝 API Documentation

### tRPC Procedures

#### Companies
- `companies.list` - Get all companies
- `companies.create` - Create new company
- `companies.getById` - Get company details

#### Documents
- `documents.upload` - Upload PDF/CSV file
- `documents.list` - Get company documents

#### Analysis
- `analysis.run` - Start ESG analysis
- `analysis.getStatus` - Check run status
- `analysis.getResults` - Get analysis results

#### Actions
- `actions.list` - Get recommended actions
- `actions.approve` - Approve an action
- `actions.reject` - Reject an action

#### Chat
- `chat.sendMessage` - Send chat message with tool calling
- `chat.getHistory` - Get chat history

**Full API schema available via tRPC introspection at `/api/trpc`**

---

## 🧪 Testing

### Manual Testing Checklist

- [ ] Create a new company via UI
- [ ] Upload CSV file with emissions data
- [ ] Upload PDF ESG report
- [ ] Run ESG analysis and verify scores
- [ ] Review findings and action recommendations
- [ ] Approve/reject actions via UI
- [ ] Test chat assistant: create company
- [ ] Test chat assistant: upload document
- [ ] Test chat assistant: run analysis
- [ ] Test Gen-BI: SQL query
- [ ] Test Gen-BI: chart generation
- [ ] Test chat window: minimize
- [ ] Test chat window: collapse
- [ ] Test chat window: expand

### Automated Testing (Future)

```bash
# Unit tests
pnpm test:unit

# Integration tests
pnpm test:integration

# E2E tests
pnpm test:e2e
```

---

## 🚀 Deployment

### Option 1: Manus Platform (Recommended)

1. Create a checkpoint in the application
2. Click "Publish" in the management UI
3. Access at `https://your-app.manus.space`

### Option 2: Vercel/Netlify

```bash
pnpm build
# Deploy dist/ directory
```

### Option 3: VPS with PM2

```bash
pnpm build
pm2 start npm --name "esg-agent" -- start
pm2 save && pm2 startup
```

**See [SETUP_GUIDE.md](./SETUP_GUIDE.md#production-deployment) for detailed deployment instructions.**

---

## 🛠️ Development

### Available Scripts

```bash
pnpm dev              # Start dev server (hot reload)
pnpm build            # Build for production
pnpm start            # Start production server
pnpm db:push          # Push schema changes
pnpm db:studio        # Open database GUI
pnpm lint             # Run ESLint
pnpm type-check       # TypeScript validation
```

### Adding New Features

1. **Database Changes**: Edit `drizzle/schema.ts`, run `pnpm db:push`
2. **Backend Logic**: Add helpers in `server/db.ts`
3. **API Endpoints**: Create procedures in `server/routers.ts`
4. **Frontend UI**: Build components in `client/src/components/`
5. **Chat Tools**: Add new tools in `server/chatTools.ts`

---

## 📚 Resources

- **OpenAI API**: https://platform.openai.com/docs
- **tRPC Documentation**: https://trpc.io/docs
- **Drizzle ORM**: https://orm.drizzle.team/docs
- **Tailwind CSS**: https://tailwindcss.com/docs
- **shadcn/ui**: https://ui.shadcn.com/
- **Recharts**: https://recharts.org/

---

## 🤝 Contributing

This is a proprietary project. For feature requests or bug reports, please contact the development team.

---

## 📄 License

All rights reserved. This software is proprietary and confidential.

---

## 🙏 Acknowledgments

- **OpenAI** for GPT-4 API powering ESG analysis
- **AICK Studio** for design inspiration
- **Manus Platform** for deployment infrastructure
- **Open Source Community** for amazing tools and libraries

---

## 📞 Support

For questions, issues, or feature requests:
- **Documentation**: See SETUP_GUIDE.md
- **Sample Data**: Check sample-data/README.md
- **Technical Support**: Contact development team

---

**Built with ❤️ for sustainable business practices**

🌱 **ESG Intelligence Agent** - Making sustainability measurable, actionable, and transparent.
