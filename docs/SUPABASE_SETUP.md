# Supabase Setup Guide

Step-by-step guide to configure Supabase for the Ticket Generator.

## 1. Create a Supabase Account

1. Go to [supabase.com](https://supabase.com) and click **Start your project**
2. Sign up with GitHub (recommended) or email
3. You'll land on the Supabase Dashboard

## 2. Create a New Project

1. Click **New Project**
2. Fill in:
   - **Project name:** `ticket-generator`
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

> The `service_role` key bypasses Row Level Security. It is only used server-side in the API routes. Never expose it to the browser.

## 4. Run the Database Migrations

1. In the sidebar, click **SQL Editor**
2. Click **New query**
3. Open `supabase/migrations/001_initial_schema.sql` from this project
4. Copy the entire contents and paste it into the SQL Editor
5. Click **Run** (or press Cmd+Enter)
6. Repeat for `supabase/migrations/002_cleanup_unused_fields.sql`

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

## 6. Configure Auth

### Email/Password

By default, Supabase Auth works with email + password. You may want to:

1. Go to **Authentication** > **Providers**
2. Under **Email**, make sure it is enabled
3. (Optional) Disable **Confirm email** for faster testing during development

### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com) > APIs & Services > Credentials
2. Create an **OAuth Client ID** (Web application)
3. Add authorized redirect URI: `https://<your-project-id>.supabase.co/auth/v1/callback`
4. Copy the **Client ID** and **Client Secret**
5. In Supabase Dashboard > **Authentication** > **Providers**, enable **Google**
6. Paste the Client ID and Client Secret, then save

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

# Requesty LLM
REQUESTY_API_KEY=your-requesty-api-key

# Jira (optional, default shown)
JIRA_STORY_POINTS_FIELD_ID=customfield_10016
```

## 8. Test the Connection

Start the dev server and verify everything works:

```bash
pnpm dev
```

1. Open `http://localhost:3000` — you should be redirected to `/login`
2. Sign in with Google or sign up with email and password
3. The LLM-powered onboarding will guide you through Jira setup
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

### Google login redirects but doesn't complete
- Check that the redirect URI in Google Cloud Console matches exactly: `https://<project-id>.supabase.co/auth/v1/callback`
- Verify the Client ID and Secret are correctly pasted in Supabase Auth Providers
