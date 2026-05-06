import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const REQUESTY_API_URL = "https://router.requesty.ai/v1/chat/completions";

const SYSTEM_PROMPT = `You are a duplicate ticket detector. You will receive two lists:
1. EXISTING TICKETS — tickets already in Jira
2. NEW STORIES — stories the user wants to create

Your job: identify which new stories are duplicates of or significantly overlap with existing tickets.

RULES:
- A duplicate means the new story requests the SAME functionality as an existing ticket, even if worded differently.
- Partial overlaps count — if a new story is a subset of an existing ticket, flag it.
- Do NOT flag stories that are merely related but address different aspects.
- Be strict: only flag clear duplicates, not vague similarities.

RESPOND WITH ONLY a valid JSON object:
{
  "duplicates": [
    {
      "new_story_id": "id of the new story",
      "existing_ticket_key": "PROJ-123",
      "existing_ticket_summary": "summary of the existing ticket",
      "reason": "Brief explanation of why this is a duplicate"
    }
  ]
}

If no duplicates are found, return: { "duplicates": [] }`;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { stories, jira_project_key } = await request.json();

  if (!stories?.length || !jira_project_key) {
    return NextResponse.json(
      { error: "stories and jira_project_key are required" },
      { status: 400 }
    );
  }

  // Get Jira credentials
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
      { error: "Jira credentials not configured" },
      { status: 400 }
    );
  }

  const authHeader = Buffer.from(
    `${profile.jira_email}:${profile.jira_api_token}`
  ).toString("base64");

  // Fetch existing tickets from the Jira project (last 100)
  const jql = encodeURIComponent(
    `project = ${jira_project_key} ORDER BY created DESC`
  );
  const jiraUrl = `${profile.jira_base_url}/rest/api/3/search?jql=${jql}&maxResults=100&fields=summary,status,issuetype`;

  const jiraRes = await fetch(jiraUrl, {
    headers: {
      Authorization: `Basic ${authHeader}`,
      "Content-Type": "application/json",
    },
  });

  if (!jiraRes.ok) {
    const errText = await jiraRes.text();
    console.error("Jira search failed:", jiraRes.status, errText);
    return NextResponse.json(
      { error: `Failed to fetch existing tickets: ${errText}` },
      { status: 502 }
    );
  }

  const jiraData = await jiraRes.json();
  const existingTickets = (jiraData.issues || []).map(
    (issue: {
      key: string;
      fields: {
        summary: string;
        status: { name: string };
        issuetype: { name: string };
      };
    }) => ({
      key: issue.key,
      summary: issue.fields.summary,
      status: issue.fields.status?.name,
      type: issue.fields.issuetype?.name,
    })
  );

  // If no existing tickets, no duplicates possible
  if (existingTickets.length === 0) {
    return NextResponse.json({ duplicates: [] });
  }

  // Prepare stories summary for LLM
  const newStoriesSummary = stories.map(
    (s: {
      id: string;
      title: string;
      persona: string;
      action: string;
      benefit: string;
    }) => ({
      id: s.id,
      title: s.title,
      description: `As a ${s.persona}, I want ${s.action}, so that ${s.benefit}`,
    })
  );

  // Call LLM to compare
  const llmRes = await fetch(REQUESTY_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.REQUESTY_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "anthropic/claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `EXISTING TICKETS:\n${JSON.stringify(existingTickets, null, 2)}\n\nNEW STORIES:\n${JSON.stringify(newStoriesSummary, null, 2)}`,
        },
      ],
    }),
  });

  if (!llmRes.ok) {
    console.error("LLM check-duplicates failed:", llmRes.status);
    return NextResponse.json(
      { error: "Duplicate check failed — LLM unavailable" },
      { status: 502 }
    );
  }

  const llmData = await llmRes.json();
  let content = llmData.choices[0].message.content;
  content = content
    .replace(/^```(?:json)?\n?/gm, "")
    .replace(/```$/gm, "")
    .trim();

  try {
    const parsed = JSON.parse(content);
    return NextResponse.json({
      duplicates: parsed.duplicates || [],
      existing_count: existingTickets.length,
    });
  } catch {
    console.error("Failed to parse LLM duplicate check response:", content);
    return NextResponse.json(
      { error: "Duplicate check failed — could not parse response" },
      { status: 502 }
    );
  }
}
