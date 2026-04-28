import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { StoryCard } from "@/components/stories/StoryCard";
import type { GeneratedStory } from "@/lib/types";

vi.mock("@/components/stories/ReviewActions", () => ({
  ReviewActions: ({ storyId }: { storyId: string }) => (
    <div data-testid="review-actions">{storyId}</div>
  ),
}));

vi.mock("@/components/stories/JiraPushButton", () => ({
  JiraPushButton: () => <div data-testid="jira-push" />,
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  CardHeader: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  CardTitle: ({ children }: React.PropsWithChildren) => <h3>{children}</h3>,
  CardContent: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: React.PropsWithChildren) => <span>{children}</span>,
}));

vi.mock("@/components/ui/separator", () => ({
  Separator: () => <hr />,
}));

function makeStory(overrides: Partial<GeneratedStory> = {}): GeneratedStory {
  return {
    id: "story-1",
    input_id: "input-1",
    project_id: "project-1",
    title: "Login Feature",
    persona: "registered user",
    action: "log in with email and password",
    benefit: "I can access my account",
    acceptance_criteria: [
      { given: "valid credentials", when: "I submit the form", then: "I am logged in" },
    ],
    priority: "high",
    story_points: 5,
    labels: ["auth", "frontend"],
    source_excerpt: "Users should be able to log in",
    confidence: 0.9,
    flagged_gaps: ["No error handling specified"],
    review_status: "pending",
    reviewer_id: null,
    review_comment: null,
    reviewed_at: null,
    jira_issue_key: null,
    jira_sync_status: "not_synced",
    jira_dry_run_payload: null,
    jira_synced_at: null,
    is_edited: false,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("StoryCard", () => {
  it("renders story title and user story format", async () => {
    await act(async () => {
      render(<StoryCard story={makeStory()} projectId="p1" />);
    });
    expect(screen.getByText("Login Feature")).toBeInTheDocument();
    expect(screen.getByText("registered user")).toBeInTheDocument();
    expect(screen.getByText("log in with email and password")).toBeInTheDocument();
    expect(screen.getByText("I can access my account")).toBeInTheDocument();
  });

  it("renders acceptance criteria, metadata, and badges", async () => {
    await act(async () => {
      render(<StoryCard story={makeStory()} projectId="p1" />);
    });
    expect(screen.getByText(/valid credentials/)).toBeInTheDocument();
    expect(screen.getByText("high")).toBeInTheDocument();
    expect(screen.getByText("5 pts")).toBeInTheDocument();
    expect(screen.getByText("auth")).toBeInTheDocument();
    expect(screen.getByText("frontend")).toBeInTheDocument();
    expect(screen.getByText("90%")).toBeInTheDocument();
    expect(screen.getByText("pending")).toBeInTheDocument();
  });

  it("renders flagged gaps and source excerpt", async () => {
    await act(async () => {
      render(<StoryCard story={makeStory()} projectId="p1" />);
    });
    expect(screen.getByText("No error handling specified")).toBeInTheDocument();
    expect(screen.getByText(/Users should be able to log in/)).toBeInTheDocument();
  });

  it("renders review actions and jira push", async () => {
    await act(async () => {
      render(<StoryCard story={makeStory()} projectId="p1" />);
    });
    expect(screen.getByTestId("review-actions")).toBeInTheDocument();
    expect(screen.getByTestId("jira-push")).toBeInTheDocument();
  });

  it("hides optional sections when empty", async () => {
    await act(async () => {
      render(
        <StoryCard
          story={makeStory({
            acceptance_criteria: [],
            flagged_gaps: [],
            source_excerpt: null,
          })}
          projectId="p1"
        />
      );
    });
    expect(screen.queryByText("Acceptance Criteria:")).not.toBeInTheDocument();
    expect(screen.queryByText("Missing information:")).not.toBeInTheDocument();
    expect(screen.queryByText("Source:")).not.toBeInTheDocument();
  });
});
