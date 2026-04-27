# Jira Sandbox Setup Guide

Step-by-step guide to create a test project in Jira for the AI User Story Generator.

## 1. Create a Free Jira Account

1. Go to [atlassian.com/software/jira/free](https://www.atlassian.com/software/jira/free)
2. Click **Get it free**
3. Sign up with your email or Google account
4. Choose a site name (e.g., `yourname-test`) — this becomes `yourname-test.atlassian.net`
5. Complete the onboarding steps

## 2. Create a Test Project

1. In Jira, click **Projects** in the top navigation
2. Click **Create project**
3. Select **Scrum** (recommended) or **Kanban**
4. Fill in:
   - **Name:** `AI Story Test`
   - **Key:** `AST` (this is the key you'll use in the app)
5. Click **Create**

The project key (e.g., `AST`) is what you enter in the AI User Story Generator when creating a local project.

## 3. Generate an API Token

The app needs an API token to create tickets in Jira.

1. Go to [id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Click **Create API token**
3. Give it a label (e.g., `ai-story-generator`)
4. Click **Create**
5. **Copy the token immediately** — you won't be able to see it again

## 4. Save Your Jira Credentials

You'll need these three values for the app:

| Value | Example | Where to find |
|---|---|---|
| **Jira Base URL** | `https://yourname-test.atlassian.net` | Your browser address bar when logged into Jira |
| **Jira Email** | `you@example.com` | The email you used to sign up for Atlassian |
| **Jira API Token** | `ATATT3x...` | The token you just created in step 3 |

These will be stored in your user profile within the app (Jira integration is not yet implemented in the UI — coming in Phase 5).

## 5. Verify Your Setup

To confirm everything works, you can test the API token with a simple curl command:

```bash
curl -s -u "your-email@example.com:YOUR_API_TOKEN" \
  "https://yourname-test.atlassian.net/rest/api/3/project" | head -100
```

If you see a JSON array with your project listed, the credentials are working.

## Notes

- Use this Jira instance only for testing. Do not use production Jira.
- The free tier supports up to 10 users and is sufficient for this PoC.
- The project key (`AST` in this example) must match what you enter in the app when creating a local project.
