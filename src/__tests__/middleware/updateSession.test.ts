import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock createServerClient from @supabase/ssr
const mockGetUser = vi.fn();

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
  })),
}));

// Mock NextResponse to avoid real header validation
const mockRedirect = vi.fn();
const mockNext = vi.fn();

vi.mock("next/server", async (importOriginal) => {
  const mod = await importOriginal<typeof import("next/server")>();
  return {
    ...mod,
    NextResponse: {
      next: (...args: unknown[]) => {
        mockNext(...args);
        return { status: 200, headers: new Headers() };
      },
      redirect: (url: URL) => {
        mockRedirect(url);
        return {
          status: 307,
          headers: new Headers({ location: url.toString() }),
        };
      },
    },
  };
});

// Set required env vars
vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");

const { updateSession } = await import("@/lib/supabase/middleware");

function makeRequest(pathname: string) {
  const url = new URL(`http://localhost:3000${pathname}`);
  const nextUrl = Object.assign(url, {
    clone: () => new URL(url.toString()),
  });
  return {
    nextUrl,
    cookies: {
      getAll: () => [],
      set: vi.fn(),
    },
  } as unknown as import("next/server").NextRequest;
}

describe("updateSession middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects unauthenticated user to /login", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const res = await updateSession(makeRequest("/"));

    expect(res.status).toBe(307);
    const redirectUrl = mockRedirect.mock.calls[0][0] as URL;
    expect(redirectUrl.pathname).toBe("/login");
  });

  it("redirects unauthenticated user from deep path to /login", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const res = await updateSession(makeRequest("/some/deep/path"));

    expect(res.status).toBe(307);
    const redirectUrl = mockRedirect.mock.calls[0][0] as URL;
    expect(redirectUrl.pathname).toBe("/login");
  });

  it("does NOT redirect unauthenticated user on /login", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const res = await updateSession(makeRequest("/login"));

    expect(res.status).toBe(200);
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("does NOT redirect unauthenticated user on /auth/callback", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const res = await updateSession(makeRequest("/auth/callback"));

    expect(res.status).toBe(200);
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("does NOT redirect unauthenticated user on API routes", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const res = await updateSession(makeRequest("/api/generate"));

    expect(res.status).toBe(200);
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("passes through for authenticated user", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });

    const res = await updateSession(makeRequest("/"));

    expect(res.status).toBe(200);
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("passes through for authenticated user on any path", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });

    const res = await updateSession(makeRequest("/some/deep/path"));

    expect(res.status).toBe(200);
    expect(mockRedirect).not.toHaveBeenCalled();
  });
});
