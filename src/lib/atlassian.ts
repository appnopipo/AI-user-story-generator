const ATLASSIAN_AUTH_URL = "https://auth.atlassian.com/authorize";
const ATLASSIAN_TOKEN_URL = "https://auth.atlassian.com/oauth/token";
const ATLASSIAN_API_BASE = "https://api.atlassian.com";

const SCOPES = [
  "read:jira-work",
  "write:jira-work",
  "offline_access",
].join(" ");

export function getAtlassianAuthUrl(redirectUri: string) {
  const params = new URLSearchParams({
    audience: "api.atlassian.com",
    client_id: process.env.NEXT_PUBLIC_ATLASSIAN_CLIENT_ID!,
    scope: SCOPES,
    redirect_uri: redirectUri,
    response_type: "code",
    prompt: "consent",
  });
  return `${ATLASSIAN_AUTH_URL}?${params.toString()}`;
}

export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string
) {
  const res = await fetch(ATLASSIAN_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: process.env.ATLASSIAN_CLIENT_ID,
      client_secret: process.env.ATLASSIAN_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token exchange failed: ${err}`);
  }

  return res.json() as Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    scope: string;
  }>;
}

export async function refreshAccessToken(refreshToken: string) {
  const res = await fetch(ATLASSIAN_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "refresh_token",
      client_id: process.env.ATLASSIAN_CLIENT_ID,
      client_secret: process.env.ATLASSIAN_CLIENT_SECRET,
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token refresh failed: ${err}`);
  }

  return res.json() as Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }>;
}

export async function getAccessibleResources(accessToken: string) {
  const res = await fetch(
    `${ATLASSIAN_API_BASE}/oauth/token/accessible-resources`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) {
    throw new Error("Failed to fetch accessible resources");
  }

  return res.json() as Promise<
    { id: string; url: string; name: string; scopes: string[] }[]
  >;
}

export function jiraApiUrl(cloudId: string, path: string) {
  return `${ATLASSIAN_API_BASE}/ex/jira/${cloudId}/rest/api/3${path}`;
}
