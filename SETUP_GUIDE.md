# ESG Intelligence Agent - Setup Guide

Complete guide for setting up and running the ESG Intelligence Agent locally with SQLite database.

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js 18+** - [Download](https://nodejs.org/)
- **pnpm** - Install with `npm install -g pnpm`
- **OpenAI API Key** - [Get one here](https://platform.openai.com/api-keys)

**No database server required!** The application uses SQLite with a local `.db3` file.

---

## 🚀 Quick Start (5 Minutes)

### 1. Extract the Project

```bash
unzip esg-agent-sqlite.zip
cd esg-agent
```

### 2. Install Dependencies

```bash
pnpm install
```

This will install all required packages (~200MB).

### 3. Configure Environment

Create a `.env` file in the project root:

```bash
# Copy the example file
cp .env.example .env
```

Edit `.env` and add your OpenAI API key:

```env
# OpenAI API Key (REQUIRED)
OPENAI_API_KEY=sk-your-api-key-here

# Database (SQLite - already configured)
DATABASE_URL=file:./esg-agent.db3

# JWT Secret (for sessions - change in production)
JWT_SECRET=your-secret-key-change-in-production

# App Configuration
VITE_APP_TITLE=ESG Intelligence Agent
NODE_ENV=development
```

### 4. Initialize Database

```bash
pnpm db:push
```

This creates the SQLite database with all required tables.

### 5. (Optional) Seed Demo Data

```bash
npx tsx scripts/seed.mjs
```

This adds 3 sample companies with ESG data.

### 6. Start the Application

```bash
pnpm dev
```

The application will start at **http://localhost:3000**

---

## 🔐 Login Credentials

The application uses **simple hardcoded authentication** (no OAuth required).

### Demo Accounts

| Role  | Email                    | Password  |
|-------|--------------------------|-----------|
| Admin | admin@esg-agent.com      | admin123  |
| User  | user@esg-agent.com       | user123   |

**To add more users**, edit `server/simpleAuth.ts` and add entries to the `USERS` array.

---

## 📁 Project Structure

```
esg-agent/
├── client/                      # Frontend React application
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChatPanel.tsx   # Chat assistant
│   │   │   └── ui/             # shadcn/ui components
│   │   ├── pages/
│   │   │   ├── Home.tsx        # Landing page
│   │   │   ├── Login.tsx       # Login page
│   │   │   ├── Dashboard.tsx   # Company management
│   │   │   └── CompanyDetail.tsx # ESG analysis
│   │   └── App.tsx             # Routes
├── server/                      # Backend Express + tRPC
│   ├── routers.ts              # Main API router
│   ├── simpleAuth.ts           # Authentication logic
│   ├── chatRouter.ts           # Chat assistant
│   ├── chatTools.ts            # 12 chat tools
│   ├── esgAgent.ts             # ESG analysis engine
│   └── db.ts                   # Database helpers
├── drizzle/
│   └── schema.ts               # Database schema (SQLite)
├── sample-data/                # Sample CSV and PDF files
├── esg-agent.db3               # SQLite database file
├── .env                        # Environment variables (create this)
└── README.md                   # Documentation
```

---

## 🛠️ Available Scripts

```bash
# Development
pnpm dev              # Start dev server with hot reload
pnpm build            # Build for production
pnpm start            # Start production server

# Database
pnpm db:push          # Push schema changes to database
pnpm db:studio        # Open Drizzle Studio (database GUI)

# Code Quality
pnpm lint             # Run ESLint
pnpm type-check       # TypeScript validation
```

---

## 📊 Using the Application

### 1. Login

1. Navigate to http://localhost:3000
2. Click "Get Started" or "Go to Dashboard"
3. Use demo credentials:
   - Email: `admin@esg-agent.com`
   - Password: `admin123`

### 2. Create a Company

**Option A: Via Dashboard**
1. Click "Add Company" button
2. Fill in company details (name, ticker, sector, country)
3. Click "Create Company"

**Option B: Via Chat Assistant**
1. Open the chat panel (right side)
2. Type: "Create a new company: Tesla Inc, ticker TSLA, sector Automotive, US"
3. The AI will create the company for you

### 3. Upload Documents

**Option A: Via Company Detail Page**
1. Select a company from the dashboard
2. Go to "Documents" tab
3. Drag and drop CSV or PDF files
4. Click "Upload"

**Option B: Via Chat Assistant**
1. Type: "Upload the TechCorp emissions CSV for company ID 1"
2. The AI will guide you through the process

**Sample Data Available:**
- `sample-data/techcorp_emissions_2024.csv`
- `sample-data/greenenergy_diversity_2024.csv`
- `sample-data/sustainable_mfg_safety_2024.csv`
- `sample-data/*.txt` (PDF content)

### 4. Run ESG Analysis

**Option A: Via Company Detail Page**
1. Select a company
2. Click "Run ESG Analysis" button
3. Wait for the AI to process documents
4. View scores, findings, and action recommendations

**Option B: Via Chat Assistant**
1. Type: "Run ESG analysis for Tesla"
2. The AI will start the analysis and show progress
3. Results appear in expandable cards

### 5. Use Chat Assistant (Gen-BI)

The chat assistant supports natural language queries:

**Example Queries:**
- "Show me all companies with environmental score above 80"
- "Create a bar chart of ESG scores by company"
- "Which company has the most findings?"
- "Generate a pie chart of findings by severity"

The AI will:
1. Translate your question to SQL
2. Execute the query safely (read-only)
3. Generate visualizations (line/bar/pie/radar charts)
4. Display results in expandable cards

---

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `OPENAI_API_KEY` | OpenAI API key for GPT-4 | ✅ Yes | - |
| `DATABASE_URL` | SQLite database path | ✅ Yes | `file:./esg-agent.db3` |
| `JWT_SECRET` | Secret key for JWT tokens | ✅ Yes | `default-jwt-secret-change-in-production` |
| `VITE_APP_TITLE` | Application title | No | `ESG Intelligence Agent` |
| `NODE_ENV` | Environment mode | No | `development` |
| `PORT` | Server port | No | `3000` |

### Customizing Login Credentials

Edit `server/simpleAuth.ts`:

```typescript
const USERS = [
  {
    id: 1,
    openId: "demo-user-1",
    email: "admin@esg-agent.com",
    password: "admin123",
    name: "Admin User",
    role: "admin" as const,
  },
  // Add more users here
  {
    id: 3,
    openId: "demo-user-3",
    email: "yourname@company.com",
    password: "yourpassword",
    name: "Your Name",
    role: "user" as const,
  },
];
```

### Changing App Title and Logo

Edit `client/src/const.ts`:

```typescript
export const APP_TITLE = "Your Company ESG Platform";
export const APP_LOGO = "https://your-logo-url.com/logo.png";
```

---

## 🐛 Troubleshooting

### Port 3000 Already in Use

```bash
# Option 1: Use a different port
PORT=3001 pnpm dev

# Option 2: Kill the process using port 3000
# On Mac/Linux:
lsof -ti:3000 | xargs kill -9

# On Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Database Locked Error

```bash
# Stop the dev server
# Delete the database file
rm esg-agent.db3

# Recreate the database
pnpm db:push

# (Optional) Reseed data
npx tsx scripts/seed.mjs
```

### OpenAI API Errors

**Error: "Invalid API key"**
- Check that your `.env` file has the correct `OPENAI_API_KEY`
- Ensure the key starts with `sk-`
- Verify the key is active at https://platform.openai.com/api-keys

**Error: "Rate limit exceeded"**
- You've hit OpenAI's rate limits
- Wait a few minutes and try again
- Consider upgrading your OpenAI plan

**Error: "Insufficient quota"**
- Your OpenAI account has no credits
- Add payment method at https://platform.openai.com/account/billing

### TypeScript Errors

```bash
# Clear cache and rebuild
rm -rf node_modules .next dist
pnpm install
pnpm build
```

### Chat Panel Not Responding

1. Check browser console for errors (F12)
2. Verify OpenAI API key is set
3. Check network tab for failed requests
4. Restart the dev server

---

## 🚀 Production Deployment

### Build for Production

```bash
# Build the application
pnpm build

# The output will be in the `dist/` directory
```

### Environment Variables for Production

Create a `.env.production` file:

```env
NODE_ENV=production
OPENAI_API_KEY=sk-your-production-key
DATABASE_URL=file:./esg-agent.db3
JWT_SECRET=your-strong-random-secret-key-here
VITE_APP_TITLE=ESG Intelligence Agent
```

**Important:** Change `JWT_SECRET` to a strong random value in production!

```bash
# Generate a secure JWT secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Deployment Options

#### Option 1: VPS with PM2

```bash
# Install PM2
npm install -g pm2

# Build the application
pnpm build

# Start with PM2
pm2 start npm --name "esg-agent" -- start

# Save PM2 configuration
pm2 save
pm2 startup
```

#### Option 2: Docker

Create a `Dockerfile`:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
EXPOSE 3000
CMD ["pnpm", "start"]
```

Build and run:

```bash
docker build -t esg-agent .
docker run -p 3000:3000 --env-file .env.production esg-agent
```

#### Option 3: Vercel/Netlify

1. Push code to GitHub
2. Connect repository to Vercel/Netlify
3. Set environment variables in dashboard
4. Deploy

**Note:** SQLite may have limitations on serverless platforms. Consider using a hosted database (PostgreSQL, MySQL) for production.

---

## 🔐 Security Best Practices

### For Production

1. **Change JWT Secret**
   ```bash
   JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
   ```

2. **Use Strong Passwords**
   - Replace hardcoded passwords in `server/simpleAuth.ts`
   - Consider using bcrypt for password hashing

3. **Enable HTTPS**
   - Use a reverse proxy (nginx, Caddy)
   - Obtain SSL certificate (Let's Encrypt)

4. **Set up Database Backups**
   ```bash
   # Backup SQLite database
   cp esg-agent.db3 backups/esg-agent-$(date +%Y%m%d).db3
   ```

5. **Rate Limiting**
   - Add rate limiting middleware to Express
   - Limit OpenAI API calls per user

6. **Environment Variables**
   - Never commit `.env` files to Git
   - Use environment variable management (Doppler, AWS Secrets Manager)

---

## 📚 Additional Resources

- **OpenAI API Documentation**: https://platform.openai.com/docs
- **tRPC Documentation**: https://trpc.io/docs
- **Drizzle ORM**: https://orm.drizzle.team/docs
- **Tailwind CSS**: https://tailwindcss.com/docs
- **shadcn/ui**: https://ui.shadcn.com/

---

## 🆘 Getting Help

If you encounter issues:

1. Check the **Troubleshooting** section above
2. Review the **README.md** for feature documentation
3. Check the browser console (F12) for errors
4. Review server logs in the terminal

---

## 📝 License

All rights reserved. This software is proprietary and confidential.

---

**Built with ❤️ for sustainable business practices**

🌱 **ESG Intelligence Agent** - Making sustainability measurable, actionable, and transparent.
