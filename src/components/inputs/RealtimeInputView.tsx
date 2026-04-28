"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { StoryCard } from "@/components/stories/StoryCard";
import type { GeneratedStory, RequirementInput } from "@/lib/types";

const statusColor: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  processing: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  error: "bg-red-100 text-red-800",
};

export function RealtimeInputView({
  initialInput,
  initialStories,
  projectId,
}: {
  initialInput: RequirementInput;
  initialStories: GeneratedStory[];
  projectId: string;
}) {
  const [input, setInput] = useState(initialInput);
  const [stories, setStories] = useState(initialStories);
  const supabase = createClient();

  useEffect(() => {
    // Listen for input status changes
    const inputChannel = supabase
      .channel(`input-${input.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "requirement_inputs",
          filter: `id=eq.${input.id}`,
        },
        (payload) => {
          setInput((prev) => ({ ...prev, ...payload.new } as RequirementInput));
        }
      )
      .subscribe();

    // Listen for new stories
    const storiesChannel = supabase
      .channel(`stories-${input.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "generated_stories",
          filter: `input_id=eq.${input.id}`,
        },
        (payload) => {
          setStories((prev) => [...prev, payload.new as GeneratedStory]);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "generated_stories",
          filter: `input_id=eq.${input.id}`,
        },
        (payload) => {
          setStories((prev) =>
            prev.map((s) =>
              s.id === (payload.new as GeneratedStory).id
                ? (payload.new as GeneratedStory)
                : s
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(inputChannel);
      supabase.removeChannel(storiesChannel);
    };
  }, [input.id, supabase]);

  return (
    <>
      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-2xl font-bold">{input.title}</h1>
        <Badge className={statusColor[input.status] || ""}>
          {input.status}
        </Badge>
        {input.status === "processing" && (
          <span className="text-sm text-muted-foreground animate-pulse">
            Processing...
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-lg font-semibold">Original Requirements</h2>
          <Card>
            <CardContent className="whitespace-pre-wrap pt-6 text-sm">
              {input.raw_text}
            </CardContent>
          </Card>
        </div>

        <div>
          <h2 className="mb-3 text-lg font-semibold">
            Generated Stories ({stories.length})
          </h2>

          {stories.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                {input.status === "processing" ? (
                  <div className="space-y-2">
                    <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                    <p>Generating stories...</p>
                  </div>
                ) : input.status === "error" ? (
                  "Generation failed. Try again."
                ) : (
                  "No stories generated yet."
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {stories.map((story) => (
                <StoryCard
                  key={story.id}
                  story={story}
                  projectId={projectId}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
