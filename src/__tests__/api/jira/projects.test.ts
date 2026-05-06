import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabase server client
const mockGetUser = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: () => ({ select: mockSelect }),
  })),
}));

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Import after mocks are set up
const { GET } = await import("@/app/api/jira/projects/route");

const PROFILE_WITH_JIRA = {
  jira_base_url: "https://test.atlassian.net",
  jira_email: "user@test.com",
  jira_api_token: "token-123",
};

function setupSupabaseMocks(user: unknown, profile: unknown) {
  mockGetUser.mockResolvedValue({ data: { user } });
  mockSelect.mockReturnValue({ eq: mockEq });
  mockEq.mockReturnValue({ single: mockSingle });
  mockSingle.mockResolvedValue({ data: profile });
}

describe("GET /api/jira/projects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 if user is not authenticated", async () => {
    setupSupabaseMocks(null, null);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 400 if Jira credentials are missing", async () => {
    setupSupabaseMocks({ id: "user-1" }, { jira_base_url: null, jira_email: null, jira_api_token: null });

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Jira credentials not configured");
  });

  it("returns 400 if only partial credentials exist", async () => {
    setupSupabaseMocks(
      { id: "user-1" },
      { jira_base_url: "https://test.atlassian.net", jira_email: null, jira_api_token: null }
    );

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Jira credentials not configured");
  });

  it("forwards Jira API error", async () => {
    setupSupabaseMocks({ id: "user-1" }, PROFILE_WITH_JIRA);

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
    setupSupabaseMocks({ id: "user-1" }, PROFILE_WITH_JIRA);

    // Mock /rest/api/3/project
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { id: "10001", key: "PROJ", name: "My Project" },
        { id: "10002", key: "DEV", name: "Dev Project" },
      ],
    });

    // Mock /rest/api/3/project/PROJ/statuses
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { id: "1", name: "Story" },
        { id: "2", name: "Bug" },
      ],
    });

    // Mock /rest/api/3/project/DEV/statuses
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { id: "1", name: "Task" },
      ],
    });

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.projects).toHaveLength(2);
    expect(body.projects[0]).toEqual({
      id: "10001",
      key: "PROJ",
      name: "My Project",
      issueTypes: [
        { id: "1", name: "Story" },
        { id: "2", name: "Bug" },
      ],
    });
    expect(body.projects[1]).toEqual({
      id: "10002",
      key: "DEV",
      name: "Dev Project",
      issueTypes: [{ id: "1", name: "Task" }],
    });
  });

  it("returns empty issue types if statuses endpoint fails", async () => {
    setupSupabaseMocks({ id: "user-1" }, PROFILE_WITH_JIRA);

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

  it("sends correct auth header to Jira", async () => {
    setupSupabaseMocks({ id: "user-1" }, PROFILE_WITH_JIRA);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    await GET();

    const expectedAuth = Buffer.from("user@test.com:token-123").toString("base64");
    expect(mockFetch).toHaveBeenCalledWith(
      "https://test.atlassian.net/rest/api/3/project",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `Basic ${expectedAuth}`,
        }),
      })
    );
  });
});
