import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const issueKey = formData.get("issueKey") as string;
  const files = formData.getAll("files") as File[];

  if (!issueKey || files.length === 0) {
    return NextResponse.json(
      { error: "issueKey and files are required" },
      { status: 400 }
    );
  }

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

  const url = `${profile.jira_base_url}/rest/api/3/issue/${issueKey}/attachments`;

  const results = await Promise.all(
    files.map(async (file) => {
      const jiraForm = new FormData();
      jiraForm.append("file", file, file.name);

      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Basic ${authHeader}`,
          "X-Atlassian-Token": "no-check",
        },
        body: jiraForm,
      });

      if (!res.ok) {
        const errText = await res.text();
        return { filename: file.name, error: errText };
      }

      return { filename: file.name, ok: true };
    })
  );

  return NextResponse.json({ results });
}
