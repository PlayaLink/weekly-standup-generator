# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server (http://localhost:3000)
npm run build    # Production build
npm run lint     # ESLint
```

## Architecture

This is a Next.js Slack app that generates weekly standup reports from Jira tickets using Claude AI.

### Request Flow

1. **Slack commands** (`/standup-setup`, `/weekly-standup`) hit `/api/slack/events`
2. The route adapts Next.js requests to work with Slack Bolt's Express receiver (`src/app/api/slack/events/route.ts`)
3. Handlers in `src/lib/slack/handlers/` process commands and interact with Jira/Claude

### Key Integration Points

- **Slack Bolt** (`src/lib/slack/app.ts`): Initialized with ExpressReceiver for serverless. Uses `processBeforeResponse: true` for synchronous handling.
- **Jira OAuth** (`src/lib/jira/auth.ts`): OAuth 2.0 with Atlassian. Tokens auto-refresh via `getValidAccessToken()`. Callback at `/api/auth/jira/callback`.
- **Claude** (`src/lib/claude/generate.ts`): Report generation with ticket name persistence for consistency across reports.

### Database (Supabase)

Schema in `supabase/migrations/001_initial_schema.sql`:
- `users`: Linked by `slack_user_id`
- `oauth_tokens`: Encrypted tokens (uses `TOKEN_ENCRYPTION_KEY`)
- `jira_configs`: User's selected board/project
- `ticket_names`: Persists short ticket names across standup generations

### Path Aliases

`@/*` maps to `./src/*` (configured in tsconfig.json)
