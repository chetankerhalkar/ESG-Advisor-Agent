# ESG Intelligence Agent - Local Setup Instructions

## Quick Start (3 Steps)

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment

Create a `.env` file in the project root with the following content:

```env
# Required: SQLite Database
DATABASE_URL=file:./esg-agent.db3

# Required: JWT Secret for authentication
JWT_SECRET=your-secret-key-change-in-production

# Required: OpenAI API Key
OPENAI_API_KEY=sk-your-openai-api-key-here

# Optional: App Configuration
VITE_APP_TITLE=ESG Intelligence Agent
NODE_ENV=development
PORT=3000
```

**Get your OpenAI API key:** https://platform.openai.com/api-keys

### 3. Initialize Database & Start

```bash
# Create database tables
pnpm db:push

# (Optional) Add sample data
npx tsx scripts/seed.mjs

# Start the application
pnpm dev
```

Open **http://localhost:3000** and login with:
- **Email:** `admin@esg-agent.com`
- **Password:** `admin123`

---

## Troubleshooting

### "OPENAI_API_KEY is not defined"

Make sure your `.env` file has:
```env
OPENAI_API_KEY=sk-your-actual-key-here
```

Restart the dev server after adding it.

### "Port 3000 is already in use"

```bash
# Use a different port
PORT=3001 pnpm dev
```

### "Database locked" error

```bash
# Stop the server and delete the database
rm esg-agent.db3

# Recreate it
pnpm db:push
npx tsx scripts/seed.mjs
```

---

## Features to Test

1. **Login** - Use demo credentials
2. **Create Company** - Add a new company via dashboard
3. **Upload Documents** - Drag and drop CSV/PDF files
4. **Run ESG Analysis** - Click "Run Analysis" button
5. **Chat Assistant** - Ask questions in the chat panel
6. **Gen-BI Analytics** - Query data with natural language

---

## Sample Data

Use the files in `sample-data/` directory:
- `techcorp_emissions_2024.csv`
- `greenenergy_diversity_2024.csv`
- `sustainable_mfg_safety_2024.csv`

---

For detailed documentation, see **SETUP_GUIDE.md**
