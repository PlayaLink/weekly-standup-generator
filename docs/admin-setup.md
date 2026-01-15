# Admin Setup Guide

This guide walks you through setting up the Weekly Standup app for your team. This is a one-time setup that you (the admin) need to complete.

## Prerequisites

- A Slack workspace where you have permission to install apps
- An Atlassian Cloud account (Jira Cloud)
- A Vercel account (free tier works)
- A Supabase account (free tier works)
- An Anthropic API key

---

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note down your project URL and service role key (Settings → API)
3. Run the database migration:
   - Go to SQL Editor in Supabase dashboard
   - Copy contents of `supabase/migrations/001_initial_schema.sql`
   - Run the migration

**Environment variables you'll get:**
- `SUPABASE_URL` - Your project URL
- `SUPABASE_SERVICE_KEY` - Service role key (keep secret!)

---

## Step 2: Create Jira OAuth App

1. Go to [developer.atlassian.com/console](https://developer.atlassian.com/console)
2. Click "Create" → "OAuth 2.0 integration"
3. Fill in:
   - **Name:** Weekly Standup
   - **Description:** Generate weekly standup reports from Jira
4. Under "Authorization", add callback URL:
   ```
   https://YOUR_VERCEL_DOMAIN.vercel.app/api/auth/jira/callback
   ```
   (You'll update this after deploying to Vercel)

5. Under "Permissions", add these scopes:
   - `read:jira-work`
   - `read:jira-user`
   - `offline_access`

6. Note your Client ID and Client Secret

**Environment variables you'll get:**
- `JIRA_CLIENT_ID` - OAuth client ID
- `JIRA_CLIENT_SECRET` - OAuth client secret
- `JIRA_REDIRECT_URI` - Your callback URL

---

## Step 3: Generate Encryption Key

Generate a 32-byte hex encryption key for token storage:

```bash
openssl rand -hex 32
```

**Environment variable:**
- `TOKEN_ENCRYPTION_KEY` - The generated hex string

---

## Step 4: Deploy to Vercel

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) and import the repository
3. Add all environment variables in Vercel project settings:

```
SLACK_BOT_TOKEN=xoxb-...
SLACK_SIGNING_SECRET=...
JIRA_CLIENT_ID=...
JIRA_CLIENT_SECRET=...
JIRA_REDIRECT_URI=https://YOUR_VERCEL_DOMAIN.vercel.app/api/auth/jira/callback
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
ANTHROPIC_API_KEY=sk-ant-...
TOKEN_ENCRYPTION_KEY=...
```

4. Deploy and note your Vercel domain

5. Go back to Atlassian Developer Console and update the callback URL with your actual Vercel domain

---

## Step 5: Create Slack App

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Click "Create New App" → "From an app manifest"
3. Select your workspace
4. Copy the contents of `slack-app-manifest.yaml`
5. Replace `YOUR_VERCEL_DOMAIN` with your actual Vercel domain
6. Paste and create the app
7. Install to your workspace
8. Note your Bot Token and Signing Secret (under "Basic Information")

**Environment variables you'll get:**
- `SLACK_BOT_TOKEN` - Bot User OAuth Token (starts with `xoxb-`)
- `SLACK_SIGNING_SECRET` - Signing Secret

---

## Step 6: Update Vercel Environment Variables

Go back to Vercel and add the Slack credentials:

1. `SLACK_BOT_TOKEN`
2. `SLACK_SIGNING_SECRET`

Redeploy the app after adding these.

---

## Step 7: Get Anthropic API Key

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create an API key
3. Add `ANTHROPIC_API_KEY` to Vercel

---

## Final Environment Variables Checklist

```env
# Slack
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your-signing-secret

# Jira OAuth
JIRA_CLIENT_ID=your-client-id
JIRA_CLIENT_SECRET=your-client-secret
JIRA_REDIRECT_URI=https://your-domain.vercel.app/api/auth/jira/callback

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=your-service-key

# Anthropic
ANTHROPIC_API_KEY=sk-ant-your-key

# Encryption
TOKEN_ENCRYPTION_KEY=your-32-byte-hex-key
```

---

## Testing

1. In Slack, run `/standup-setup`
2. Click "Connect Jira Account" and authorize
3. Select a board
4. Run `/weekly-standup` to generate a report

---

## Troubleshooting

### "Jira not connected" error
- Check that `JIRA_REDIRECT_URI` matches exactly in both Vercel and Atlassian Developer Console
- Verify the user completed the OAuth flow

### "Failed to fetch boards" error
- Ensure the Jira OAuth app has `read:jira-work` scope
- Verify the user has access to at least one Jira board

### Slack commands not responding
- Check Vercel logs for errors
- Verify `SLACK_SIGNING_SECRET` is correct
- Ensure the Request URL in Slack app settings matches your Vercel domain

### Empty standup report
- User may not have any tickets with recent activity
- Check the board selection is correct
