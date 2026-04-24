import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Use service role key for webhook callbacks (no user session)
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: Request) {
  // Verify shared secret
  const authHeader = request.headers.get("authorization");
  const expectedToken = `Bearer ${process.env.N8N_WEBHOOK_SECRET}`;

  if (authHeader !== expectedToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { input_id, run_id, stories, status, error_message, token_usage } =
    body;

  const supabase = getAdminClient();

  if (status === "error") {
    await supabase
      .from("requirement_inputs")
      .update({ status: "error" })
      .eq("id", input_id);

    await supabase
      .from("generation_runs")
      .update({
        status: "error",
        error_message,
        completed_at: new Date().toISOString(),
      })
      .eq("id", run_id);

    return NextResponse.json({ ok: true });
  }

  // Insert generated stories
  if (stories?.length) {
    const storyRows = stories.map(
      (s: {
        title: string;
        persona: string;
        action: string;
        benefit: string;
        acceptance_criteria: unknown[];
        priority: string;
        story_points: number;
        labels: string[];
        source_excerpt: string;
        confidence: number;
        flagged_gaps: string[];
      }) => ({
        input_id,
        project_id: body.project_id,
        title: s.title,
        persona: s.persona,
        action: s.action,
        benefit: s.benefit,
        acceptance_criteria: s.acceptance_criteria,
        priority: s.priority,
        story_points: s.story_points,
        labels: s.labels || [],
        source_excerpt: s.source_excerpt,
        confidence: s.confidence,
        flagged_gaps: s.flagged_gaps || [],
      })
    );

    await supabase.from("generated_stories").insert(storyRows);
  }

  // Update statuses
  await supabase
    .from("requirement_inputs")
    .update({ status: "completed" })
    .eq("id", input_id);

  await supabase
    .from("generation_runs")
    .update({
      status: "completed",
      prompt_tokens: token_usage?.prompt_tokens,
      completion_tokens: token_usage?.completion_tokens,
      model_used: token_usage?.model,
      completed_at: new Date().toISOString(),
    })
    .eq("id", run_id);

  return NextResponse.json({ ok: true });
}
