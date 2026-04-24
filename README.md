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

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), shadcn/ui, Tailwind CSS |
| Backend / Database | Supabase (Postgres, Auth, Row Level Security) |
| Workflow Orchestration | n8n |
| LLM | Requesty |
| Integration | Jira REST API v3 |
| Package Manager | pnpm |

## Project Structure

```
src/
├── app/
│   ├── page.tsx                          # Dashboard — list of projects
│   ├── login/page.tsx                    # Authentication
│   ├── projects/
│   │   ├── new/page.tsx                  # Create a project
│   │   └── [projectId]/
│   │       ├── page.tsx                  # Project detail — list of requirement inputs
│   │       └── inputs/
│   │           ├── new/page.tsx          # Paste requirements, trigger generation
│   │           └── [inputId]/page.tsx    # Side-by-side: input vs generated stories
│   └── api/
│       ├── generate/route.ts             # Triggers n8n story generation workflow
│       ├── stories/[storyId]/
│       │   ├── review/route.ts           # Review actions
│       │   └── jira/route.ts             # Jira push with dry-run support
│       └── webhooks/n8n/route.ts         # Receives results from n8n
├── components/
│   ├── ui/                               # shadcn/ui components
│   └── stories/StoryCard.tsx             # Story card with confidence, gaps, metadata
├── lib/
│   ├── supabase/                         # Client, server, and middleware helpers
│   ├── n8n.ts                            # Webhook trigger functions
│   └── types.ts                          # Shared TypeScript interfaces
└── middleware.ts                          # Auth guard

supabase/migrations/001_initial_schema.sql
docker-compose.yml
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
