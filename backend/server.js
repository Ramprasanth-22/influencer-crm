const express = require("express");
const cors = require("cors");
const { DatabaseSync } = require("node:sqlite"); // built into Node, no install needed
const path = require("path");

const db = new DatabaseSync(path.join(__dirname, "crm.db"));
db.exec(`CREATE TABLE IF NOT EXISTS influencers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name TEXT, profile_url TEXT, bio TEXT,
  followers INTEGER, followers_text TEXT,
  following_text TEXT, posts_text TEXT,
  profile_pic TEXT, tags TEXT, notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
)`);

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

// Save influencer (blocks duplicates by username)
app.post("/api/influencers", (req, res) => {
  const d = req.body || {};
  if (!d.username) return res.status(400).json({ error: "username is required" });
  try {
    db.prepare(`INSERT INTO influencers
      (username,name,profile_url,bio,followers,followers_text,following_text,posts_text,profile_pic,tags,notes)
      VALUES (@username,@name,@profile_url,@bio,@followers,@followers_text,@following_text,@posts_text,@profile_pic,@tags,@notes)`)
      .run({
        username: d.username, name: d.name || null, profile_url: d.profile_url || null,
        bio: d.bio || null, followers: Number.isFinite(d.followers) ? d.followers : null,
        followers_text: d.followers_text || null, following_text: d.following_text || null,
        posts_text: d.posts_text || null, profile_pic: d.profile_pic || null,
        tags: d.tags || null, notes: d.notes || null,
      });
    res.status(201).json({ message: "Influencer added to CRM successfully." });
  } catch (e) {
    if (/UNIQUE|constraint/i.test(String(e.message)))
      return res.status(409).json({ error: "Already saved in CRM." });
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

// List + search (name, username, bio, tags)
app.get("/api/influencers", (req, res) => {
  const q = `%${(req.query.q || "").trim()}%`;
  const rows = db.prepare(`SELECT * FROM influencers
    WHERE username LIKE ? OR name LIKE ? OR bio LIKE ? OR tags LIKE ?
    ORDER BY id DESC`).all(q, q, q, q);
  res.json(rows);
});

// Is this username already saved?
app.get("/api/influencers/exists/:username", (req, res) => {
  const row = db.prepare("SELECT id FROM influencers WHERE username = ?").get(req.params.username);
  res.json({ exists: !!row });
});

app.delete("/api/influencers/:id", (req, res) => {
  db.prepare("DELETE FROM influencers WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

app.listen(3000, () => console.log("CRM running: http://localhost:3000"));
