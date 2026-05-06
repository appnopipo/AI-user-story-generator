"use client";

import { useState, useRef } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { AcceptanceCriterion } from "@/lib/types";
import { toArray } from "@/lib/parse";

export interface EditableStoryData {
  id: string;
  title: string;
  persona: string;
  action: string;
  benefit: string;
  acceptance_criteria: AcceptanceCriterion[];
  priority: string;
  story_points: number | null;
  labels: string[];
  issue_type: string;
  notes: string;
  attachments: File[];
  source_excerpt: string | null;
  confidence: number;
  flagged_gaps: string[];
}

interface EditableStoryCardProps {
  story: EditableStoryData;
  issueTypes: { id: string; name: string }[];
  selected: boolean;
  onToggleSelect: () => void;
  onChange: (updated: EditableStoryData) => void;
}

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

export function EditableStoryCard({
  story,
  issueTypes,
  selected,
  onToggleSelect,
  onChange,
}: EditableStoryCardProps) {
  const [expanded, setExpanded] = useState(false);
  const flaggedGaps = toArray<string>(story.flagged_gaps);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function update(patch: Partial<EditableStoryData>) {
    onChange({ ...story, ...patch });
  }

  function handleFileAdd(files: FileList | null) {
    if (!files) return;
    const newFiles = [...story.attachments, ...Array.from(files)];
    update({ attachments: newFiles });
  }

  function removeAttachment(index: number) {
    const updated = story.attachments.filter((_, i) => i !== index);
    update({ attachments: updated });
  }

  function updateCriterion(
    index: number,
    field: keyof AcceptanceCriterion,
    value: string
  ) {
    const updated = [...story.acceptance_criteria];
    updated[index] = { ...updated[index], [field]: value };
    update({ acceptance_criteria: updated });
  }

  return (
    <Card className={selected ? "ring-2 ring-primary" : "opacity-60"}>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            className="mt-1.5 h-4 w-4 shrink-0"
          />
          <div className="flex-1 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <Input
                value={story.title}
                onChange={(e) => update({ title: e.target.value })}
                className="text-base font-semibold"
              />
              <ConfidenceBar confidence={story.confidence} />
            </div>
            <div className="flex items-center gap-2">
              <select
                value={story.issue_type}
                onChange={(e) => update({ issue_type: e.target.value })}
                className="rounded-md border border-input bg-background px-2 py-1 text-sm"
              >
                {issueTypes.map((t) => (
                  <option key={t.id} value={t.name}>
                    {t.name}
                  </option>
                ))}
                {!issueTypes.find((t) => t.name === story.issue_type) && (
                  <option value={story.issue_type}>{story.issue_type}</option>
                )}
              </select>
              <select
                value={story.priority}
                onChange={(e) => update({ priority: e.target.value })}
                className="rounded-md border border-input bg-background px-2 py-1 text-sm"
              >
                <option value="highest">Highest</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
                <option value="lowest">Lowest</option>
              </select>
              <Input
                type="number"
                value={story.story_points ?? ""}
                onChange={(e) =>
                  update({
                    story_points: e.target.value
                      ? parseInt(e.target.value)
                      : null,
                  })
                }
                placeholder="SP"
                className="w-16"
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pl-10 text-sm">
        {/* User story fields */}
        <div className="grid grid-cols-[auto_1fr] items-center gap-x-2 gap-y-1">
          <span className="text-muted-foreground">As a</span>
          <Input
            value={story.persona}
            onChange={(e) => update({ persona: e.target.value })}
            className="h-8"
          />
          <span className="text-muted-foreground">I want</span>
          <Input
            value={story.action}
            onChange={(e) => update({ action: e.target.value })}
            className="h-8"
          />
          <span className="text-muted-foreground">So that</span>
          <Input
            value={story.benefit}
            onChange={(e) => update({ benefit: e.target.value })}
            className="h-8"
          />
        </div>

        {/* Labels */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Labels:</span>
          <Input
            value={story.labels.join(", ")}
            onChange={(e) =>
              update({
                labels: e.target.value
                  .split(",")
                  .map((l) => l.trim())
                  .filter(Boolean),
              })
            }
            placeholder="comma-separated labels"
            className="h-7 text-xs"
          />
        </div>

        {/* Notes */}
        <div className="flex items-start gap-2">
          <span className="mt-1.5 text-xs text-muted-foreground">Notes:</span>
          <Textarea
            value={story.notes}
            onChange={(e) => update({ notes: e.target.value })}
            placeholder="Add links, context, or any extra info (e.g. Figma link)"
            className="min-h-[32px] text-xs"
            rows={1}
          />
        </div>

        {/* Attachments */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Attachments:</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleFileAdd(e.target.files)}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="rounded-md border border-dashed border-border px-2 py-0.5 text-xs text-muted-foreground hover:border-foreground hover:text-foreground"
            >
              + Add images
            </button>
          </div>
          {story.attachments.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {story.attachments.map((file, i) => (
                <div
                  key={`${file.name}-${i}`}
                  className="group relative h-16 w-16 overflow-hidden rounded-md border border-border"
                >
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="h-full w-full object-cover"
                  />
                  <button
                    onClick={() => removeAttachment(i)}
                    className="absolute inset-0 flex items-center justify-center bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Expandable section */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className="h-6 px-2 text-xs"
        >
          {expanded ? "Hide details" : "Show details"}
        </Button>

        {expanded && (
          <>
            {/* Acceptance Criteria */}
            {story.acceptance_criteria.length > 0 && (
              <div className="space-y-2">
                <Separator />
                <p className="text-xs font-medium">Acceptance Criteria:</p>
                {story.acceptance_criteria.map((ac, i) => (
                  <div key={i} className="grid grid-cols-[auto_1fr] items-center gap-x-2 gap-y-1 pl-2">
                    <span className="text-xs text-muted-foreground">Given</span>
                    <Textarea
                      value={ac.given}
                      onChange={(e) => updateCriterion(i, "given", e.target.value)}
                      className="min-h-[32px] text-xs"
                      rows={1}
                    />
                    <span className="text-xs text-muted-foreground">When</span>
                    <Textarea
                      value={ac.when}
                      onChange={(e) => updateCriterion(i, "when", e.target.value)}
                      className="min-h-[32px] text-xs"
                      rows={1}
                    />
                    <span className="text-xs text-muted-foreground">Then</span>
                    <Textarea
                      value={ac.then}
                      onChange={(e) => updateCriterion(i, "then", e.target.value)}
                      className="min-h-[32px] text-xs"
                      rows={1}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Flagged Gaps */}
            {flaggedGaps.length > 0 && (
              <div className="rounded-md bg-yellow-50 p-2 text-xs text-yellow-800">
                <p className="font-medium">Missing information:</p>
                <ul className="ml-4 list-disc">
                  {flaggedGaps.map((gap, i) => (
                    <li key={i}>{gap}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Source excerpt */}
            {story.source_excerpt && (
              <div className="rounded-md bg-muted p-2 text-xs">
                <p className="font-medium text-muted-foreground">Source:</p>
                <p className="italic">&ldquo;{story.source_excerpt}&rdquo;</p>
              </div>
            )}
          </>
        )}

        {/* Synced indicator */}
        {(story as EditableStoryData & { jira_issue_key?: string }).jira_issue_key && (
          <Badge variant="secondary" className="text-xs">
            Synced: {(story as EditableStoryData & { jira_issue_key?: string }).jira_issue_key}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}
