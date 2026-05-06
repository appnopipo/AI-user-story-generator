import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  // Fetch projects from Jira
  const projectsRes = await fetch(
    `${profile.jira_base_url}/rest/api/3/project`,
    {
      headers: {
        Authorization: `Basic ${authHeader}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!projectsRes.ok) {
    const errBody = await projectsRes.text();
    return NextResponse.json(
      { error: `Jira API error: ${errBody}` },
      { status: projectsRes.status }
    );
  }

  const projects = await projectsRes.json();

  // Fetch issue types for each project (in parallel)
  const projectsWithTypes = await Promise.all(
    projects.map(
      async (project: { id: string; key: string; name: string }) => {
        const typesRes = await fetch(
          `${profile.jira_base_url}/rest/api/3/project/${project.key}/statuses`,
          {
            headers: {
              Authorization: `Basic ${authHeader}`,
              "Content-Type": "application/json",
            },
          }
        );

        let issueTypes: { id: string; name: string }[] = [];
        if (typesRes.ok) {
          const statuses = await typesRes.json();
          issueTypes = statuses.map(
            (s: { id: string; name: string }) => ({
              id: s.id,
              name: s.name,
            })
          );
        }

        return {
          id: project.id,
          key: project.key,
          name: project.name,
          issueTypes,
        };
      }
    )
  );

  return NextResponse.json({ projects: projectsWithTypes });
}
