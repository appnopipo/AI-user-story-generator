const N8N_BASE_URL = process.env.N8N_BASE_URL || "http://localhost:5678";
const N8N_WEBHOOK_SECRET = process.env.N8N_WEBHOOK_SECRET || "";

export async function triggerN8nWebhook(path: string, payload: unknown) {
  const url = `${N8N_BASE_URL}${path}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${N8N_WEBHOOK_SECRET}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`n8n webhook failed: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

export function triggerGenerate(payload: {
  input_id: string;
  project_id: string;
  raw_text: string;
  run_id: string;
}) {
  const path = process.env.N8N_GENERATE_WEBHOOK_PATH || "/webhook/generate-stories";
  return triggerN8nWebhook(path, payload);
}

export function triggerJiraSync(payload: {
  story_id: string;
  dry_run: boolean;
  jira_base_url: string;
  jira_email: string;
  jira_api_token: string;
  jira_project_key: string;
}) {
  const path = process.env.N8N_JIRA_WEBHOOK_PATH || "/webhook/jira-sync";
  return triggerN8nWebhook(path, payload);
}
