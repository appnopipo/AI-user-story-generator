"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function JiraPushButton({
  storyId,
  reviewStatus,
  syncStatus,
  issueKey,
}: {
  storyId: string;
  reviewStatus: string;
  syncStatus: string;
  issueKey: string | null;
}) {
  const [loading, setLoading] = useState(false);
  const [dryRunPayload, setDryRunPayload] = useState<object | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  if (issueKey) {
    return (
      <p className="text-xs text-blue-600 font-medium">
        Synced: {issueKey}
      </p>
    );
  }

  if (reviewStatus !== "approved") {
    return (
      <p className="text-xs text-muted-foreground">
        Approve the story first to push to Jira
      </p>
    );
  }

  async function handleDryRun() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/stories/${storyId}/jira`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dry_run: true }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error);
      return;
    }

    setDryRunPayload(data.payload || data);
    setShowPreview(true);
  }

  async function handlePush() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/stories/${storyId}/jira`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dry_run: false }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error);
      return;
    }

    setShowPreview(false);
    router.refresh();
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={loading}
          onClick={handleDryRun}
        >
          {loading ? "..." : syncStatus === "dry_run" ? "Preview Again" : "Preview Jira Ticket"}
        </Button>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Jira Ticket Preview</DialogTitle>
          </DialogHeader>
          <pre className="rounded-md bg-muted p-4 text-xs overflow-x-auto">
            {JSON.stringify(dryRunPayload, null, 2)}
          </pre>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowPreview(false)}
            >
              Cancel
            </Button>
            <Button disabled={loading} onClick={handlePush}>
              {loading ? "Pushing..." : "Push to Jira"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
