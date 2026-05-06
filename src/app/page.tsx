"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  EditableStoryCard,
  type EditableStoryData,
} from "@/components/stories/EditableStoryCard";
import { toArray } from "@/lib/parse";
import type { GeneratedStory } from "@/lib/types";

// --- Logo ---

function Logo({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 1080 1080"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M349.34,202.71,455.1,308.47a27.66,27.66,0,0,0,19.55,8.09H735.79a27.65,27.65,0,0,1,27.65,27.65V605.35a27.66,27.66,0,0,0,8.09,19.55L877.29,730.66a27.64,27.64,0,0,0,39.1,0L1022.15,624.9a27.64,27.64,0,0,0,8.1-19.55V77.4a27.65,27.65,0,0,0-27.65-27.65H474.65a27.64,27.64,0,0,0-19.55,8.1L349.34,163.61A27.64,27.64,0,0,0,349.34,202.71Z"
        fill="#00e9c2"
      />
      <path
        d="M730.66,877.29,624.9,771.53a27.66,27.66,0,0,0-19.55-8.09H344.21a27.65,27.65,0,0,1-27.65-27.65V474.65a27.66,27.66,0,0,0-8.09-19.55L202.71,349.34a27.64,27.64,0,0,0-39.1,0L57.85,455.1a27.64,27.64,0,0,0-8.1,19.55v528a27.65,27.65,0,0,0,27.65,27.65h528a27.64,27.64,0,0,0,19.55-8.1L730.66,916.39A27.64,27.64,0,0,0,730.66,877.29Z"
        fill="#00e9c2"
      />
    </svg>
  );
}

// --- Footer ---

function Footer() {
  return (
    <footer className="border-t border-border/50 px-6 py-4">
      <div className="flex justify-end">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <Image
            src="/appnovation-wordmark.png"
            alt="Appnovation"
            width={140}
            height={20}
            className="h-5 w-auto opacity-60"
          />
          <span className="text-border">|</span>
          <span>
            Built by{" "}
            <a
              href="https://github.com/appnopipo"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 hover:text-foreground"
            >
              Pipo Bizelli
            </a>
          </span>
          <span className="text-border">|</span>
          <span>Powered by Claude Code</span>
          <span className="text-border">|</span>
          <a
            href="https://github.com/appnopipo/AI-user-story-generator"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4 hover:text-foreground"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}

// --- Settings gear icon ---

function GearIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

// --- Types ---

interface JiraProject {
  id: string;
  key: string;
  name: string;
  issueTypes: { id: string; name: string }[];
}

interface ChatMessage {
  role: "bot" | "user";
  text: string;
}

function storyToEditable(story: GeneratedStory): EditableStoryData {
  return {
    id: story.id,
    title: story.title,
    persona: story.persona,
    action: story.action,
    benefit: story.benefit,
    acceptance_criteria: toArray(story.acceptance_criteria),
    priority: story.priority || "medium",
    story_points: story.story_points,
    labels: toArray(story.labels),
    issue_type: "Story",
    notes: "",
    attachments: [],
    source_excerpt: story.source_excerpt,
    confidence: story.confidence,
    flagged_gaps: toArray(story.flagged_gaps),
  };
}

// --- Onboarding chat ---

function OnboardingChat({
  onComplete,
  onBack,
  mode = "setup",
}: {
  onComplete: () => void;
  onBack?: () => void;
  mode?: "setup" | "reconfigure";
}) {
  const supabase = createClient();
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [thinking, setThinking] = useState(true);
  const [saving, setSaving] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initRef = useRef(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  // Get initial greeting from LLM
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    async function init() {
      const initMessage =
        mode === "reconfigure"
          ? "I want to change my Jira settings."
          : "Hi, I want to set up my Jira connection.";

      const res = await fetch("/api/chat/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", text: initMessage }],
          mode,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages([{ role: "bot", text: data.message }]);
      } else {
        setMessages([
          {
            role: "bot",
            text: "Hi! Let's connect your Jira. What's your Jira base URL? (e.g. https://yourteam.atlassian.net)",
          },
        ]);
      }
      setThinking(false);
    }
    init();
  }, []);

  async function handleSubmit() {
    if (!inputValue.trim() || thinking || saving) return;

    const userMsg = inputValue.trim();
    const newMessages: ChatMessage[] = [
      ...messages,
      { role: "user", text: userMsg },
    ];
    setMessages(newMessages);
    setInputValue("");
    setThinking(true);

    // Send full conversation to LLM
    const res = await fetch("/api/chat/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: newMessages, mode }),
    });

    if (!res.ok) {
      setMessages([
        ...newMessages,
        { role: "bot", text: "Something went wrong. Please try again." },
      ]);
      setThinking(false);
      return;
    }

    const data = await res.json();
    setMessages([...newMessages, { role: "bot", text: data.message }]);
    setThinking(false);

    // If all credentials are collected, save and validate
    if (
      data.complete &&
      data.extracted?.jira_base_url &&
      data.extracted?.jira_email &&
      data.extracted?.jira_api_token
    ) {
      setSaving(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("profiles")
        .update({
          jira_base_url: data.extracted.jira_base_url,
          jira_email: data.extracted.jira_email,
          jira_api_token: data.extracted.jira_api_token,
        })
        .eq("id", user.id);

      if (error) {
        setMessages((prev) => [
          ...prev,
          {
            role: "bot",
            text: `Failed to save credentials: ${error.message}. Please try again.`,
          },
        ]);
        setSaving(false);
        return;
      }

      // Validate connection
      const validateRes = await fetch("/api/jira/projects");
      if (!validateRes.ok) {
        const errData = await validateRes.json();
        setMessages((prev) => [
          ...prev,
          {
            role: "bot",
            text: `Could not connect to Jira: ${errData.error || "unknown error"}. Please check your credentials and try again.`,
          },
        ]);
        setSaving(false);
        return;
      }

      setMessages((prev) => [
        ...prev,
        { role: "bot", text: "Connected! Loading your projects..." },
      ]);

      setSaving(false);
      setTimeout(onComplete, 800);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !thinking && !saving) {
      handleSubmit();
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border/50 px-6 py-4">
        <div className="flex items-center gap-3">
          <Logo />
          <h1 className="text-lg font-semibold">Ticket Generator</h1>
        </div>
        <div className="flex items-center gap-1">
          {onBack && (
            <button
              onClick={onBack}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              title="Back to app"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 12H5" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
            </button>
          )}
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/login";
            }}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title="Sign out"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </header>

      {/* Chat area centered */}
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-2xl">
          <div className="mb-6 space-y-4 max-h-[60vh] overflow-y-auto px-1">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/50"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {thinking && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-muted/50 px-4 py-3 text-sm">
                  <span className="inline-flex gap-1">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:0ms]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:150ms]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:300ms]" />
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input bar */}
          <div className="flex items-center gap-2 rounded-2xl border border-border/50 bg-card px-4 py-3">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your response..."
              disabled={thinking || saving}
              autoFocus
              className="border-0 bg-transparent shadow-none focus-visible:ring-0"
            />
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!inputValue.trim() || thinking || saving}
              className="shrink-0 rounded-xl"
            >
              Send
            </Button>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

// --- Main dashboard ---

export default function Dashboard() {
  const supabase = createClient();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Jira connection state
  const [jiraConfigured, setJiraConfigured] = useState<boolean | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Input state
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [filePath, setFilePath] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Jira projects
  const [jiraProjects, setJiraProjects] = useState<JiraProject[]>([]);
  const [selectedProjectKey, setSelectedProjectKey] = useState("");
  const [loadingProjects, setLoadingProjects] = useState(true);

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [inputId, setInputId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [botMessage, setBotMessage] = useState("");

  // Results state
  const [stories, setStories] = useState<EditableStoryData[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pushing, setPushing] = useState(false);
  const [pushResults, setPushResults] = useState<
    { storyId: string; issueKey?: string; error?: string }[]
  >([]);
  const [jiraBaseUrl, setJiraBaseUrl] = useState("");
  const [generationStep, setGenerationStep] = useState("");
  const [pushedTickets, setPushedTickets] = useState<
    { title: string; issueKey: string }[]
  >([]);
  const [duplicates, setDuplicates] = useState<
    {
      new_story_id: string;
      existing_ticket_key: string;
      existing_ticket_summary: string;
      reason: string;
    }[]
  >([]);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);

  useEffect(() => {
    async function init() {
      // Fetch Jira base URL from profile
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("jira_base_url")
          .eq("id", user.id)
          .single();
        if (profile?.jira_base_url) {
          setJiraBaseUrl(profile.jira_base_url);
        }
      }

      const res = await fetch("/api/jira/projects");
      if (res.ok) {
        const data = await res.json();
        setJiraProjects(data.projects || []);
        if (data.projects?.length > 0) {
          setSelectedProjectKey(data.projects[0].key);
        }
        setJiraConfigured(true);
      } else {
        setJiraConfigured(false);
      }
      setLoadingProjects(false);
    }
    init();
  }, []);

  useEffect(() => {
    if (!inputId) return;
    const channel = supabase
      .channel(`stories-${inputId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "generated_stories",
          filter: `input_id=eq.${inputId}`,
        },
        (payload) => {
          const newStory = storyToEditable(payload.new as GeneratedStory);
          setStories((prev) => {
            if (prev.some((s) => s.id === newStory.id)) return prev;
            const updated = [...prev, newStory];
            setGenerationStep(
              `Generating stories... (${updated.length} created)`,
            );
            return updated;
          });
          setSelectedIds((prev) => new Set([...prev, newStory.id]));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [inputId, supabase]);

  useEffect(() => {
    if (!inputId) return;
    const channel = supabase
      .channel(`input-status-${inputId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "requirement_inputs",
          filter: `id=eq.${inputId}`,
        },
        (payload) => {
          const status = (payload.new as { status: string }).status;
          if (status === "processing") {
            setGenerationStep("AI is analyzing your requirements...");
          }
          if (status === "completed" || status === "error") {
            setGenerating(false);
            setGenerationStep("");
            if (status === "error") {
              setError("Generation failed. Please try again.");
            }
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [inputId, supabase]);

  const handleFileUpload = useCallback(async (file: File) => {
    setUploading(true);
    setError("");
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Upload failed");
      setUploading(false);
      return;
    }
    const data = await res.json();
    setText(data.text);
    setFileName(data.filename);
    setFilePath(data.file_path);
    setUploading(false);
  }, []);

  async function handleGenerate() {
    if (!text.trim() || !selectedProjectKey) return;
    setGenerating(true);
    setGenerationStep("Saving requirements...");
    setError("");
    setBotMessage("");
    setDuplicates([]);
    setStories([]);
    setSelectedIds(new Set());
    setPushResults([]);
    setPushedTickets([]);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    setGenerationStep("Setting up project...");
    const { data: existingProjects } = await supabase
      .from("projects")
      .select("id")
      .eq("jira_project_key", selectedProjectKey)
      .eq("owner_id", user.id)
      .limit(1);

    let projectId: string;
    if (existingProjects && existingProjects.length > 0) {
      projectId = existingProjects[0].id;
    } else {
      const selectedProject = jiraProjects.find(
        (p) => p.key === selectedProjectKey,
      );
      const { data: newProject, error: createError } = await supabase
        .from("projects")
        .insert({
          owner_id: user.id,
          name: selectedProject?.name || selectedProjectKey,
          jira_project_key: selectedProjectKey,
        })
        .select("id")
        .single();
      if (createError || !newProject) {
        setError("Failed to create project");
        setGenerating(false);
        setGenerationStep("");
        return;
      }
      projectId = newProject.id;
    }

    const { data: input, error: inputError } = await supabase
      .from("requirement_inputs")
      .insert({
        project_id: projectId,
        created_by: user.id,
        title: fileName || "Requirements",
        raw_text: text,
        file_path: filePath,
      })
      .select("id")
      .single();

    if (inputError || !input) {
      setError("Failed to save requirements");
      setGenerating(false);
      setGenerationStep("");
      return;
    }

    setInputId(input.id);
    setGenerationStep("Calling AI model...");

    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input_id: input.id, project_id: projectId }),
    });

    const resData = await res.json();

    if (!res.ok) {
      setError(resData.error || "Generation failed");
      setGenerating(false);
      setGenerationStep("");
    } else if (resData.no_stories) {
      setBotMessage(resData.message);
      setGenerating(false);
      setGenerationStep("");
    }
  }

  async function handleCheckAndPush() {
    const selectedStories = stories.filter((s) => selectedIds.has(s.id));
    if (selectedStories.length === 0) return;

    // Step 1: Check for duplicates
    setCheckingDuplicates(true);
    setDuplicates([]);
    setGenerationStep("Checking for duplicate tickets...");

    const checkRes = await fetch("/api/jira/check-duplicates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stories: selectedStories.map((s) => ({
          id: s.id,
          title: s.title,
          persona: s.persona,
          action: s.action,
          benefit: s.benefit,
        })),
        jira_project_key: selectedProjectKey,
      }),
    });

    setCheckingDuplicates(false);
    setGenerationStep("");

    if (checkRes.ok) {
      const checkData = await checkRes.json();
      if (checkData.duplicates?.length > 0) {
        setDuplicates(checkData.duplicates);
        // Deselect duplicates automatically
        const dupIds = new Set(
          checkData.duplicates.map(
            (d: { new_story_id: string }) => d.new_story_id,
          ),
        );
        setSelectedIds((prev) => {
          const next = new Set(prev);
          dupIds.forEach((id) => next.delete(id as string));
          return next;
        });
        return; // Stop here — user can review and click push again
      }
    }

    // No duplicates — push directly
    await pushStoriesToJira(selectedStories);
  }

  async function pushStoriesToJira(
    storiesToPush?: EditableStoryData[],
  ) {
    const selectedStories =
      storiesToPush || stories.filter((s) => selectedIds.has(s.id));
    if (selectedStories.length === 0) return;
    setPushing(true);
    setPushResults([]);
    setDuplicates([]);
    setGenerationStep(
      `Sending ${selectedStories.length} ticket${selectedStories.length > 1 ? "s" : ""} to Jira...`,
    );

    let completed = 0;
    const results = await Promise.all(
      selectedStories.map(async (story) => {
        const res = await fetch(`/api/stories/${story.id}/jira`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            issue_type: story.issue_type,
            jira_project_key: selectedProjectKey,
            edits: {
              title: story.title,
              persona: story.persona,
              action: story.action,
              benefit: story.benefit,
              acceptance_criteria: story.acceptance_criteria,
              priority: story.priority,
              story_points: story.story_points,
              labels: story.labels,
              notes: story.notes,
            },
          }),
        });
        const data = await res.json();

        // Upload attachments if ticket was created and has files
        if (data.issue_key && story.attachments.length > 0) {
          setGenerationStep(
            `Uploading attachments for ${data.issue_key}...`,
          );
          const formData = new FormData();
          formData.append("issueKey", data.issue_key);
          story.attachments.forEach((file) =>
            formData.append("files", file, file.name),
          );
          await fetch("/api/jira/attachments", {
            method: "POST",
            body: formData,
          });
        }

        completed++;
        setGenerationStep(
          `Pushing to Jira... (${completed}/${selectedStories.length})`,
        );
        return {
          storyId: story.id,
          issueKey: data.issue_key,
          error: data.error,
        };
      }),
    );

    setPushing(false);
    setGenerationStep("");

    // Check if all succeeded
    const succeeded = results.filter((r) => r.issueKey);
    const failed = results.filter((r) => !r.issueKey);

    if (failed.length > 0) {
      // Partial failure: show errors inline
      setPushResults(results);
    } else {
      // All succeeded: clean up and show success message
      const tickets = succeeded.map((r) => {
        const story = selectedStories.find((s) => s.id === r.storyId);
        return { title: story?.title || "Story", issueKey: r.issueKey! };
      });
      setPushedTickets(tickets);
      setText("");
      setFileName(null);
      setFilePath(null);
      setStories([]);
      setSelectedIds(new Set());
      setPushResults([]);
      setInputId(null);
    }
  }

  function updateStory(updated: EditableStoryData) {
    setStories((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selectedIds.size === stories.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(stories.map((s) => s.id)));
    }
  }

  function handleRefine() {
    // Collect all unique gaps from all stories
    const allGaps = new Set<string>();
    stories.forEach((s) => {
      toArray<string>(s.flagged_gaps).forEach((gap) => allGaps.add(gap));
    });

    if (allGaps.size === 0) return;

    const gapsList = Array.from(allGaps)
      .map((g, i) => `${i + 1}. ${g}`)
      .join("\n");

    const refinement = `\n\n---\nThe AI flagged the following missing information. Please address these gaps to improve the generated stories:\n\n${gapsList}\n\nAdditional context:\n`;

    setText((prev) => prev + refinement);
    textareaRef.current?.focus();
    textareaRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  const totalGaps = stories.reduce(
    (count, s) => count + toArray<string>(s.flagged_gaps).length,
    0,
  );

  async function handleOnboardingComplete() {
    setShowOnboarding(false);
    setLoadingProjects(true);
    const res = await fetch("/api/jira/projects");
    if (res.ok) {
      const data = await res.json();
      setJiraProjects(data.projects || []);
      if (data.projects?.length > 0) {
        setSelectedProjectKey(data.projects[0].key);
      }
      setJiraConfigured(true);
    }
    setLoadingProjects(false);
  }

  const selectedProject = jiraProjects.find(
    (p) => p.key === selectedProjectKey,
  );
  const issueTypes = selectedProject?.issueTypes || [
    { id: "story", name: "Story" },
  ];
  const allPushed =
    pushResults.length > 0 && pushResults.every((r) => r.issueKey);
  const hasResults = stories.length > 0 || generating;

  // Loading
  if (jiraConfigured === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground animate-pulse">Loading...</p>
      </div>
    );
  }

  // Onboarding
  if (!jiraConfigured || showOnboarding) {
    return (
      <OnboardingChat
        onComplete={handleOnboardingComplete}
        onBack={jiraConfigured ? () => setShowOnboarding(false) : undefined}
        mode={jiraConfigured ? "reconfigure" : "setup"}
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border/50 px-6 py-4">
        <div className="flex items-center gap-3">
          <Logo />
          <h1 className="text-lg font-semibold">Ticket Generator</h1>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowOnboarding(true)}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title="Jira settings"
          >
            <GearIcon />
          </button>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              router.push("/login");
            }}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title="Sign out"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </header>

      {/* Main content */}
      <main
        className={`flex flex-1 flex-col ${hasResults ? "pt-8" : "items-center justify-center"}`}
      >
        <div
          className={`w-full px-6 ${hasResults ? "mx-auto max-w-4xl" : "max-w-3xl"}`}
        >
          {/* Welcome text or success message when no results */}
          {!hasResults && (
            <div className="mb-8">
              {pushedTickets.length > 0 ? (
                <div className="mx-auto max-w-2xl rounded-2xl bg-muted/50 px-6 py-5">
                  <p className="mb-3 text-sm font-medium">
                    Done! Created {pushedTickets.length} ticket
                    {pushedTickets.length > 1 ? "s" : ""}:
                  </p>
                  <ul className="space-y-2">
                    {pushedTickets.map((t) => (
                      <li
                        key={t.issueKey}
                        className="flex items-center gap-2 text-sm"
                      >
                        <span className="text-green-500">&#10003;</span>
                        <a
                          href={`${jiraBaseUrl}/browse/${t.issueKey}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-primary underline underline-offset-4 hover:text-primary/80"
                        >
                          {t.issueKey}
                        </a>
                        <span className="text-muted-foreground">{t.title}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : botMessage ? (
                <div className="mx-auto max-w-2xl rounded-2xl bg-muted/50 px-6 py-5">
                  <p className="text-sm leading-relaxed">{botMessage}</p>
                </div>
              ) : (
                <div className="text-center">
                  <h2 className="mb-2 text-2xl font-semibold">
                    What do you want to build?
                  </h2>
                  <p className="text-muted-foreground">
                    Paste requirements or upload a file to generate Jira-ready
                    user stories.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Input area */}
          <div className="mb-8 rounded-2xl border border-border/50 bg-card p-4">
            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  handleGenerate();
                }
              }}
              placeholder="Paste your requirements here..."
              rows={hasResults ? 3 : 5}
              disabled={generating}
              className="w-full resize-none bg-transparent text-sm leading-relaxed placeholder:text-muted-foreground/50 focus:outline-none"
            />

            {/* Bottom bar */}
            <div className="flex items-center gap-2 border-t border-border/30 pt-3">
              {/* File upload */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt,.md"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={generating || uploading}
                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                title="Upload file"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
              </button>

              {uploading && (
                <span className="text-xs text-muted-foreground animate-pulse">
                  Extracting text...
                </span>
              )}
              {fileName && !uploading && (
                <span className="text-xs text-muted-foreground">
                  {fileName}
                </span>
              )}

              {/* Project selector */}
              <div className="flex-1" />
              {loadingProjects ? (
                <span className="text-xs text-muted-foreground">
                  Loading...
                </span>
              ) : (
                <select
                  value={selectedProjectKey}
                  onChange={(e) => setSelectedProjectKey(e.target.value)}
                  className="rounded-lg border-0 bg-muted/50 px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  disabled={generating}
                >
                  {jiraProjects.map((p) => (
                    <option key={p.key} value={p.key}>
                      {p.key} - {p.name}
                    </option>
                  ))}
                </select>
              )}

              {/* Generate button */}
              <Button
                size="sm"
                onClick={handleGenerate}
                disabled={
                  !text.trim() ||
                  !selectedProjectKey ||
                  generating ||
                  loadingProjects
                }
                className="rounded-xl"
              >
                {generating ? (
                  <span className="flex items-center gap-2">
                    <svg
                      className="h-4 w-4 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="3"
                        className="opacity-25"
                      />
                      <path
                        d="M4 12a8 8 0 018-8"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        className="opacity-75"
                      />
                    </svg>
                    Generating
                  </span>
                ) : (
                  "Generate"
                )}
              </Button>
            </div>
          </div>

          {error && (
            <p className="mb-4 text-center text-sm text-destructive">{error}</p>
          )}

          {/* Results */}
          {hasResults && (
            <div className="space-y-4 pb-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold">
                    Generated Stories
                    {stories.length > 0 && (
                      <span className="ml-2 text-sm font-normal text-muted-foreground">
                        ({selectedIds.size}/{stories.length} selected)
                      </span>
                    )}
                  </h2>
                  {(generating || pushing) && generationStep && (
                    <span className="text-sm text-muted-foreground animate-pulse">
                      {generationStep}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {stories.length > 0 && (
                    <>
                      {totalGaps > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleRefine}
                        >
                          Refine ({totalGaps} gap{totalGaps > 1 ? "s" : ""})
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={toggleAll}>
                        {selectedIds.size === stories.length
                          ? "Deselect All"
                          : "Select All"}
                      </Button>
                      <Button
                        size="sm"
                        onClick={
                          duplicates.length > 0
                            ? () => pushStoriesToJira()
                            : handleCheckAndPush
                        }
                        disabled={
                          selectedIds.size === 0 ||
                          pushing ||
                          checkingDuplicates ||
                          allPushed
                        }
                      >
                        {checkingDuplicates
                          ? "Checking..."
                          : pushing
                            ? "Sending..."
                            : allPushed
                              ? "Sent to Jira"
                              : duplicates.length > 0
                                ? `Send ${selectedIds.size} anyway`
                                : `Send ${selectedIds.size} to Jira`}
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Duplicate warnings */}
              {duplicates.length > 0 && (
                <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm">
                  <p className="mb-3 font-medium text-yellow-500">
                    Potential duplicates found ({duplicates.length}):
                  </p>
                  <ul className="space-y-2">
                    {duplicates.map((d, i) => {
                      const story = stories.find(
                        (s) => s.id === d.new_story_id,
                      );
                      return (
                        <li key={i} className="flex items-start gap-2">
                          <span className="mt-0.5 text-yellow-500">!</span>
                          <div>
                            <p>
                              <span className="font-medium">
                                {story?.title || "Story"}
                              </span>
                              {" "}may duplicate{" "}
                              <a
                                href={`${jiraBaseUrl}/browse/${d.existing_ticket_key}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium text-primary underline underline-offset-4"
                              >
                                {d.existing_ticket_key}
                              </a>
                              <span className="text-muted-foreground">
                                {" "}({d.existing_ticket_summary})
                              </span>
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {d.reason}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Duplicates have been deselected. Re-select them if you still want to push, or click &quot;Send anyway&quot;.
                  </p>
                </div>
              )}

              {pushResults.length > 0 && (
                <Card>
                  <CardContent className="py-3 text-sm">
                    {pushResults.map((r) => (
                      <div key={r.storyId} className="flex items-center gap-2">
                        {r.issueKey ? (
                          <span className="text-green-500">
                            Created: {r.issueKey}
                          </span>
                        ) : (
                          <span className="text-destructive">
                            Error: {r.error}
                          </span>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              <div className="space-y-3">
                {stories.map((story) => (
                  <EditableStoryCard
                    key={story.id}
                    story={story}
                    issueTypes={issueTypes}
                    selected={selectedIds.has(story.id)}
                    onToggleSelect={() => toggleSelect(story.id)}
                    onChange={updateStory}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
