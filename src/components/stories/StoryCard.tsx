import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { GeneratedStory } from "@/lib/types";

function ConfidenceBar({ confidence }: { confidence: number }) {
  const color =
    confidence >= 0.8
      ? "bg-green-500"
      : confidence >= 0.6
        ? "bg-yellow-500"
        : "bg-red-500";

  return (
    <div className="flex items-center gap-2 text-xs">
      <div className="h-2 w-16 rounded-full bg-muted">
        <div
          className={`h-2 rounded-full ${color}`}
          style={{ width: `${confidence * 100}%` }}
        />
      </div>
      <span className="text-muted-foreground">
        {Math.round(confidence * 100)}%
      </span>
    </div>
  );
}

export function StoryCard({
  story,
  projectId,
}: {
  story: GeneratedStory;
  projectId: string;
}) {
  const reviewColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
    changes_requested: "bg-orange-100 text-orange-800",
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base">{story.title}</CardTitle>
          <div className="flex items-center gap-2">
            <ConfidenceBar confidence={story.confidence} />
            <Badge className={reviewColors[story.review_status] || ""}>
              {story.review_status}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="italic text-muted-foreground">
          As a <strong>{story.persona}</strong>, I want{" "}
          <strong>{story.action}</strong>, so that{" "}
          <strong>{story.benefit}</strong>.
        </p>

        {story.acceptance_criteria.length > 0 && (
          <>
            <Separator />
            <div>
              <p className="mb-1 font-medium">Acceptance Criteria:</p>
              <ul className="space-y-1">
                {story.acceptance_criteria.map((ac, i) => (
                  <li key={i} className="text-muted-foreground">
                    <span className="font-medium">Given</span> {ac.given},{" "}
                    <span className="font-medium">When</span> {ac.when},{" "}
                    <span className="font-medium">Then</span> {ac.then}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        <div className="flex flex-wrap gap-2">
          {story.priority && (
            <Badge variant="outline">{story.priority}</Badge>
          )}
          {story.story_points && (
            <Badge variant="outline">{story.story_points} pts</Badge>
          )}
          {story.labels.map((label) => (
            <Badge key={label} variant="secondary">
              {label}
            </Badge>
          ))}
        </div>

        {story.flagged_gaps.length > 0 && (
          <div className="rounded-md bg-yellow-50 p-2 text-xs text-yellow-800">
            <p className="font-medium">Missing information:</p>
            <ul className="ml-4 list-disc">
              {story.flagged_gaps.map((gap, i) => (
                <li key={i}>{gap}</li>
              ))}
            </ul>
          </div>
        )}

        {story.source_excerpt && (
          <div className="rounded-md bg-muted p-2 text-xs">
            <p className="font-medium text-muted-foreground">Source:</p>
            <p className="italic">&ldquo;{story.source_excerpt}&rdquo;</p>
          </div>
        )}

        {story.jira_issue_key && (
          <Badge variant="outline" className="text-blue-600">
            {story.jira_issue_key}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}
