# Supabase Setup Guide

Step-by-step guide to configure Supabase for the AI User Story Generator.

## 1. Create a Supabase Account

1. Go to [supabase.com](https://supabase.com) and click **Start your project**
2. Sign up with GitHub (recommended) or email
3. You'll land on the Supabase Dashboard

## 2. Create a New Project

1. Click **New Project**
2. Fill in:
   - **Project name:** `ai-user-story-generator`
   - **Database password:** Choose a strong password (save it somewhere safe)
   - **Region:** Pick the closest to you
3. Click **Create new project**
4. Wait for the project to finish provisioning (takes about 2 minutes)

## 3. Get Your API Keys

1. In your project dashboard, go to **Settings** (gear icon in the sidebar)
2. Click **API** under the Configuration section
3. You'll see:
   - **Project URL** — this is your `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key — this is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key — this is your `SUPABASE_SERVICE_ROLE_KEY`

> The `service_role` key bypasses Row Level Security. It is only used server-side in the n8n webhook callback. Never expose it to the browser.

## 4. Run the Database Migration

1. In the sidebar, click **SQL Editor**
2. Click **New query**
3. Open the file `supabase/migrations/001_initial_schema.sql` from this project
4. Copy the entire contents and paste it into the SQL Editor
5. Click **Run** (or press Cmd+Enter)
6. You should see "Success. No rows returned" — this means all tables, policies, and triggers were created

### Verify the tables were created

1. Go to **Table Editor** in the sidebar
2. You should see these tables:
   - `profiles`
   - `projects`
   - `requirement_inputs`
   - `generated_stories`
   - `generation_runs`

## 5. Enable Realtime

The migration already adds `requirement_inputs` and `generated_stories` to the Realtime publication. To verify:

1. Go to **Database** > **Replication** in the sidebar
2. Under `supabase_realtime`, confirm that `requirement_inputs` and `generated_stories` are listed

## 6. Configure Auth (Optional Tweaks)

By default, Supabase Auth works with email + password, which is what this project uses. You may want to:

1. Go to **Authentication** > **Providers**
2. Under **Email**, make sure it is enabled
3. (Optional) Disable **Confirm email** for faster testing during development:
   - Go to **Authentication** > **Settings**
   - Toggle off **Enable email confirmations**
   - This lets you sign up and log in immediately without checking your inbox

## 7. Update Your .env.local

In the project root, create `.env.local` from the example:

```bash
cp .env.local.example .env.local
```

Then fill in the values:

```env
# From Supabase Dashboard > Settings > API
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...your-anon-key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...your-service-role-key

# n8n (keep defaults for local development)
N8N_BASE_URL=http://localhost:5678
N8N_GENERATE_WEBHOOK_PATH=/webhook/generate-stories
N8N_JIRA_WEBHOOK_PATH=/webhook/jira-sync
N8N_WEBHOOK_SECRET=pick-any-secret-string-here
```

## 8. Test the Connection

Start the dev server and verify everything works:

```bash
pnpm dev
```

1. Open `http://localhost:3000` — you should be redirected to `/login`
2. Sign up with an email and password
3. After sign up, you should land on the dashboard
4. Check the **Table Editor** in Supabase — a new row should appear in the `profiles` table

If the profile row appears, your database, auth, and trigger are all working correctly.

## Troubleshooting

### "Invalid API key" or blank page
- Double-check that `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local` match exactly what's in the Supabase dashboard
- Restart the dev server after changing `.env.local`

### Sign up works but no profile row
- The `handle_new_user` trigger may not have been created. Re-run the migration SQL.

### "permission denied for table profiles"
- RLS policies may not have been created. Re-run the migration SQL and check for errors in the SQL Editor output.

### Email confirmation required
- If you didn't disable email confirmations, check your inbox (or spam) for the confirmation link before logging in.
