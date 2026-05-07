import { SupabaseClient } from "@supabase/supabase-js";
import { refreshAccessToken, jiraApiUrl } from "@/lib/atlassian";

interface AtlassianProfile {
  atlassian_access_token: string | null;
  atlassian_refresh_token: string | null;
  atlassian_token_expires_at: string | null;
  atlassian_cloud_id: string | null;
  atlassian_site_url: string | null;
}

export async function getJiraAuth(supabase: SupabaseClient, userId: string) {
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "atlassian_access_token, atlassian_refresh_token, atlassian_token_expires_at, atlassian_cloud_id, atlassian_site_url"
    )
    .eq("id", userId)
    .single();

  if (!profile?.atlassian_access_token || !profile?.atlassian_cloud_id) {
    return null;
  }

  const p = profile as AtlassianProfile;
  let accessToken = p.atlassian_access_token!;

  // Check if token is expired or about to expire (5 min buffer)
  const expiresAt = p.atlassian_token_expires_at
    ? new Date(p.atlassian_token_expires_at).getTime()
    : 0;
  const isExpired = Date.now() > expiresAt - 5 * 60 * 1000;

  if (isExpired && p.atlassian_refresh_token) {
    try {
      const tokens = await refreshAccessToken(p.atlassian_refresh_token);
      accessToken = tokens.access_token;

      // Update tokens in DB
      await supabase
        .from("profiles")
        .update({
          atlassian_access_token: tokens.access_token,
          atlassian_refresh_token: tokens.refresh_token,
          atlassian_token_expires_at: new Date(
            Date.now() + tokens.expires_in * 1000
          ).toISOString(),
        })
        .eq("id", userId);
    } catch {
      return null; // Refresh failed — user needs to re-authorize
    }
  }

  return {
    accessToken,
    cloudId: p.atlassian_cloud_id!,
    siteUrl: p.atlassian_site_url || "",
    jiraUrl: (path: string) => jiraApiUrl(p.atlassian_cloud_id!, path),
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  };
}
