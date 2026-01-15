# Weekly Standup Generator

A Slack app that generates weekly standup reports from Jira tickets using Claude AI.

## Features

- `/standup-setup` - Connect your Jira account and select your board
- `/weekly-standup` - Generate a formatted standup report

## Report Format

```
Last Week
• Completed tasks with links to Jira

This Week
• In Progress and To Do items

Blockers
• Dependencies and blocked items
```

## Tech Stack

- **Next.js** - API routes and serverless functions
- **Slack Bolt** - Slash commands and interactions
- **Jira OAuth 2.0** - Secure per-user authentication
- **Supabase** - User configs and encrypted token storage
- **Claude API** - Report generation

## Setup

### For Admins

See [docs/admin-setup.md](docs/admin-setup.md) for complete setup instructions.

### For Users

See [docs/user-guide.md](docs/user-guide.md) for a 2-minute getting started guide.

## Development

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Fill in your credentials

# Run development server
npm run dev
```

## Project Structure

```
src/
├── app/
│   └── api/
│       ├── slack/events/    # Slack command handler
│       └── auth/jira/       # OAuth callback
├── lib/
│   ├── slack/               # Bolt app + handlers
│   ├── jira/                # OAuth + API client
│   ├── claude/              # Report generation
│   ├── db/                  # Supabase operations
│   └── encryption.ts        # Token encryption
├── supabase/migrations/     # Database schema
└── docs/                    # Setup guides
```

## License

MIT
