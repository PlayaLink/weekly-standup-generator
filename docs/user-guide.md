# Weekly Standup - User Guide

Generate weekly standup reports from your Jira tickets with a simple Slack command.

---

## Quick Start (2 minutes)

### Step 1: Connect Your Jira Account

In any Slack channel, type:

```
/standup-setup
```

Click **"Connect Jira Account"** and authorize read-only access to your Jira.

### Step 2: Select Your Board

After connecting Jira, run `/standup-setup` again and select the board you want to track.

### Step 3: Generate Your Standup

Whenever you need a standup report, type:

```
/weekly-standup
```

You'll receive a DM with your formatted report!

---

## What's in the Report?

Your standup report includes three sections:

### Last Week
Tickets with activity in the past 7 days. Shows what you accomplished.

### This Week
Your "In Progress" and "To Do" tickets. Shows what you're working on.

### Blockers
Dependencies or items you're waiting on.

---

## Example Report

```
*Last Week*
• [PROJ-123](https://jira.example.com/browse/PROJ-123) - Homepage Redesign
  - Completed responsive layout updates
  - Fixed mobile navigation issues

• [PROJ-456](https://jira.example.com/browse/PROJ-456) - User Dashboard
  - Added analytics charts
  - Integrated with backend API

*This Week*
• [PROJ-789](https://jira.example.com/browse/PROJ-789) - Onboarding Flow (Due Friday)
  - Implement new welcome screens
  - Add progress indicators

*Blockers*
• Waiting on API documentation from backend team
```

---

## Tips

- **Run it anytime** - The report is generated fresh each time
- **Consistent names** - Ticket names stay consistent across reports
- **Recent activity** - Only shows tickets updated in the last 7 days
- **Private by default** - Reports are sent to your DMs, not public channels

---

## Need Help?

- **Can't connect Jira?** - Make sure you have access to at least one Jira Cloud board
- **No tickets showing?** - Check that you have tickets assigned to you or with recent activity
- **Wrong board?** - Run `/standup-setup` again to change your board selection

Contact your workspace admin if issues persist.
