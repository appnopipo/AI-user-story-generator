"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function ReviewActions({
  storyId,
  currentStatus,
}: {
  storyId: string;
  currentStatus: string;
}) {
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const router = useRouter();

  async function submitReview(status: string) {
    setLoading(status);
    await fetch(`/api/stories/${storyId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        review_status: status,
        review_comment: comment || null,
      }),
    });
    setLoading(null);
    setShowComment(false);
    setComment("");
    router.refresh();
  }

  if (currentStatus === "approved") {
    return (
      <p className="text-xs text-green-600 font-medium">Approved</p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="default"
          disabled={loading !== null}
          onClick={() => submitReview("approved")}
        >
          {loading === "approved" ? "..." : "Approve"}
        </Button>
        <Button
          size="sm"
          variant="destructive"
          disabled={loading !== null}
          onClick={() => submitReview("rejected")}
        >
          {loading === "rejected" ? "..." : "Reject"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={loading !== null}
          onClick={() => setShowComment(!showComment)}
        >
          Request Changes
        </Button>
      </div>
      {showComment && (
        <div className="space-y-2">
          <Textarea
            placeholder="What needs to change?"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
          />
          <Button
            size="sm"
            variant="outline"
            disabled={loading !== null || !comment}
            onClick={() => submitReview("changes_requested")}
          >
            {loading === "changes_requested" ? "..." : "Submit"}
          </Button>
        </div>
      )}
    </div>
  );
}
