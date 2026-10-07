# LLM Conversations

**Tool used:** Claude (Anthropic) - claude.ai

## 1. Understanding the task
Prompt: Shared the assignment PDF and asked what an Influencer Marketing CRM Chrome extension is, how to build it, and which tools and database to use.
Outcome: Plan with Chrome extension (Manifest V3), Node/Express backend, SQLite database, and a dashboard.

## 2. Building the project
Prompt: Asked Claude to build the complete extension with duplicate prevention, saved list/dashboard, tags and notes, search, README, and a profile link.
Outcome: Generated the extension, backend, dashboard and README.

## 3. Setup problems
Prompt: Shared the npm install error (better-sqlite3 failed on Node 24).
Outcome: Switched the database to Node's built-in node:sqlite, so no native build is needed.

## 4. Fixing wrong data between profiles
Prompt: Reported that after saving one profile, the next profile showed the previous name, followers and following count unless the page was refreshed.
Outcome: Instagram is a single-page app, so old page text stayed on screen. The extension now fetches data by username, starts each profile with empty data, and only reads the page when it belongs to the current profile.

## 5. UI improvements
Prompt: Asked for the dashboard to auto-refresh and the Add to CRM button to become a small round icon.
Outcome: Dashboard refreshes every 2 seconds, and the button is a round icon that expands to show "Add to CRM" on hover.

## 6. GitHub
Prompt: Asked how to push the project to GitHub.
Outcome: Followed git init, add, commit, remote add and push steps.