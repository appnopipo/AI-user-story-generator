"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  const [jiraBaseUrl, setJiraBaseUrl] = useState("");
  const [jiraEmail, setJiraEmail] = useState("");
  const [jiraApiToken, setJiraApiToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("jira_base_url, jira_email, jira_api_token")
        .eq("id", user.id)
        .single();

      if (data) {
        setJiraBaseUrl(data.jira_base_url || "");
        setJiraEmail(data.jira_email || "");
        setJiraApiToken(data.jira_api_token || "");
      }
    }
    loadProfile();
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setSaved(false);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({
        jira_base_url: jiraBaseUrl || null,
        jira_email: jiraEmail || null,
        jira_api_token: jiraApiToken || null,
      })
      .eq("id", user.id);

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    setSaved(true);
  }

  return (
    <div className="mx-auto max-w-lg p-8">
      <div className="mb-4">
        <button
          onClick={() => router.back()}
          className="text-sm text-muted-foreground hover:underline"
        >
          &larr; Back
        </button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Jira Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="jiraBaseUrl">Jira Base URL</Label>
              <Input
                id="jiraBaseUrl"
                value={jiraBaseUrl}
                onChange={(e) => setJiraBaseUrl(e.target.value)}
                placeholder="https://yourteam.atlassian.net"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="jiraEmail">Jira Email</Label>
              <Input
                id="jiraEmail"
                type="email"
                value={jiraEmail}
                onChange={(e) => setJiraEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="jiraApiToken">Jira API Token</Label>
              <Input
                id="jiraApiToken"
                type="password"
                value={jiraApiToken}
                onChange={(e) => setJiraApiToken(e.target.value)}
                placeholder="Your API token"
              />
            </div>
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Save"}
              </Button>
              {saved && (
                <span className="text-sm text-green-600">Saved!</span>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
