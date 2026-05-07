import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getJiraAuth } from "@/lib/jira-auth";

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

  const jira = await getJiraAuth(supabase, user.id);
  if (!jira) {
    return NextResponse.json(
      { error: "Jira not connected" },
      { status: 400 }
    );
  }

  const url = jira.jiraUrl(`/issue/${issueKey}/attachments`);

  const results = await Promise.all(
    files.map(async (file) => {
      const jiraForm = new FormData();
      jiraForm.append("file", file, file.name);

      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${jira.accessToken}`,
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
