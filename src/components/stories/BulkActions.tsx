"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function BulkActions({
  selectedIds,
  onClearSelection,
}: {
  selectedIds: string[];
  onClearSelection: () => void;
}) {
  const [loading, setLoading] = useState<string | null>(null);
  const router = useRouter();

  async function bulkReview(status: string) {
    setLoading(status);
    await Promise.all(
      selectedIds.map((id) =>
        fetch(`/api/stories/${id}/review`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ review_status: status }),
        })
      )
    );
    setLoading(null);
    onClearSelection();
    router.refresh();
  }

  async function bulkPushJira() {
    setLoading("jira");
    await Promise.all(
      selectedIds.map((id) =>
        fetch(`/api/stories/${id}/jira`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dry_run: false }),
        })
      )
    );
    setLoading(null);
    onClearSelection();
    router.refresh();
  }

  if (selectedIds.length === 0) return null;

  return (
    <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-3">
      <span className="text-sm font-medium">
        {selectedIds.length} selected
      </span>
      <Button
        size="sm"
        disabled={loading !== null}
        onClick={() => bulkReview("approved")}
      >
        {loading === "approved" ? "..." : "Approve All"}
      </Button>
      <Button
        size="sm"
        variant="destructive"
        disabled={loading !== null}
        onClick={() => bulkReview("rejected")}
      >
        {loading === "rejected" ? "..." : "Reject All"}
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={loading !== null}
        onClick={bulkPushJira}
      >
        {loading === "jira" ? "..." : "Push All to Jira"}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        disabled={loading !== null}
        onClick={onClearSelection}
      >
        Clear
      </Button>
    </div>
  );
}
