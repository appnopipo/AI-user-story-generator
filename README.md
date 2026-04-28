# AI User Story Generator

A proof-of-concept tool that uses AI to transform unstructured business requirements into structured, Jira-ready user stories. Built as an experiment to explore how AI-assisted tooling can help product and delivery teams accelerate backlog creation while maintaining quality and traceability.

## The Problem

Product managers and business analysts regularly work with unstructured inputs — emails, meeting notes, requirement documents. Translating these into well-formed user stories is time-consuming, inconsistent across teams, and dependent on individual experience. This leads to variable story quality, unclear acceptance criteria, and inefficiencies during sprint planning.

## What This Tool Does

Paste raw requirements text and the tool will:

1. **Generate user stories** in standard format ("As a... I want... So that...")
2. **Produce acceptance criteria** using Given/When/Then structure
3. **Suggest metadata** — priority, story points, and labels
4. **Track traceability** — each story links back to the exact source text it was derived from
5. **Flag gaps** — missing or ambiguous information is surfaced instead of guessed
6. **Score confidence** — each story gets a confidence rating so reviewers know what needs attention
7. **Support review** — approve, reject, or request changes on each story
8. **Integrate with Jira** — preview the ticket payload (dry-run) before pushing

## How It Works

```
                                  +------------------+
  User pastes requirements  --->  |   Next.js App    |
                                  +--------+---------+
                                           |
                                    POST /api/generate
                                           |
                                  +--------v---------+
                                  |       n8n        |
                                  |  (orchestrator)  |
                                  +--------+---------+
                                           |
                                   Calls Requesty LLM
                                   with structured prompt
                                           |
                                  +--------v---------+
                                  |    LLM returns   |
                                  |  JSON stories    |
                                  +--------+---------+
                                           |
                                  Writes to Supabase
                                  Callbacks to Next.js
                                           |
                                  +--------v---------+
                                  |   UI updates     |
                                  |   in real-time   |
                                  +------------------+
```

**Input:** The user pastes unstructured text (e.g., meeting notes, email, requirements document) into the app.

**Processing:** The app sends the text to an n8n workflow, which chunks it, sends it to the LLM via Requesty with a carefully designed prompt, and writes the structured results back to Supabase.

**Output:** The UI shows a side-by-side view — original requirements on the left, generated stories on the right — with confidence scores, flagged gaps, and traceability links between source text and stories.

**Review:** A reviewer can approve, reject, or request changes on each story before pushing it to Jira.

## Architecture — The Three Layers

This application is built on three main layers that work together but are fully decoupled:

### 1. Next.js (Frontend + API)

The user-facing layer. Handles authentication, UI rendering, and API routes.

- **What it does:** Renders pages (dashboard, project detail, side-by-side view), handles user actions (create project, submit requirements, approve stories, push to Jira), and exposes API routes that bridge the frontend to the other layers.
- **Key API routes:**
  - `POST /api/generate` — Receives a requirement input, creates a generation run in Supabase, and fires a webhook to n8n to start processing.
  - `POST /api/stories/[id]/review` — Writes review decisions (approve/reject) directly to Supabase.
  - `POST /api/stories/[id]/jira` — Builds the Jira payload, supports dry-run preview, and pushes to the Jira REST API.
  - `POST /api/webhooks/n8n` — Callback endpoint where n8n delivers generated stories after LLM processing.
  - `POST /api/upload` — Receives file uploads (PDF, DOCX, TXT), extracts text, and returns it to the form.
- **Does NOT** call the LLM directly. All AI processing goes through n8n.

### 2. n8n (Workflow Orchestration)

The processing layer. Runs as a Docker container and handles the AI generation pipeline.

- **What it does:** Receives a webhook from Next.js with the raw requirement text, calls the LLM (Requesty) with a structured prompt, parses the JSON response, writes the generated stories to Supabase, and updates processing status.
- **Workflow: `generate-stories`**
  1. Webhook trigger — receives `input_id`, `project_id`, `raw_text`, `run_id`, plus Supabase and Requesty credentials.
  2. Updates `requirement_inputs.status` to `processing` via Supabase REST API.
  3. Sends the text to the Requesty LLM with a prompt that enforces JSON output, traceability, confidence scoring, and gap flagging.
  4. Parses the LLM response (handles markdown-wrapped JSON).
  5. Inserts generated stories into `generated_stories` table.
  6. Updates status to `completed` or `error`.
- **Why n8n instead of calling the LLM directly from Next.js?** Decoupling. The LLM call can take 30+ seconds. n8n processes it asynchronously, writes results to Supabase, and the UI picks them up. This also makes it easy to swap LLM providers, add retry logic, or chain additional processing steps without touching the frontend code.

### 3. Supabase (Database + Auth + Storage)

The persistence and security layer. Hosts the Postgres database, handles authentication, and stores uploaded files.

- **What it does:**
  - **Auth:** Email/password authentication with session cookies. The Next.js proxy refreshes sessions on every request and redirects unauthenticated users.
  - **Database:** Five tables (`profiles`, `projects`, `requirement_inputs`, `generated_stories`, `generation_runs`) with Row Level Security — each user can only access their own data.
  - **Storage:** Stores uploaded requirement files (PDF, DOCX) in a private `requirement-files` bucket.
  - **Realtime:** `requirement_inputs` and `generated_stories` tables are added to the Supabase Realtime publication, enabling live UI updates.
- **Acts as the shared state** between all three layers. Next.js reads/writes via the Supabase client. n8n reads/writes via the Supabase REST API. Both interact with the same tables.

### How They Communicate

```
┌─────────────┐     webhook POST     ┌─────────────┐     HTTP POST      ┌─────────────┐
│             │ ──────────────────>   │             │ ───────────────>   │  Requesty   │
│   Next.js   │                      │     n8n     │                    │    (LLM)    │
│             │   callback POST      │             │   JSON response    │             │
│  (port 3000)│ <──────────────────   │ (port 5678) │ <───────────────   │             │
└──────┬──────┘                      └──────┬──────┘                    └─────────────┘
       │                                    │
       │  Supabase client                   │  Supabase REST API
       │  (read/write)                      │  (read/write)
       │                                    │
       └──────────────┐  ┌─────────────────┘
                      │  │
               ┌──────v──v──────┐
               │                │
               │    Supabase    │
               │  (Postgres +   │
               │  Auth + Storage)│
               │                │
               └────────────────┘
```

- **Next.js → n8n:** HTTP webhook to trigger story generation.
- **n8n → Supabase:** REST API calls to update status and insert stories.
- **n8n → Requesty:** HTTP POST to the LLM for AI processing.
- **Next.js → Supabase:** Client SDK for auth, CRUD operations, and real-time subscriptions.
- **Next.js → Jira:** Direct REST API calls for ticket creation (does not go through n8n).

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend + API | Next.js 16 (App Router), shadcn/ui, Tailwind CSS |
| Database + Auth | Supabase (Postgres, Auth, Row Level Security, Storage) |
| Workflow Orchestration | n8n (Docker) |
| LLM | Requesty (anthropic/claude-sonnet-4-20250514) |
| Integration | Jira REST API v3 |
| Package Manager | pnpm |

## Project Structure

```
src/
├── app/
│   ├── page.tsx                          # Dashboard — list of projects
│   ├── login/page.tsx                    # Authentication
│   ├── settings/page.tsx                 # Jira credentials configuration
│   ├── projects/
│   │   ├── new/page.tsx                  # Create a project
│   │   └── [projectId]/
│   │       ├── page.tsx                  # Project detail — list of requirement inputs
│   │       └── inputs/
│   │           ├── new/page.tsx          # Paste text or upload file, trigger generation
│   │           └── [inputId]/page.tsx    # Side-by-side: input vs generated stories
│   └── api/
│       ├── generate/route.ts             # Triggers n8n story generation workflow
│       ├── upload/route.ts               # File upload + text extraction (PDF, DOCX, TXT)
│       ├── stories/[storyId]/
│       │   ├── review/route.ts           # Review actions (approve/reject/request changes)
│       │   └── jira/route.ts             # Jira push with dry-run preview
│       └── webhooks/n8n/route.ts         # Receives results from n8n
├── components/
│   ├── ui/                               # shadcn/ui components
│   └── stories/
│       ├── StoryCard.tsx                 # Story display with confidence, gaps, metadata
│       ├── ReviewActions.tsx             # Approve/reject/request changes buttons
│       └── JiraPushButton.tsx            # Dry-run preview + push to Jira
├── lib/
│   ├── supabase/                         # Client, server, and proxy helpers
│   ├── n8n.ts                            # Webhook trigger functions
│   └── types.ts                          # Shared TypeScript interfaces
└── proxy.ts                              # Auth guard (Next.js 16 proxy convention)

supabase/migrations/001_initial_schema.sql
n8n/generate-stories.json                 # Importable n8n workflow
docker-compose.yml
docs/
├── SUPABASE_SETUP.md
└── JIRA_SETUP.md
```

## Database

Five tables with Row Level Security:

- **profiles** — User info + Jira credentials
- **projects** — Named containers with optional Jira project key
- **requirement_inputs** — Raw text with processing status (pending/processing/completed/error)
- **generated_stories** — The core output: user story fields, acceptance criteria, metadata, confidence score, flagged gaps, review status, Jira sync state
- **generation_runs** — Tracks each LLM call (tokens used, model, errors)

## Guardrails

The LLM prompt enforces strict rules:

- **No hallucination** — Only generate stories from information explicitly present in the input
- **Flag gaps** — Missing or ambiguous information is listed, not guessed
- **Source traceability** — Each story includes the exact excerpt it was derived from
- **Confidence scoring** — Stories are scored 0-1 based on how clearly the requirement was stated
- **Structured output** — JSON format with validation before storage

## Quick Start

```bash
# Install dependencies
pnpm install

# Copy and fill in environment variables
cp .env.local.example .env.local

# Run the database migration in Supabase SQL Editor
# (paste contents of supabase/migrations/001_initial_schema.sql)

# Start n8n
docker compose up -d

# Start the app
pnpm dev
```

See [SETUP.md](SETUP.md) for detailed configuration instructions.

## Scope

This is a proof of concept, not a production system. It is:

- A learning exercise for AI-assisted backlog generation
- An exploration of guardrails, traceability, and usability
- A test of integrating Next.js, Supabase, n8n, LLM tooling, and Jira

It is not:

- A production-ready Jira replacement
- A fully automated backlog management system
- A substitute for product owner decision-making
