import { describe, it, expect } from "vitest";
import { buildJiraPayload } from "@/lib/jira";
import type { GeneratedStory } from "@/lib/types";

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
    flagged_gaps: [],
    jira_issue_key: null,
    jira_sync_status: "not_synced",
    jira_synced_at: null,
    is_edited: false,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("buildJiraPayload", () => {
  it("builds correct payload with all fields", () => {
    const story = makeStory();
    const payload = buildJiraPayload(story, "SCRUM", "customfield_10016");
    const fields = payload.fields as Record<string, unknown>;

    expect(fields.project).toEqual({ key: "SCRUM" });
    expect(fields.summary).toBe("Login Feature");
    expect(fields.issuetype).toEqual({ name: "Story" });
    expect(fields.priority).toEqual({ name: "High" });
    expect(fields.labels).toEqual(["auth", "frontend"]);
    expect(fields.customfield_10016).toBe(5);
  });

  it("includes acceptance criteria in description", () => {
    const story = makeStory();
    const payload = buildJiraPayload(story, "SCRUM", "customfield_10016");
    const fields = payload.fields as Record<string, unknown>;
    const desc = fields.description as { content: { content: { text: string }[] }[] };
    const text = desc.content[0].content[0].text;

    expect(text).toContain("As a registered user");
    expect(text).toContain("I want log in with email and password");
    expect(text).toContain("so that I can access my account");
    expect(text).toContain("Given valid credentials");
    expect(text).toContain("When I submit the form");
    expect(text).toContain("Then I am logged in");
  });

  it("handles string acceptance_criteria (from DB)", () => {
    const story = makeStory({
      acceptance_criteria: JSON.stringify([
        { given: "a", when: "b", then: "c" },
      ]) as unknown as GeneratedStory["acceptance_criteria"],
    });
    const payload = buildJiraPayload(story, "SCRUM", "customfield_10016");
    const fields = payload.fields as Record<string, unknown>;
    const desc = fields.description as { content: { content: { text: string }[] }[] };
    const text = desc.content[0].content[0].text;

    expect(text).toContain("Given a");
    expect(text).toContain("When b");
    expect(text).toContain("Then c");
  });

  it("omits priority if null", () => {
    const story = makeStory({ priority: null });
    const payload = buildJiraPayload(story, "SCRUM", "customfield_10016");
    const fields = payload.fields as Record<string, unknown>;

    expect(fields.priority).toBeUndefined();
  });

  it("omits story_points if null", () => {
    const story = makeStory({ story_points: null });
    const payload = buildJiraPayload(story, "SCRUM", "customfield_10016");
    const fields = payload.fields as Record<string, unknown>;

    expect(fields.customfield_10016).toBeUndefined();
  });

  it("omits labels if empty", () => {
    const story = makeStory({ labels: [] });
    const payload = buildJiraPayload(story, "SCRUM", "customfield_10016");
    const fields = payload.fields as Record<string, unknown>;

    expect(fields.labels).toBeUndefined();
  });

  it("maps all priority values correctly", () => {
    const priorities = ["highest", "high", "medium", "low", "lowest"] as const;
    const expected = ["Highest", "High", "Medium", "Low", "Lowest"];

    priorities.forEach((p, i) => {
      const story = makeStory({ priority: p });
      const payload = buildJiraPayload(story, "SCRUM", "cf");
      const fields = payload.fields as Record<string, unknown>;
      expect((fields.priority as { name: string }).name).toBe(expected[i]);
    });
  });

  it("uses custom story points field ID", () => {
    const story = makeStory({ story_points: 8 });
    const payload = buildJiraPayload(story, "SCRUM", "customfield_99999");
    const fields = payload.fields as Record<string, unknown>;

    expect(fields.customfield_99999).toBe(8);
    expect(fields.customfield_10016).toBeUndefined();
  });
});
