import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const REQUESTY_API_URL = "https://router.requesty.ai/v1/chat/completions";

const SYSTEM_PROMPT = `You are a requirements analyst. Your task: convert raw requirement text into structured user stories.

CRITICAL: You MUST respond with ONLY a valid JSON object. No markdown, no explanation, no text before or after the JSON. Start your response with { and end with }.

IMPORTANT: Generate stories ONE AT A TIME. Output the opening of the JSON, then each complete story object before starting the next. This allows incremental processing.

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

const INVALID_PATTERNS =
  /unable to|cannot extract|no (?:actionable )?requirements|not a requirements/i;

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Try to extract complete story objects from a partial JSON string
function extractStories(partial: string): {
  stories: Record<string, unknown>[];
  message?: string;
} {
  // Clean markdown fences
  let cleaned = partial
    .replace(/^```(?:json)?\n?/gm, "")
    .replace(/```$/gm, "")
    .trim();

  // Try parsing as complete JSON first
  try {
    return JSON.parse(cleaned);
  } catch {
    // Not valid yet — try to extract individual story objects
  }

  const stories: Record<string, unknown>[] = [];
  let message: string | undefined;

  // Extract message if present
  const msgMatch = cleaned.match(/"message"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (msgMatch) {
    message = msgMatch[1];
  }

  // Find story objects by matching balanced braces within the stories array
  const storiesStart = cleaned.indexOf('"stories"');
  if (storiesStart === -1) return { stories, message };

  const arrayStart = cleaned.indexOf("[", storiesStart);
  if (arrayStart === -1) return { stories, message };

  let depth = 0;
  let objStart = -1;

  for (let i = arrayStart + 1; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (ch === "{") {
      if (depth === 0) objStart = i;
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0 && objStart !== -1) {
        const objStr = cleaned.substring(objStart, i + 1);
        try {
          const obj = JSON.parse(objStr);
          if (obj.title) stories.push(obj);
        } catch {
          // Incomplete object, skip
        }
        objStart = -1;
      }
    }
  }

  return { stories, message };
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

  // Update statuses
  await admin
    .from("requirement_inputs")
    .update({ status: "processing" })
    .eq("id", input_id);

  await admin
    .from("generation_runs")
    .update({ status: "running", started_at: new Date().toISOString() })
    .eq("id", run.id);

  // Stream the response
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: unknown) {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      }

      try {
        send("status", { step: "Calling AI model..." });

        const llmRes = await fetch(REQUESTY_API_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.REQUESTY_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "anthropic/claude-sonnet-4-20250514",
            max_tokens: 8192,
            stream: true,
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: input.raw_text.substring(0, 15000) },
            ],
          }),
        });

        if (!llmRes.ok || !llmRes.body) {
          throw new Error(`LLM request failed: ${llmRes.status}`);
        }

        send("status", { step: "AI is analyzing your requirements..." });

        // Read streaming response
        const reader = llmRes.body.getReader();
        const decoder = new TextDecoder();
        let fullContent = "";
        let savedStoryCount = 0;
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Parse SSE chunks from the LLM
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;

            try {
              const chunk = JSON.parse(data);
              const delta = chunk.choices?.[0]?.delta?.content;
              if (delta) {
                fullContent += delta;

                // Try to extract stories from what we have so far
                const { stories } = extractStories(fullContent);
                const validStories = stories.filter(
                  (s) =>
                    s.title &&
                    !INVALID_PATTERNS.test(s.title as string) &&
                    ((s.confidence as number) ?? 1) > 0.1
                );

                // Save and stream any new complete stories
                while (savedStoryCount < validStories.length) {
                  const story = validStories[savedStoryCount];

                  const storyRow = {
                    input_id,
                    project_id,
                    title: (story.title as string) || "Untitled Story",
                    persona: (story.persona as string) || "user",
                    action: (story.action as string) || "",
                    benefit: (story.benefit as string) || "",
                    acceptance_criteria: story.acceptance_criteria || [],
                    priority: (story.priority as string) || "medium",
                    story_points: (story.story_points as number) || null,
                    labels: (story.labels as string[]) || [],
                    source_excerpt: (story.source_excerpt as string) || null,
                    confidence: (story.confidence as number) || 0.5,
                    flagged_gaps: (story.flagged_gaps as string[]) || [],
                  };

                  const { data: inserted } = await admin
                    .from("generated_stories")
                    .insert(storyRow)
                    .select()
                    .single();

                  if (inserted) {
                    send("story", inserted);
                  }

                  savedStoryCount++;
                  send("status", {
                    step: `Generating stories... (${savedStoryCount} created)`,
                  });
                }
              }
            } catch {
              // Skip malformed chunks
            }
          }
        }

        // Final parse to catch the message field and any remaining stories
        const final = extractStories(fullContent);
        const validStories = (final.stories || []).filter(
          (s) =>
            s.title &&
            !INVALID_PATTERNS.test(s.title as string) &&
            ((s.confidence as number) ?? 1) > 0.1
        );

        // Save any stories we missed during streaming
        while (savedStoryCount < validStories.length) {
          const story = validStories[savedStoryCount];
          const storyRow = {
            input_id,
            project_id,
            title: (story.title as string) || "Untitled Story",
            persona: (story.persona as string) || "user",
            action: (story.action as string) || "",
            benefit: (story.benefit as string) || "",
            acceptance_criteria: story.acceptance_criteria || [],
            priority: (story.priority as string) || "medium",
            story_points: (story.story_points as number) || null,
            labels: (story.labels as string[]) || [],
            source_excerpt: (story.source_excerpt as string) || null,
            confidence: (story.confidence as number) || 0.5,
            flagged_gaps: (story.flagged_gaps as string[]) || [],
          };

          const { data: inserted } = await admin
            .from("generated_stories")
            .insert(storyRow)
            .select()
            .single();

          if (inserted) {
            send("story", inserted);
          }
          savedStoryCount++;
        }

        // No stories case
        if (savedStoryCount === 0) {
          const llmMessage =
            final.message ||
            "I couldn't identify any actionable requirements in the provided text. Try pasting a more specific requirements document, user story brief, or feature description.";
          send("no_stories", { message: llmMessage });
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
            model_used: "anthropic/claude-sonnet-4-20250514",
            completed_at: new Date().toISOString(),
          })
          .eq("id", run.id);

        send("done", { run_id: run.id, story_count: savedStoryCount });
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

        send("error", { message });
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
