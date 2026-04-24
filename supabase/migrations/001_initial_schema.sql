-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text,
  avatar_url    text,
  jira_api_token text,
  jira_email     text,
  jira_base_url  text,
  created_at    timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data->>'display_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- PROJECTS
-- ============================================================
create table public.projects (
  id              uuid primary key default uuid_generate_v4(),
  owner_id        uuid references public.profiles(id) on delete cascade not null,
  name            text not null,
  description     text,
  jira_project_key text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ============================================================
-- REQUIREMENT_INPUTS
-- ============================================================
create table public.requirement_inputs (
  id          uuid primary key default uuid_generate_v4(),
  project_id  uuid references public.projects(id) on delete cascade not null,
  created_by  uuid references public.profiles(id) not null,
  title       text not null,
  raw_text    text,
  file_path   text,
  status      text default 'pending'
              check (status in ('pending','processing','completed','error')),
  created_at  timestamptz default now()
);

-- ============================================================
-- GENERATED_STORIES
-- ============================================================
create table public.generated_stories (
  id                   uuid primary key default uuid_generate_v4(),
  input_id             uuid references public.requirement_inputs(id) on delete cascade not null,
  project_id           uuid references public.projects(id) on delete cascade not null,
  title                text not null,
  persona              text not null,
  action               text not null,
  benefit              text not null,
  acceptance_criteria  jsonb not null default '[]',
  priority             text check (priority in ('highest','high','medium','low','lowest')),
  story_points         integer,
  labels               text[] default '{}',
  source_excerpt       text,
  confidence           real default 0.0 check (confidence >= 0 and confidence <= 1),
  flagged_gaps         text[] default '{}',
  review_status        text default 'pending'
                       check (review_status in ('pending','approved','rejected','changes_requested')),
  reviewer_id          uuid references public.profiles(id),
  review_comment       text,
  reviewed_at          timestamptz,
  jira_issue_key       text,
  jira_sync_status     text default 'not_synced'
                       check (jira_sync_status in ('not_synced','dry_run','synced','error')),
  jira_dry_run_payload jsonb,
  jira_synced_at       timestamptz,
  is_edited            boolean default false,
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);

-- ============================================================
-- GENERATION_RUNS
-- ============================================================
create table public.generation_runs (
  id                uuid primary key default uuid_generate_v4(),
  input_id          uuid references public.requirement_inputs(id) on delete cascade not null,
  status            text default 'pending'
                    check (status in ('pending','running','completed','error')),
  prompt_tokens     integer,
  completion_tokens integer,
  model_used        text,
  error_message     text,
  started_at        timestamptz,
  completed_at      timestamptz,
  created_at        timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.requirement_inputs enable row level security;
alter table public.generated_stories enable row level security;
alter table public.generation_runs enable row level security;

-- Profiles: users see/edit own profile
create policy "Users manage own profile"
  on public.profiles for all
  using (auth.uid() = id);

-- Projects: users see/edit own projects
create policy "Users manage own projects"
  on public.projects for all
  using (auth.uid() = owner_id);

-- Inputs: users see/edit own inputs
create policy "Users manage own inputs"
  on public.requirement_inputs for all
  using (created_by = auth.uid());

-- Stories: users see/edit stories in their projects
create policy "Users manage own stories"
  on public.generated_stories for all
  using (project_id in (select id from public.projects where owner_id = auth.uid()));

-- Runs: users see runs for their inputs
create policy "Users manage own runs"
  on public.generation_runs for all
  using (input_id in (select id from public.requirement_inputs where created_by = auth.uid()));

-- ============================================================
-- REALTIME (enable for live UI updates)
-- ============================================================
alter publication supabase_realtime add table public.requirement_inputs;
alter publication supabase_realtime add table public.generated_stories;
