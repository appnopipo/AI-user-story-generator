import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const REQUESTY_API_URL = "https://router.requesty.ai/v1/chat/completions";

const SYSTEM_PROMPT = `You are a requirements analyst. Your task: convert raw requirement text into structured user stories.

CRITICAL: You MUST respond with ONLY a valid JSON object. No markdown, no explanation, no text before or after the JSON. Start your response with { and end with }.

RULES:
- ONLY generate stories from information explicitly present in the input. Do NOT invent requirements.
- If the input is not a requirements document (e.g. it is a training guide, meeting agenda, or general description), extract any actionable requirements you can find and flag the rest as gaps.
- If information is missing or ambiguous, flag it in the flagged_gaps array.
- Assign a confidence score (0.0 to 1.0) based on how clearly the requirement was stated.
- For each story, include the source_excerpt — the exact phrase or sentence from the input that this story derives from.
- If the input contains NO actionable requirements at all (e.g. random text, greetings, single words, gibberish, or non-technical content), return an EMPTY stories array and a message explaining why. Do NOT create placeholder or meta stories about the inability to extract requirements. The stories array must be empty in this case.

RESPOND WITH THIS EXACT JSON STRUCTURE:
{
  "message": "Optional message to the user (e.g. why no stories were generated)",
  "stories": [
    {
      "title": "Short descriptive title",
      "persona": "type of user",
      "action": "what they want to do",
      "benefit": "why they want it",
      "acceptance_criteria": [
        { "given": "...", "when": "...", "then": "..." }
      ],
      "priority": "high|medium|low",
      "story_points": 3,
      "labels": ["auth", "backend"],
      "source_excerpt": "exact quote from input",
      "confidence": 0.85,
      "flagged_gaps": ["No error handling requirements specified"]
    }
  ]
}`;

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { input_id, project_id } = await request.json();

  const { data: input } = await supabase
    .from("requirement_inputs")
    .select("raw_text")
    .eq("id", input_id)
    .single();

  if (!input) {
    return NextResponse.json({ error: "Input not found" }, { status: 404 });
  }

  const admin = getAdminClient();

  // Create a generation run
  const { data: run } = await admin
    .from("generation_runs")
    .insert({ input_id, status: "pending" })
    .select()
    .single();

  if (!run) {
    return NextResponse.json(
      { error: "Failed to create run" },
      { status: 500 }
    );
  }

  // Update statuses to processing/running
  await admin
    .from("requirement_inputs")
    .update({ status: "processing" })
    .eq("id", input_id);

  await admin
    .from("generation_runs")
    .update({ status: "running", started_at: new Date().toISOString() })
    .eq("id", run.id);

  // Call LLM
  try {
    const llmRes = await fetch(REQUESTY_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.REQUESTY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "anthropic/claude-sonnet-4-20250514",
        max_tokens: 8192,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: input.raw_text.substring(0, 15000) },
        ],
      }),
    });

    if (!llmRes.ok) {
      throw new Error(`LLM request failed: ${llmRes.status}`);
    }

    const llmData = await llmRes.json();
    let content = llmData.choices[0].message.content;
    content = content
      .replace(/^```(?:json)?\n?/gm, "")
      .replace(/```$/gm, "")
      .trim();

    const parsed = JSON.parse(content);

    // Filter out placeholder/meta stories the LLM may generate instead of returning empty
    const INVALID_PATTERNS = /unable to|cannot extract|no (?:actionable )?requirements|not a requirements/i;
    const stories = (parsed.stories || []).filter(
      (s: { title?: string; confidence?: number }) =>
        s.title && !INVALID_PATTERNS.test(s.title) && (s.confidence ?? 1) > 0.1
    );

    // No stories generated — LLM couldn't extract requirements
    if (stories.length === 0) {
      const llmMessage =
        parsed.message ||
        "I couldn't identify any actionable requirements in the provided text. Try pasting a more specific requirements document, user story brief, or feature description.";

      await admin
        .from("requirement_inputs")
        .update({ status: "completed" })
        .eq("id", input_id);

      await admin
        .from("generation_runs")
        .update({
          status: "completed",
          prompt_tokens: llmData.usage?.prompt_tokens || 0,
          completion_tokens: llmData.usage?.completion_tokens || 0,
          model_used: llmData.model || "unknown",
          completed_at: new Date().toISOString(),
        })
        .eq("id", run.id);

      return NextResponse.json({
        run_id: run.id,
        no_stories: true,
        message: llmMessage,
      });
    }

    // Insert stories
    if (stories.length > 0) {
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
          project_id,
          title: s.title || "Untitled Story",
          persona: s.persona || "user",
          action: s.action || "",
          benefit: s.benefit || "",
          acceptance_criteria: s.acceptance_criteria || [],
          priority: s.priority || "medium",
          story_points: s.story_points || null,
          labels: s.labels || [],
          source_excerpt: s.source_excerpt || null,
          confidence: s.confidence || 0.5,
          flagged_gaps: s.flagged_gaps || [],
        })
      );

      await admin.from("generated_stories").insert(storyRows);
    }

    // Mark as completed
    await admin
      .from("requirement_inputs")
      .update({ status: "completed" })
      .eq("id", input_id);

    await admin
      .from("generation_runs")
      .update({
        status: "completed",
        prompt_tokens: llmData.usage?.prompt_tokens || 0,
        completion_tokens: llmData.usage?.completion_tokens || 0,
        model_used: llmData.model || "unknown",
        completed_at: new Date().toISOString(),
      })
      .eq("id", run.id);

    return NextResponse.json({ run_id: run.id });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";

    await admin
      .from("requirement_inputs")
      .update({ status: "error" })
      .eq("id", input_id);

    await admin
      .from("generation_runs")
      .update({
        status: "error",
        error_message: message,
        completed_at: new Date().toISOString(),
      })
      .eq("id", run.id);

    return NextResponse.json({ run_id: run.id, error: message }, { status: 500 });
  }
}
