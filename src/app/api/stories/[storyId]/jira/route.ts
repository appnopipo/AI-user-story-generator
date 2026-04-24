import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { triggerJiraSync } from "@/lib/n8n";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ storyId: string }> }
) {
  const { storyId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { dry_run } = await request.json();

  // Get user's Jira config
  const { data: profile } = await supabase
    .from("profiles")
    .select("jira_base_url, jira_email, jira_api_token")
    .eq("id", user.id)
    .single();

  if (!profile?.jira_base_url || !profile?.jira_email || !profile?.jira_api_token) {
    return NextResponse.json(
      { error: "Jira credentials not configured" },
      { status: 400 }
    );
  }

  // Get the story's project key
  const { data: story } = await supabase
    .from("generated_stories")
    .select("project_id")
    .eq("id", storyId)
    .single();

  if (!story) {
    return NextResponse.json({ error: "Story not found" }, { status: 404 });
  }

  const { data: project } = await supabase
    .from("projects")
    .select("jira_project_key")
    .eq("id", story.project_id)
    .single();

  if (!project?.jira_project_key) {
    return NextResponse.json(
      { error: "Jira project key not set" },
      { status: 400 }
    );
  }

  try {
    await triggerJiraSync({
      story_id: storyId,
      dry_run: dry_run ?? true,
      jira_base_url: profile.jira_base_url,
      jira_email: profile.jira_email,
      jira_api_token: profile.jira_api_token,
      jira_project_key: project.jira_project_key,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to reach n8n" },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
