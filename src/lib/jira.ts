import type { GeneratedStory, AcceptanceCriterion } from "@/lib/types";

export function buildJiraPayload(
  story: GeneratedStory,
  projectKey: string,
  storyPointsFieldId: string
) {
  const ac = Array.isArray(story.acceptance_criteria)
    ? story.acceptance_criteria
    : typeof story.acceptance_criteria === "string"
      ? JSON.parse(story.acceptance_criteria)
      : [];

  const acText = ac
    .map(
      (c: AcceptanceCriterion, i: number) =>
        `AC${i + 1}: Given ${c.given}, When ${c.when}, Then ${c.then}`
    )
    .join("\n");

  const description = `As a ${story.persona}, I want ${story.action}, so that ${story.benefit}.\n\n*Acceptance Criteria:*\n${acText}`;

  const priorityMap: Record<string, string> = {
    highest: "Highest",
    high: "High",
    medium: "Medium",
    low: "Low",
    lowest: "Lowest",
  };

  const payload: Record<string, unknown> = {
    fields: {
      project: { key: projectKey },
      summary: story.title,
      description: {
        type: "doc",
        version: 1,
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: description }],
          },
        ],
      },
      issuetype: { name: "Story" },
      ...(story.priority && {
        priority: { name: priorityMap[story.priority] || "Medium" },
      }),
      ...(story.labels?.length && {
        labels: Array.isArray(story.labels) ? story.labels : [],
      }),
      ...(story.story_points && {
        [storyPointsFieldId]: story.story_points,
      }),
    },
  };

  return payload;
}
