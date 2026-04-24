"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewInputPage() {
  const [title, setTitle] = useState("");
  const [rawText, setRawText] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { projectId } = useParams<{ projectId: string }>();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data: input, error } = await supabase
      .from("requirement_inputs")
      .insert({
        project_id: projectId,
        created_by: user.id,
        title,
        raw_text: rawText,
      })
      .select()
      .single();

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    // Trigger generation
    await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input_id: input.id,
        project_id: projectId,
      }),
    });

    router.push(`/projects/${projectId}/inputs/${input.id}`);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl p-8">
      <Card>
        <CardHeader>
          <CardTitle>New Requirement</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. User Authentication Requirements"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rawText">Requirements Text</Label>
              <Textarea
                id="rawText"
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Paste your unstructured requirements here..."
                rows={12}
                required
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? "Generating..." : "Generate Stories"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
