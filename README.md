# Ticket Generator

An AI-powered tool that transforms unstructured business requirements into Jira-ready tickets. Built for product managers who need to quickly convert meeting notes, emails, or requirement documents into structured user stories and push them directly to Jira.

## What It Does

Paste raw requirements text (or upload a file) and the tool will:

1. **Generate user stories** in standard format ("As a... I want... So that...")
2. **Produce acceptance criteria** using Given/When/Then structure
3. **Suggest metadata** — priority, story points, labels, and issue type
4. **Track traceability** — each story links back to the source text it was derived from
5. **Flag gaps** — missing or ambiguous information is surfaced, not guessed
6. **Score confidence** — each story gets a confidence rating so you know what needs attention
7. **Push to Jira** — edit stories inline, select issue types, and batch-push to Jira

## How It Works

```
User pastes requirements
        |
        v
  POST /api/generate
        |
  Calls Claude (via Requesty)
  with structured prompt
        |
        v
  Stories appear in real-time
  (via Supabase Realtime)
        |
        v
  PM reviews, edits, selects
  issue type per story
        |
        v
  Batch push to Jira
  with clickable ticket links
```

**Onboarding:** First-time users are guided through Jira setup via an LLM-powered conversational flow that validates inputs and understands natural language (e.g., "use the same email as my account").

**Generation:** The chat-style interface accepts pasted text or uploaded files (PDF, DOCX, TXT). Stories appear in real-time as they're generated.

**Review & Edit:** Each story card supports inline editing of all fields — title, persona, action, benefit, acceptance criteria, priority, story points, labels, issue type, and free-text notes (for Figma links, context, etc.).

**Push:** Select the stories you want, click "Send to Jira", and get clickable links to the created tickets.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend + API | Next.js 16 (App Router), shadcn/ui, Tailwind CSS, Inter font |
| Database + Auth | Supabase (Postgres, Auth, RLS, Storage, Realtime) |
| LLM | Claude Sonnet via Requesty API |
| Integration | Jira REST API v3 |
| Auth Providers | Email/password + Google OAuth |
| Package Manager | pnpm |

## Project Structure

```
src/
├── app/
│   ├── layout.tsx                        # Root layout (dark theme, Inter font)
│   ├── page.tsx                          # Main app (chat interface + onboarding)
│   ├── login/page.tsx                    # Sign in (email/password + Google OAuth)
│   ├── auth/callback/route.ts            # OAuth callback
│   └── api/
│       ├── generate/route.ts             # Calls LLM, writes stories to Supabase
│       ├── upload/route.ts               # File upload + text extraction
│       ├── chat/setup/route.ts           # LLM-powered Jira onboarding chat
│       ├── jira/projects/route.ts        # Fetches Jira projects + issue types
│       └── stories/[storyId]/
│           └── jira/route.ts             # Push story to Jira with edits
├── components/
│   ├── ui/                               # shadcn/ui components
│   └── stories/
│       └── EditableStoryCard.tsx          # Inline-editable story card
├── lib/
│   ├── supabase/                         # Client, server, and middleware helpers
│   ├── jira.ts                           # Jira payload builder
│   ├── parse.ts                          # LLM response parsing utilities
│   ├── types.ts                          # TypeScript interfaces
│   └── utils.ts                          # Tailwind class merge helper
└── proxy.ts                              # Auth middleware (Next.js 16 convention)

supabase/migrations/
├── 001_initial_schema.sql                # Tables, RLS policies, triggers
└── 002_cleanup_unused_fields.sql         # Remove deprecated review/dry-run fields
```

## Database

Five tables with Row Level Security:

| Table | Purpose |
|---|---|
| `profiles` | User info + Jira credentials (base URL, email, API token) |
| `projects` | Auto-created from Jira project selection (maps jira_project_key to internal ID) |
| `requirement_inputs` | Raw text with processing status (pending/processing/completed/error) |
| `generated_stories` | User stories with acceptance criteria, metadata, confidence, Jira sync state |
| `generation_runs` | Tracks each LLM call (tokens, model, timing, errors) |

## API Endpoints

| Method | Route | Description |
|---|---|---|
| `POST` | `/api/generate` | Generate stories from a requirement input |
| `POST` | `/api/upload` | Upload file and extract text (PDF, DOCX, TXT) |
| `POST` | `/api/chat/setup` | LLM-powered conversational Jira setup |
| `GET` | `/api/jira/projects` | Fetch Jira projects and issue types |
| `POST` | `/api/stories/[id]/jira` | Push story to Jira with inline edits and issue type |

## Quick Start

```bash
# Install dependencies
pnpm install

# Copy and fill in environment variables
cp .env.local.example .env.local

# Run database migrations in Supabase SQL Editor
# (paste contents of both files in supabase/migrations/)

# Start the app
pnpm dev
```

See [SETUP.md](SETUP.md) for detailed configuration instructions.

## Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |
| `REQUESTY_API_KEY` | API key for Requesty (Claude) |
| `JIRA_STORY_POINTS_FIELD_ID` | Custom field ID for story points (default: `customfield_10016`) |

## Scope

This is a proof of concept, not a production system. It is:

- A learning exercise for AI-assisted backlog generation
- An exploration of guardrails, traceability, and usability
- A test of integrating Next.js, Supabase, LLM tooling, and Jira

Built by [Pipo Bizelli](https://github.com/appnopipo) using [Claude Code](https://claude.ai).
