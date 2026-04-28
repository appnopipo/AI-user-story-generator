import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { RealtimeInputView } from "@/components/inputs/RealtimeInputView";
import type { GeneratedStory, RequirementInput } from "@/lib/types";

export default async function InputDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; inputId: string }>;
}) {
  const { projectId, inputId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: input } = await supabase
    .from("requirement_inputs")
    .select("*")
    .eq("id", inputId)
    .single();

  if (!input) notFound();

  const { data: stories } = await supabase
    .from("generated_stories")
    .select("*")
    .eq("input_id", inputId)
    .order("created_at", { ascending: true });

  return (
    <div className="mx-auto max-w-7xl p-8">
      <div className="mb-4">
        <Link
          href={`/projects/${projectId}`}
          className="text-sm text-muted-foreground hover:underline"
        >
          &larr; Back to project
        </Link>
      </div>

      <RealtimeInputView
        initialInput={input as RequirementInput}
        initialStories={(stories || []) as GeneratedStory[]}
        projectId={projectId}
      />
    </div>
  );
}
