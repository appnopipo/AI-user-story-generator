import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { StoryCard } from "@/components/stories/StoryCard";
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

  const typedInput = input as RequirementInput;
  const typedStories = (stories || []) as GeneratedStory[];

  const statusColor: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    processing: "bg-blue-100 text-blue-800",
    completed: "bg-green-100 text-green-800",
    error: "bg-red-100 text-red-800",
  };

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

      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-2xl font-bold">{typedInput.title}</h1>
        <Badge className={statusColor[typedInput.status] || ""}>
          {typedInput.status}
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Left: Original Input */}
        <div>
          <h2 className="mb-3 text-lg font-semibold">Original Requirements</h2>
          <Card>
            <CardContent className="whitespace-pre-wrap pt-6 text-sm">
              {typedInput.raw_text}
            </CardContent>
          </Card>
        </div>

        {/* Right: Generated Stories */}
        <div>
          <h2 className="mb-3 text-lg font-semibold">
            Generated Stories ({typedStories.length})
          </h2>

          {typedStories.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                {typedInput.status === "processing"
                  ? "Generating stories..."
                  : typedInput.status === "error"
                    ? "Generation failed. Try again."
                    : "No stories generated yet."}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {typedStories.map((story) => (
                <StoryCard key={story.id} story={story} projectId={projectId} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
