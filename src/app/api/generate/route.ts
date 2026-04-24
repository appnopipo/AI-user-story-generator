import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { triggerGenerate } from "@/lib/n8n";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { input_id, project_id } = await request.json();

  // Get the input text
  const { data: input } = await supabase
    .from("requirement_inputs")
    .select("raw_text")
    .eq("id", input_id)
    .single();

  if (!input) {
    return NextResponse.json({ error: "Input not found" }, { status: 404 });
  }

  // Create a generation run
  const { data: run } = await supabase
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

  // Update input status
  await supabase
    .from("requirement_inputs")
    .update({ status: "processing" })
    .eq("id", input_id);

  // Trigger n8n webhook (fire and forget)
  try {
    await triggerGenerate({
      input_id,
      project_id,
      raw_text: input.raw_text,
      run_id: run.id,
    });
  } catch {
    // n8n might not be running yet - update status
    await supabase
      .from("requirement_inputs")
      .update({ status: "error" })
      .eq("id", input_id);
    await supabase
      .from("generation_runs")
      .update({ status: "error", error_message: "Failed to reach n8n" })
      .eq("id", run.id);
  }

  return NextResponse.json({ run_id: run.id });
}
