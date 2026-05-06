# Ticket Generator — Setup Guide

## Tech Stack

- **Frontend:** Next.js 16 (App Router) + shadcn/ui + Tailwind CSS + Inter font
- **Backend/DB:** Supabase (Postgres, Auth, Storage, Realtime)
- **LLM:** Claude Sonnet via Requesty API
- **Integration:** Jira REST API v3
- **Auth:** Email/password + Google OAuth
- **Package Manager:** pnpm

## Getting Started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

```bash
cp .env.local.example .env.local
```

Required variables:

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |
| `REQUESTY_API_KEY` | API key for Requesty LLM |
| `JIRA_STORY_POINTS_FIELD_ID` | Custom Jira field ID (default: `customfield_10016`) |

### 3. Run the database migrations

Go to your Supabase project dashboard > SQL Editor, and run:

1. `supabase/migrations/001_initial_schema.sql` — Creates tables, RLS policies, triggers
2. `supabase/migrations/002_cleanup_unused_fields.sql` — Removes deprecated columns

### 4. Configure Google OAuth (optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com) > APIs & Services > Credentials
2. Create OAuth Client ID (Web application)
3. Add redirect URI: `https://<your-supabase-project>.supabase.co/auth/v1/callback`
4. In Supabase Dashboard > Authentication > Providers, enable Google and paste Client ID + Secret

### 5. Start the dev server

```bash
pnpm dev
```

The app will be available at `http://localhost:3000`.

## User Flow

1. **Login** — Email/password or Google OAuth
2. **Jira Setup** — LLM-powered conversational onboarding asks for Jira URL, email, and API token
3. **Generate** — Paste requirements or upload a file, select Jira project, click Generate
4. **Review & Edit** — Inline edit stories, change issue types, add notes
5. **Push** — Batch push selected stories to Jira, get clickable ticket links

## API Endpoints

| Method | Route | Description |
|---|---|---|
| `POST` | `/api/generate` | Generate stories from requirement text |
| `POST` | `/api/upload` | Upload file and extract text |
| `POST` | `/api/chat/setup` | LLM-powered Jira setup conversation |
| `GET` | `/api/jira/projects` | Fetch Jira projects and issue types |
| `POST` | `/api/stories/[id]/jira` | Push story to Jira with edits and issue type |

## Key Features

- **Chat-style interface** — Single-page app inspired by AI assistants
- **LLM-powered onboarding** — Understands natural language for Jira setup
- **Inline editing** — Edit all story fields before pushing to Jira
- **Issue type selection** — Story, Bug, Task, Sub-task, etc. per ticket
- **Notes field** — Add Figma links, context, or any extra info
- **Batch Jira push** — Select stories and push them all at once
- **Real-time updates** — Stories appear as they're generated via Supabase Realtime
- **Confidence scoring** — Color-coded scores indicate how clearly requirements were stated
- **Gap flagging** — Missing information is surfaced, not guessed
- **Dark theme** — Default dark mode with Inter font
