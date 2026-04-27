"use client";

import { useState, useRef } from "react";
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
  const [filePath, setFilePath] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { projectId } = useParams<{ projectId: string }>();
  const supabase = createClient();

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    setUploading(false);

    if (!res.ok) {
      alert(data.error);
      return;
    }

    setRawText(data.text);
    setFilePath(data.file_path);
    if (!title) {
      setTitle(file.name.replace(/\.[^.]+$/, ""));
    }
  }

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
        file_path: filePath,
      })
      .select()
      .single();

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

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
              <Label>Upload File (PDF, DOCX, TXT)</Label>
              <div className="flex items-center gap-2">
                <Input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.docx,.txt,.md"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
                {uploading && (
                  <span className="text-sm text-muted-foreground">
                    Extracting text...
                  </span>
                )}
              </div>
              {filePath && (
                <p className="text-xs text-green-600">
                  File uploaded. Text extracted and loaded below.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="rawText">Requirements Text</Label>
              <Textarea
                id="rawText"
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Paste your unstructured requirements here, or upload a file above..."
                rows={12}
                required
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={loading || uploading || !rawText}>
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
