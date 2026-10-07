# Influencer CRM - Instagram "Add to CRM" Chrome Extension

A Chrome extension that adds an **Add to CRM** button on any Instagram profile. One click saves the influencer's details to a local SQLite database, and a dashboard shows everything saved.

## Features
- "Add to CRM" button on Instagram profile pages
- Captures: name, username, profile link, bio, followers, following, posts, profile photo
- Add tags and notes before saving; edit the bio if auto-capture misses it
- Duplicate prevention (same username cannot be saved twice) with an "Already saved" message
- Success message: "Influencer added to CRM successfully."
- Missing bio/followers handled gracefully (shown as N/A)
- Dashboard with table, search (name, username, bio, tags) and delete

## Tech
Chrome Extension (Manifest V3, vanilla JS) | Node.js + Express | SQLite (Node built-in node:sqlite)

## Structure
```
backend/    Express API + SQLite DB + dashboard (public/index.html)
extension/  Manifest V3 extension (content.js, background.js)
```

## Setup
1. Install Node.js 22.13+ (24 LTS recommended).
2. Start the backend:
   ```
   cd backend
   npm install
   npm start
   ```
   Dashboard: http://localhost:3000 (database file: `backend/crm.db`)
3. Load the extension: open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked**, select the `extension` folder.

## Usage
1. Open any Instagram profile (e.g. https://www.instagram.com/instagram/) while logged in.
2. Click **Add to CRM** (bottom-right).
3. Review details, add tags/notes, click **Save**.
4. Open http://localhost:3000 to see, search and delete saved influencers.

## API
| Method | Endpoint | Purpose |
|---|---|---|
| POST | /api/influencers | Save (409 if duplicate) |
| GET | /api/influencers?q= | List / search |
| GET | /api/influencers/exists/:username | Check duplicate |
| DELETE | /api/influencers/:id | Remove |

## Notes
Instagram changes its page layout often. The extension reads meta tags first (most stable) and falls back to the page header. If bio is missed, it can be edited in the panel before saving.
Data is stored locally; for production, swap SQLite for a hosted DB and add authentication.

## LLM usage
See `LLM_CONVERSATIONS.md` (Claude).
