export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  jira_api_token: string | null;
  jira_email: string | null;
  jira_base_url: string | null;
  created_at: string;
}

export interface Project {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  jira_project_key: string | null;
  created_at: string;
  updated_at: string;
}

export interface RequirementInput {
  id: string;
  project_id: string;
  created_by: string;
  title: string;
  raw_text: string | null;
  file_path: string | null;
  status: "pending" | "processing" | "completed" | "error";
  created_at: string;
}

export interface AcceptanceCriterion {
  given: string;
  when: string;
  then: string;
}

export interface GeneratedStory {
  id: string;
  input_id: string;
  project_id: string;
  title: string;
  persona: string;
  action: string;
  benefit: string;
  acceptance_criteria: AcceptanceCriterion[];
  priority: "highest" | "high" | "medium" | "low" | "lowest" | null;
  story_points: number | null;
  labels: string[];
  source_excerpt: string | null;
  confidence: number;
  flagged_gaps: string[];
  jira_issue_key: string | null;
  jira_sync_status: "not_synced" | "synced" | "error";
  jira_synced_at: string | null;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
}

export interface GenerationRun {
  id: string;
  input_id: string;
  status: "pending" | "running" | "completed" | "error";
  prompt_tokens: number | null;
  completion_tokens: number | null;
  model_used: string | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}
