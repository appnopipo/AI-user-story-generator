import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock jira-auth helper
const mockGetJiraAuth = vi.fn();
vi.mock("@/lib/jira-auth", () => ({
  getJiraAuth: (...args: unknown[]) => mockGetJiraAuth(...args),
}));

// Mock supabase server client
const mockGetUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const { GET } = await import("@/app/api/jira/projects/route");

const JIRA_AUTH = {
  accessToken: "oauth-token-123",
  cloudId: "cloud-123",
  siteUrl: "https://test.atlassian.net",
  jiraUrl: (path: string) =>
    `https://api.atlassian.com/ex/jira/cloud-123/rest/api/3${path}`,
  headers: {
    Authorization: "Bearer oauth-token-123",
    "Content-Type": "application/json",
  },
};

describe("GET /api/jira/projects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 if user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 400 if Jira is not connected", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockGetJiraAuth.mockResolvedValue(null);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Jira not connected");
  });

  it("forwards Jira API error", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockGetJiraAuth.mockResolvedValue(JIRA_AUTH);

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      text: async () => "Forbidden",
    });

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toContain("Jira API error");
  });

  it("returns projects with issue types on success", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockGetJiraAuth.mockResolvedValue(JIRA_AUTH);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { id: "10001", key: "PROJ", name: "My Project" },
        { id: "10002", key: "DEV", name: "Dev Project" },
      ],
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { id: "1", name: "Story" },
        { id: "2", name: "Bug" },
      ],
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: "1", name: "Task" }],
    });

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.projects).toHaveLength(2);
    expect(body.site_url).toBe("https://test.atlassian.net");
    expect(body.projects[0]).toEqual({
      id: "10001",
      key: "PROJ",
      name: "My Project",
      issueTypes: [
        { id: "1", name: "Story" },
        { id: "2", name: "Bug" },
      ],
    });
  });

  it("returns empty issue types if statuses endpoint fails", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockGetJiraAuth.mockResolvedValue(JIRA_AUTH);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: "10001", key: "PROJ", name: "My Project" }],
    });

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => "Internal error",
    });

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.projects[0].issueTypes).toEqual([]);
  });

  it("uses OAuth bearer token for Jira requests", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockGetJiraAuth.mockResolvedValue(JIRA_AUTH);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    await GET();

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.atlassian.com/ex/jira/cloud-123/rest/api/3/project",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer oauth-token-123",
        }),
      })
    );
  });
});
