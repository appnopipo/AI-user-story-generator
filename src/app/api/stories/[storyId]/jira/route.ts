import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildJiraPayload } from "@/lib/jira";
import { getJiraAuth } from "@/lib/jira-auth";
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

  const { issue_type, jira_project_key, edits } = await request.json();

  const jira = await getJiraAuth(supabase, user.id);
  if (!jira) {
    return NextResponse.json(
      { error: "Jira not connected. Please reconnect your Jira account." },
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

  // Determine project key
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

  const storyData = edits ? { ...story, ...edits } : story;

  const storyPointsFieldId =
    process.env.JIRA_STORY_POINTS_FIELD_ID || "customfield_10016";

  const payload = buildJiraPayload(
    storyData as GeneratedStory,
    projectKey,
    storyPointsFieldId,
    issue_type || "Story"
  );

  // Push to Jira via OAuth
  const jiraRes = await fetch(jira.jiraUrl("/issue"), {
    method: "POST",
    headers: jira.headers,
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
