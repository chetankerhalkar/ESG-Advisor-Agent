# ESG Agent TODO

## Database Schema
- [x] Create companies table
- [x] Create documents table
- [x] Create esg_metrics table
- [x] Create findings table
- [x] Create actions table
- [x] Create runs table
- [x] Create eval_labels table
- [x] Push database schema

## Backend API & Agent Logic
- [x] Implement company management procedures (list, create, get by ID)
- [x] Implement document upload procedure with file storage
- [x] Implement ESG analysis agent with LangGraph-style logic
- [x] Create metric scorer for E/S/G scoring
- [x] Create greenwashing detector
- [x] Create action plan generator with reasoning
- [x] Implement run management (start, get status, stream updates)
- [x] Implement action approval/rejection procedures
- [x] Create evaluation tracking system

## Frontend UI Components
- [x] Design and implement landing page with AICK Studio theme
- [x] Create company selector and overview dashboard
- [x] Build ESG scorecard with radar chart visualization
- [x] Create findings list component
- [x] Build action cards with approve/reject functionality
- [x] Implement document upload center with drag-drop
- [x] Create reasoning trace viewer
- [x] Build run status viewer with streaming updates
- [x] Create evaluation dashboard

## Styling & Theme
- [x] Apply AICK Studio gradient theme (coral to purple)
- [x] Configure Tailwind with custom colors
- [x] Style navigation with colored badges
- [x] Implement card-based layouts
- [x] Add responsive design

## Testing & Integration
- [x] Test complete ESG analysis workflow
- [x] Test document upload and processing
- [x] Test action approval workflow
- [x] Verify streaming updates work correctly
- [x] Test all visualizations render properly

## Final Delivery
- [x] Create checkpoint
- [x] Verify all features working
- [x] Prepare demo data

## Chat Assistant & Gen-BI Features
- [x] Create sample CSV data for 3 companies (emissions, diversity, incidents)
- [x] Create sample PDF content for 3 companies (ESG reports)
- [x] Implement chat backend with tool calling
- [x] Create chat tool: create_company
- [x] Create chat tool: list_companies
- [x] Create chat tool: select_company
- [x] Create chat tool: upload_document
- [x] Create chat tool: parse_and_ingest
- [x] Create chat tool: run_esg_analysis
- [x] Create chat tool: get_run_summary
- [x] Create chat tool: describe_schema (Gen-BI)
- [x] Create chat tool: sql_query_readonly (Gen-BI)
- [x] Create chat tool: render_chart
- [x] Create chat tool: open_citation
- [x] Implement SQL safety validation (read-only)
- [x] Build chat UI panel component
- [x] Add chat message streaming with SSE
- [x] Implement file drop in chat
- [x] Add chart rendering in chat (line, bar, pie, radar)
- [x] Create quick action chips (New Company, Upload Docs, Ask BI, Run ESG)
- [x] Add pinned results functionality
- [x] Integrate chat with existing ESG workflows
- [x] Test complete chat workflow
- [x] Create final checkpoint with all features

## Chat Window Enhancements
- [x] Add expand/collapse toggle button to chat panel
- [x] Add minimize functionality to chat window
- [x] Implement smooth transitions for chat panel states
- [x] Save chat panel state to localStorage

## Deployment Package
- [x] Create comprehensive setup documentation
- [x] Create deployment guide with local setup steps
- [x] Package entire codebase as downloadable zip
- [x] Test local installation instructions

## SQLite Migration
- [x] Update drizzle.config.ts for SQLite
- [x] Convert schema.ts to SQLite syntax
- [x] Update db.ts for SQLite connection
- [x] Install libsql/client dependency (replaced better-sqlite3)
- [x] Remove MySQL-specific code
- [x] Update environment configuration for SQLite
- [x] Test database operations with SQLite
- [x] Create new .db3 database file (60KB)
- [x] Update documentation for SQLite setup
- [x] Create new ZIP package with SQLite

## Remove OAuth & Implement Simple Login
- [x] Remove OAuth dependencies from package.json
- [x] Remove OAuth routes and middleware from server
- [x] Create simple login endpoint with hardcoded credentials
- [x] Update authentication context to use simple session
- [x] Create login page component
- [x] Update useAuth hook to work with simple auth
- [x] Remove OAuth-related environment variables
- [x] Update documentation for simple login
- [x] Test login/logout functionality
- [x] Create final checkpoint with simple auth

## Fix Authentication Issues
- [x] Fix tRPC context to properly handle JWT authentication
- [x] Fix cookie parsing in protected procedures
- [x] Update context.ts to work with simple auth
- [x] Remove OAuth dependencies from context
- [x] Test all API endpoints with authentication
- [x] Verify Run Analysis button works correctly
- [x] Test company creation and document upload
- [x] Create final working ZIP package

## Fix 404 Errors and LLM Issues
- [x] Replace package.json with working version
- [x] Replace seed.mjs with working version
- [x] Create proper PDF files for all companies
- [x] Create proper CSV files for all companies
- [x] Fix LLM integration (OpenAI API key handling)
- [x] Fix upload document 404 error
- [x] Fix chat create company 404 error
- [x] Fix Run Analysis failures
- [x] Test all companies with real PDF/CSV uploads
- [x] Create final working package
