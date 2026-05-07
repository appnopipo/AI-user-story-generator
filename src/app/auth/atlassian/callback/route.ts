import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  exchangeCodeForTokens,
  getAccessibleResources,
} from "@/lib/atlassian";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    console.error("Atlassian OAuth error:", error);
    return NextResponse.redirect(`${origin}/?atlassian_error=auth_failed`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/login`);
  }

  try {
    const redirectUri = `${origin}/auth/atlassian/callback`;

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code, redirectUri);

    // Discover accessible Jira sites
    const resources = await getAccessibleResources(tokens.access_token);

    if (resources.length === 0) {
      return NextResponse.redirect(
        `${origin}/?atlassian_error=no_sites`
      );
    }

    // Use the first available site (most users have only one)
    const site = resources[0];

    // Save to profile
    await supabase
      .from("profiles")
      .update({
        atlassian_access_token: tokens.access_token,
        atlassian_refresh_token: tokens.refresh_token,
        atlassian_token_expires_at: new Date(
          Date.now() + tokens.expires_in * 1000
        ).toISOString(),
        atlassian_cloud_id: site.id,
        atlassian_site_url: site.url,
      })
      .eq("id", user.id);

    return NextResponse.redirect(`${origin}/?atlassian_connected=true`);
  } catch (err) {
    console.error("Atlassian OAuth callback error:", err);
    return NextResponse.redirect(`${origin}/?atlassian_error=token_failed`);
  }
}
