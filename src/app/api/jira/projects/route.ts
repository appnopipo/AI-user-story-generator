import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getJiraAuth } from "@/lib/jira-auth";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jira = await getJiraAuth(supabase, user.id);
  if (!jira) {
    return NextResponse.json(
      { error: "Jira not connected" },
      { status: 400 }
    );
  }

  // Fetch projects
  const projectsRes = await fetch(jira.jiraUrl("/project"), {
    headers: jira.headers,
  });

  if (!projectsRes.ok) {
    const errBody = await projectsRes.text();
    return NextResponse.json(
      { error: `Jira API error: ${errBody}` },
      { status: projectsRes.status }
    );
  }

  const projects = await projectsRes.json();

  // Fetch issue types per project
  const projectsWithTypes = await Promise.all(
    projects.map(
      async (project: { id: string; key: string; name: string }) => {
        const typesRes = await fetch(
          jira.jiraUrl(`/project/${project.key}/statuses`),
          { headers: jira.headers }
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

  return NextResponse.json({
    projects: projectsWithTypes,
    site_url: jira.siteUrl,
  });
}
