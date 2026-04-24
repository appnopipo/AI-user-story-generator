# AI User Story Generator

An internal tool that converts unstructured requirements into structured, Jira-ready user stories using AI.

## Tech Stack

- **Frontend:** Next.js 16 (App Router) + shadcn/ui + Tailwind CSS
- **Backend/DB:** Supabase (Postgres, Auth, Storage)
- **Workflow Orchestration:** n8n (Docker Compose)
- **LLM:** Requesty
- **Integration:** Jira REST API v3
- **Package Manager:** pnpm

## Project Structure

```
src/
├── app/
│   ├── layout.tsx                        # Root layout
│   ├── page.tsx                          # Dashboard (project list)
│   ├── login/page.tsx                    # Auth (sign in / sign up)
│   ├── auth/callback/route.ts            # OAuth callback
│   ├── projects/
│   │   ├── new/page.tsx                  # Create project
│   │   └── [projectId]/
│   │       ├── page.tsx                  # Project detail (inputs list)
│   │       └── inputs/
│   │           ├── new/page.tsx          # Paste requirements + trigger generation
│   │           └── [inputId]/page.tsx    # Side-by-side: input vs generated stories
│   └── api/
│       ├── generate/route.ts             # Triggers story generation via n8n
│       ├── stories/[storyId]/
│       │   ├── review/route.ts           # Approve / reject / request changes
│       │   └── jira/route.ts             # Push to Jira (with dry-run support)
│       └── webhooks/n8n/route.ts         # Callback endpoint for n8n results
├── components/
│   ├── ui/                               # shadcn/ui primitives
│   └── stories/StoryCard.tsx             # Story display with confidence, gaps, metadata
├── lib/
│   ├── supabase/
│   │   ├── client.ts                     # Browser client
│   │   ├── server.ts                     # Server-side client
│   │   └── middleware.ts                 # Session refresh + auth guard
│   ├── n8n.ts                            # Webhook trigger helpers
│   └── types.ts                          # Shared TypeScript types
└── middleware.ts                          # Redirects unauthenticated users to /login

supabase/migrations/001_initial_schema.sql  # Full database schema
docker-compose.yml                          # n8n local instance
.env.local.example                          # Required environment variables
```

## Database Schema

Five tables in Supabase (Postgres):

| Table | Purpose |
|---|---|
| `profiles` | Extends `auth.users` with display name and Jira credentials |
| `projects` | User projects with optional Jira project key |
| `requirement_inputs` | Raw requirement text with processing status |
| `generated_stories` | AI-generated user stories with acceptance criteria, metadata, confidence, review status, and Jira sync state |
| `generation_runs` | Tracks each LLM invocation (tokens, model, errors) |

Row Level Security (RLS) is enabled on all tables. Each user can only access their own data.

## Flow

```
User pastes text → POST /api/generate → n8n "generate-stories" webhook
                                             ↓
                                    Chunk text → Call Requesty (LLM)
                                             ↓
                                    Parse JSON → Write stories to Supabase
                                             ↓
                                    Callback → POST /api/webhooks/n8n
                                             ↓
                                    UI updates via Supabase Realtime
```

## Getting Started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

Copy the example env file and fill in your credentials:

```bash
cp .env.local.example .env.local
```

Required variables:

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |
| `N8N_BASE_URL` | n8n instance URL (default: `http://localhost:5678`) |
| `N8N_GENERATE_WEBHOOK_PATH` | Webhook path for story generation |
| `N8N_JIRA_WEBHOOK_PATH` | Webhook path for Jira sync |
| `N8N_WEBHOOK_SECRET` | Shared secret for n8n callback authentication |

### 3. Run the database migration

Go to your Supabase project dashboard → SQL Editor, and run the contents of:

```
supabase/migrations/001_initial_schema.sql
```

### 4. Start n8n

```bash
docker compose up -d
```

n8n will be available at `http://localhost:5678` (admin/admin).

### 5. Start the dev server

```bash
pnpm dev
```

The app will be available at `http://localhost:3000`.

## API Endpoints

| Method | Route | Description |
|---|---|---|
| `POST` | `/api/generate` | Triggers story generation for a requirement input |
| `POST` | `/api/stories/[storyId]/review` | Submit a review (approve/reject/changes_requested) |
| `POST` | `/api/stories/[storyId]/jira` | Push story to Jira (supports `dry_run: true`) |
| `POST` | `/api/webhooks/n8n` | Receives results from n8n (secured by shared secret) |

## n8n Workflows

Two workflows need to be created in n8n:

### generate-stories
1. Webhook trigger receives `input_id`, `project_id`, `raw_text`, `run_id`
2. Chunks text by paragraphs
3. Calls Requesty with a structured prompt requesting JSON output
4. Validates and writes stories to Supabase
5. Calls back to `/api/webhooks/n8n`

### jira-sync
1. Webhook trigger receives `story_id`, `dry_run`, Jira credentials
2. Fetches story from Supabase
3. Maps fields to Jira format (summary, description, priority, labels, story points)
4. If dry run: stores payload for preview. If not: POSTs to Jira REST API
5. Calls back to `/api/webhooks/n8n`

## Key Features

- **Structured output:** Stories follow "As a... I want... So that..." format
- **Acceptance criteria:** Given/When/Then format
- **Confidence indicators:** Color-coded scores (green > 80%, yellow > 60%, red below)
- **Flagged gaps:** Missing information surfaced to the reviewer
- **Traceability:** Each story links back to its source excerpt in the original input
- **Review workflow:** Approve, reject, or request changes on each story
- **Jira integration:** Dry-run preview before pushing, sync status tracking
