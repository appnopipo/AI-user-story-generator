import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const REQUESTY_API_URL = "https://router.requesty.ai/v1/chat/completions";

function buildSystemPrompt(
  userEmail: string,
  currentConfig: {
    jira_base_url: string | null;
    jira_email: string | null;
    jira_api_token: string | null;
  } | null
) {
  const isReconfigure = currentConfig?.jira_base_url && currentConfig?.jira_email && currentConfig?.jira_api_token;

  const configContext = isReconfigure
    ? `
CURRENT CONFIGURATION (already saved and working):
- Jira URL: ${currentConfig.jira_base_url}
- Jira email: ${currentConfig.jira_email}
- API token: [saved]

The user wants to CHANGE their existing configuration. Ask what they'd like to update. They might want to change just one field, or all of them. Pre-fill "extracted" with the current values and only replace the ones the user wants to change. When the user confirms the changes (or says they're done), set "complete" to true.`
    : `
The user has NO Jira configuration yet. You need to collect all 3 fields from scratch.
Ask for ONE field at a time, starting with the URL.`;

  return `You are a setup assistant for a Story Generator app. Your ONLY job is to manage the Jira connection settings.

The 3 settings are:
1. **jira_base_url** — The Jira instance URL (e.g. https://myteam.atlassian.net)
2. **jira_email** — The email used to log into Jira
3. **jira_api_token** — A Jira API token

CONTEXT:
- The user's account email is: ${userEmail}
- If the user says something like "same as my account", "my login email", "the one I registered with", etc., use "${userEmail}" as the jira_email value.
${configContext}

RULES:
- Validate each input:
  - URL must start with https:// and look like a valid Atlassian URL
  - Email must have a valid format
  - API token must not be empty
- If the input looks invalid, explain why and ask again. Be helpful.
- Keep responses SHORT (1-2 sentences max). Be friendly but concise.
- Do NOT ask for any other information beyond these 3 fields.
- Do NOT make small talk or answer off-topic questions. Politely redirect.
- When you mention the API token, tell users they can generate one at: id.atlassian.com/manage-profile/security/api-tokens
- Remove any trailing slashes from URLs.

RESPONSE FORMAT:
You MUST respond with ONLY a valid JSON object. No markdown, no explanation outside the JSON.

{
  "message": "Your conversational response to the user",
  "extracted": {
    "jira_base_url": "value or null if not yet provided",
    "jira_email": "value or null if not yet provided",
    "jira_api_token": "value or null if not yet provided"
  },
  "complete": false
}

Set "complete" to true ONLY when all 3 fields have valid values AND the user has confirmed or finished making changes.
When a field value is confirmed, keep it in "extracted" for all subsequent responses.`;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { messages, mode } = await request.json();

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json(
      { error: "messages array is required" },
      { status: 400 }
    );
  }

  const userEmail = user.email || "unknown";

  // Fetch current config if in reconfigure mode
  let currentConfig = null;
  if (mode === "reconfigure") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("jira_base_url, jira_email, jira_api_token")
      .eq("id", user.id)
      .single();

    currentConfig = profile;
  }

  const llmMessages = [
    { role: "system", content: buildSystemPrompt(userEmail, currentConfig) },
    ...messages.map((m: { role: string; text: string }) => ({
      role: m.role === "bot" ? "assistant" : "user",
      content: m.text,
    })),
  ];

  const llmRes = await fetch(REQUESTY_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.REQUESTY_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "anthropic/claude-sonnet-4-20250514",
      max_tokens: 512,
      messages: llmMessages,
    }),
  });

  if (!llmRes.ok) {
    return NextResponse.json(
      { error: "LLM request failed" },
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
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({
      message: content,
      extracted: {
        jira_base_url: currentConfig?.jira_base_url || null,
        jira_email: currentConfig?.jira_email || null,
        jira_api_token: currentConfig?.jira_api_token || null,
      },
      complete: false,
    });
  }
}
