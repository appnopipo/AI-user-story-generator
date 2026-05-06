import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildJiraPayload } from "@/lib/jira";
import type { GeneratedStory } from "@/lib/types";

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

  const { dry_run, issue_type, jira_project_key, edits } = await request.json();

  // Get user's Jira config
  const { data: profile } = await supabase
    .from("profiles")
    .select("jira_base_url, jira_email, jira_api_token")
    .eq("id", user.id)
    .single();

  if (
    !profile?.jira_base_url ||
    !profile?.jira_email ||
    !profile?.jira_api_token
  ) {
    return NextResponse.json(
      { error: "Jira credentials not configured. Update your profile with Jira base URL, email, and API token." },
      { status: 400 }
    );
  }

  // Get story
  const { data: story } = await supabase
    .from("generated_stories")
    .select("*")
    .eq("id", storyId)
    .single();

  if (!story) {
    return NextResponse.json({ error: "Story not found" }, { status: 404 });
  }

  // Determine project key: prefer direct param, fallback to project lookup
  let projectKey = jira_project_key;
  if (!projectKey) {
    const { data: project } = await supabase
      .from("projects")
      .select("jira_project_key")
      .eq("id", story.project_id)
      .single();

    projectKey = project?.jira_project_key;
  }

  if (!projectKey) {
    return NextResponse.json(
      { error: "Jira project key not provided" },
      { status: 400 }
    );
  }

  // Apply any inline edits from the client
  const storyData = edits
    ? { ...story, ...edits }
    : story;

  const storyPointsFieldId =
    process.env.JIRA_STORY_POINTS_FIELD_ID || "customfield_10016";

  const payload = buildJiraPayload(
    storyData as GeneratedStory,
    projectKey,
    storyPointsFieldId,
    issue_type || "Story"
  );

  // Dry run: return the payload without sending
  if (dry_run) {
    await supabase
      .from("generated_stories")
      .update({
        jira_dry_run_payload: payload,
        jira_sync_status: "dry_run",
      })
      .eq("id", storyId);

    return NextResponse.json({ payload });
  }

  // Real push to Jira
  const jiraUrl = `${profile.jira_base_url}/rest/api/3/issue`;
  const authHeader = Buffer.from(
    `${profile.jira_email}:${profile.jira_api_token}`
  ).toString("base64");

  const jiraRes = await fetch(jiraUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${authHeader}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!jiraRes.ok) {
    const errBody = await jiraRes.text();
    await supabase
      .from("generated_stories")
      .update({ jira_sync_status: "error" })
      .eq("id", storyId);

    return NextResponse.json(
      { error: `Jira API error: ${errBody}` },
      { status: jiraRes.status }
    );
  }

  const jiraData = await jiraRes.json();

  // Save edits if provided
  const updateData: Record<string, unknown> = {
    jira_issue_key: jiraData.key,
    jira_sync_status: "synced",
    jira_synced_at: new Date().toISOString(),
  };

  if (edits) {
    Object.assign(updateData, edits, { is_edited: true });
  }

  await supabase
    .from("generated_stories")
    .update(updateData)
    .eq("id", storyId);

  return NextResponse.json({ issue_key: jiraData.key });
}
