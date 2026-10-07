const CRM_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg><span class="crm-label">Add to CRM</span>';

const RESERVED = ["explore","reels","direct","accounts","stories","p","reel","tv","about","legal","web","developers","directory","challenge","privacy","api"];

function getUsername() {
  const parts = location.pathname.split("/").filter(Boolean);
  if (parts.length < 1 || RESERVED.includes(parts[0].toLowerCase())) return null;
  if (parts.length > 1 && !["tagged", "reels"].includes(parts[1])) return null; // posts etc.
  return parts[0];
}

// "1.2M" -> 1200000, "12,345" -> 12345, "85.4K" -> 85400
function parseCount(t) {
  if (!t) return null;
  const m = String(t).replace(/,/g, "").match(/([\d.]+)\s*([KMB])?/i);
  if (!m) return null;
  const mult = { K: 1e3, M: 1e6, B: 1e9 }[(m[2] || "").toUpperCase()] || 1;
  return Math.round(parseFloat(m[1]) * mult);
}

const meta = (p) => document.querySelector(`meta[property="${p}"]`)?.content || "";

function scrapeProfile() {
  const username = getUsername();
  const header = document.querySelector("header");
  // Instagram is a single-page app: meta tags can still belong to the PREVIOUS profile until refresh.
  // Only trust them if they mention the current username.
  const metaFresh = meta("og:title").toLowerCase().includes("@" + (username || "").toLowerCase());
  const ogTitle = metaFresh ? meta("og:title") : "";
  const ogDesc = metaFresh ? meta("og:description") : "";

  let name = (ogTitle.match(/^(.*?)\s*\(@/) || [])[1] || "";
  const fromDesc = (re) => (ogDesc.match(re) || [])[1] || "";
  let followersText = fromDesc(/([\d.,]+\s*[KMB]?)\s*Followers/i);
  let followingText = fromDesc(/([\d.,]+\s*[KMB]?)\s*Following/i);
  let postsText = fromDesc(/([\d.,]+\s*[KMB]?)\s*Posts/i);

  // Fallbacks: Instagram changes its layout often, so try several ways
  const pick = (re, text) => (text.match(re) || [])[1] || "";
  const countRe = (word) => new RegExp("([\\d.,]+\\s*[KMBkmb]?)\\s*" + word, "i");
  const uname = (username || "").toLowerCase();
  const headers = [...document.querySelectorAll("header")];
  const profileHeader = headers.find((h) => (h.innerText || "").split("\n").some((l) => l.trim().toLowerCase() === uname)) || null;
  const mainEl = document.querySelector("main") || document.body;
  const rawScope = (profileHeader || mainEl).innerText || "";
  // If the page text does not mention this username yet, it still shows the previous profile: ignore it
  const domFresh = !!profileHeader;
  const scopeText = domFresh ? rawScope : "";
  const metaDesc = metaFresh ? (document.querySelector('meta[name="description"]')?.content || "") : "";
  if (!followersText) followersText = pick(countRe("Followers"), ogDesc + " " + metaDesc);
  if (!followersText) {
    for (const a of document.querySelectorAll(`a[href*="/${username}/followers"]`)) {
      const t = (a.querySelector("[title]")?.getAttribute("title")) || pick(countRe("followers"), a.innerText) || a.innerText.split(/\s/)[0];
      if (/\d/.test(t)) { followersText = t; break; }
    }
  }
  if (!followersText) followersText = pick(countRe("followers"), scopeText);
  if (!followingText) followingText = pick(countRe("following"), scopeText);
  if (!postsText) postsText = pick(countRe("posts"), scopeText);

  // More accurate: read each count line by line (number + its own label), so counts never get mixed up
  const lineCount = (word, text = scopeText) => {
    const L = text.split("\n").map((x) => x.trim()).filter(Boolean);
    for (let i = 0; i < L.length; i++) {
      const m = L[i].match(new RegExp("^([\\d.,]+\\s*[KMBkmb]?)\\s*" + word + "$", "i"));
      if (m) return m[1];
      if (new RegExp("^" + word + "$", "i").test(L[i]) && i > 0 && /^[\d.,]+\s*[KMBkmb]?$/.test(L[i - 1])) return L[i - 1];
    }
    return "";
  };
  const anchorCount = (word) => {
    const a = document.querySelector(`a[href$="/${username}/${word}/"]`) || document.querySelector(`a[href$="/${username.toLowerCase()}/${word}/"]`);
    if (!a) return "";
    const t = a.querySelector("[title]")?.getAttribute("title") || a.innerText || "";
    return (t.match(/[\d.,]+\s*[KMBkmb]?/) || [""])[0];
  };
  // The first <header> on the page is not always the profile header, so also search the whole main area
  const mainText = domFresh ? (mainEl.innerText || "") : "";
  followersText = followersText || anchorCount("followers") || lineCount("followers?") || lineCount("followers?", mainText) || pick(countRe("followers"), mainText);
  followingText = anchorCount("following") || lineCount("following") || lineCount("following", mainText) || followingText;
  postsText = lineCount("posts?") || lineCount("posts?", mainText) || postsText;

  // Bio: header text lines minus username, counts, buttons
  let bio = "";
  const header2 = profileHeader;
  if (header2 && domFresh) {
    const skip = /^(follow|following|follows you|message|more|options|\d[\d.,KMB]*\s*(posts?|followers?|following)|[\d.,KMB]+|posts|followers|following)$/i;
    const lines = header2.innerText.split("\n").map((s) => s.replace(/[\u00a0\u200b-\u200f]/g, " ").trim()).filter(Boolean)
      .filter((l) => l.toLowerCase() !== (username || "").toLowerCase() && !skip.test(l) && l !== name
        && !/^followed\s*by/i.test(l) && !/^(mutual|\+\s*\d+ more)/i.test(l) && !/followers?$/i.test(l) && !/^(more|\.\.\.|…)$/i.test(l));
    // New Instagram layout: first line is the display name
    if (!name && lines.length > 1) name = lines.shift();
    bio = lines.join("\n").replace(/\s*(\.\.\.|…)\s*more$/i, "");
  }

  const pic = (domFresh ? (header2?.querySelector('img[alt*="profile picture" i]')?.src || header2?.querySelector("img")?.src) : "") || (metaFresh ? meta("og:image") : "") || "";

  return {
    username,
    name: name || username,
    profile_url: `https://www.instagram.com/${username}/`,
    bio,
    followers: parseCount(followersText),
    followers_text: followersText ? followersText.trim() : "",
    following_text: followingText ? followingText.trim() : "",
    posts_text: postsText ? postsText.trim() : "",
    profile_pic: pic,
  };
}

// Read following/posts exactly as the page shows them, but only from the header that belongs to THIS username
function domCounts(username) {
  const uname = (username || "").toLowerCase();
  const hdr = [...document.querySelectorAll("header")].find((h) => (h.innerText || "").split("\n").some((l) => l.trim().toLowerCase() === uname));
  if (!hdr) return {};
  const L = (hdr.innerText || "").split("\n").map((x) => x.replace(/[\u00a0\u200b-\u200f]/g, " ").trim()).filter(Boolean);
  const num = /[\d.,]+\s*[KMBkmb]?/;
  const fromAnchor = (w) => {
    const a = [...document.querySelectorAll("a[href]")].find((x) => x.getAttribute("href").toLowerCase().includes(`/${uname}/${w}`) && /\d/.test(x.innerText || ""));
    if (!a) return "";
    const t = a.querySelector("[title]")?.getAttribute("title") || a.innerText;
    return (t.match(num) || [""])[0].trim();
  };
  const fromLines = (w) => {
    for (let i = 0; i < L.length; i++) {
      const m = L[i].match(new RegExp("^([\\d.,]+\\s*[KMBkmb]?)\\s*" + w + "$", "i"));
      if (m) return m[1].trim();
      if (new RegExp("^" + w + "$", "i").test(L[i]) && i > 0 && /^[\d.,]+\s*[KMBkmb]?$/.test(L[i - 1])) return L[i - 1];
    }
    return "";
  };
  return { following: fromAnchor("following") || fromLines("following"), posts: fromLines("posts?") };
}

const send = (msg) => new Promise((res) => {
  const timer = setTimeout(() => res({ ok: false, error: "No response from CRM. Is the backend running? Refresh this page (F5) and try again." }), 6000);
  try {
    chrome.runtime.sendMessage(msg, (r) => {
      clearTimeout(timer);
      if (chrome.runtime.lastError || !r) res({ ok: false, error: "Extension was reloaded. Press F5 on this page and try again." });
      else res(r);
    });
  } catch (e) {
    clearTimeout(timer);
    res({ ok: false, error: "Extension was reloaded. Press F5 on this page and try again." });
  }
});
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// Most reliable source: Instagram's own public profile data for the profile you are viewing.
// Falls back to reading the page if this is blocked.
async function enrichFromApi(d) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 3000);
    const r = await fetch(`/api/v1/users/web_profile_info/?username=${encodeURIComponent(d.username)}`, {
      headers: {
        "x-ig-app-id": "936619743392459",
        "x-asbd-id": "129477",
        "x-requested-with": "XMLHttpRequest",
        "x-csrftoken": (document.cookie.match(/csrftoken=([^;]+)/) || [])[1] || "",
      },
      credentials: "include",
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!r.ok) return;
    const u = (await r.json())?.data?.user;
    if (!u) return;
    const fmt = (n) => (Number.isFinite(n) ? n.toLocaleString("en-US") : "");
    d.name = u.full_name || d.name;
    d.bio = u.biography ?? d.bio;
    const fol = u.edge_followed_by?.count;
    if (Number.isFinite(fol)) { d.followers = fol; d.followers_text = fmt(fol); }
    const fwg = u.edge_follow?.count;
    if (Number.isFinite(fwg)) d.following_text = fmt(fwg);
    const posts = u.edge_owner_to_timeline_media?.count;
    if (Number.isFinite(posts)) d.posts_text = fmt(posts);
    d.profile_pic = u.profile_pic_url_hd || u.profile_pic_url || d.profile_pic;
    d.fromApi = true;
  } catch (e) { /* keep page-scraped values */ }
}

// Second source: download this profile's own page and read its meta tags.
// The downloaded page always belongs to the username we ask for, so it can never be the previous profile.
async function enrichFromHtml(d) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 3000);
    const r = await fetch(`/${encodeURIComponent(d.username)}/`, { credentials: "include", cache: "no-store", signal: ctrl.signal });
    clearTimeout(t);
    if (!r.ok) return;
    const doc = new DOMParser().parseFromString(await r.text(), "text/html");
    const m = (p) => doc.querySelector(`meta[property="${p}"]`)?.content || "";
    const title = m("og:title"), desc = m("og:description");
    if (!title.toLowerCase().includes("@" + d.username.toLowerCase())) return;
    const nm = (title.match(/^(.*?)\s*\(@/) || [])[1];
    const get = (w) => (desc.match(new RegExp("([\\d.,]+\\s*[KMBkmb]?)\\s*" + w, "i")) || [])[1] || "";
    const fol = get("Followers");
    if (!fol) return;
    d.name = nm || d.name;
    d.followers_text = fol.trim();
    d.followers = parseCount(fol);
    d.following_text = get("Following").trim() || d.following_text;
    d.posts_text = get("Posts").trim() || d.posts_text;
    d.profile_pic = m("og:image") || d.profile_pic;
    d.fromApi = true;
  } catch (e) { /* ignore */ }
}

function closePanel() { document.getElementById("crm-panel")?.remove(); }

let opening = false;
async function openPanel() {
  if (opening) return;
  opening = true;
  closePanel();
  const openBtn = document.getElementById("crm-btn");
  if (openBtn) openBtn.classList.add("loading");
  let d;
  try {
    // Start EMPTY for this username, so nothing from a previously viewed profile can leak in
    const u = getUsername();
    const base = { username: u, name: u, profile_url: `https://www.instagram.com/${u}/`, bio: "", followers: null,
      followers_text: "", following_text: "", posts_text: "", profile_pic: "" };
    const a = { ...base }, h = { ...base };
    await Promise.all([enrichFromApi(a), enrichFromHtml(h)]); // both fetch THIS username's data
    const sources = [a, h].filter((x) => x.fromApi);
    if (sources.length) {
      d = { ...base, fromApi: true };
      for (const k of ["name", "bio", "followers", "followers_text", "following_text", "posts_text", "profile_pic"]) {
        const src = sources.find((x) => x[k] !== "" && x[k] != null && !(k === "name" && x[k] === u));
        if (src) d[k] = src[k];
      }
      d.src = a.fromApi ? "Instagram profile data" : "profile page";
      if (!d.bio) d.bio = scrapeProfile().bio || "";
      // Following / Posts: use the exact numbers the page shows for this profile
      const dc = domCounts(u);
      if (dc.following) d.following_text = dc.following;
      if (dc.posts) d.posts_text = dc.posts;
    } else {
      d = scrapeProfile(); // last resort: read the page (only if it belongs to this profile)
    }
  } catch (e) { console.error("CRM:", e); d = d || scrapeProfile(); }
  finally { opening = false; if (openBtn) openBtn.classList.remove("loading"); }
  const panel = document.createElement("div");
  panel.id = "crm-panel";
  panel.innerHTML = `
    <div class="row">
      ${d.profile_pic ? `<img src="${esc(d.profile_pic)}" referrerpolicy="no-referrer">` : ""}
      <div><b>${esc(d.name)}</b><br><small>@${esc(d.username)} · ${esc(d.followers_text || "Followers N/A")}</small><br><small><a href="${esc(d.profile_url)}" target="_blank" style="color:#4f46e5">${esc(d.profile_url)}</a></small></div>
    </div>
    <label>Followers (editable)</label><input id="crm-followers" value="${esc(d.followers_text)}" placeholder="e.g. 1.2M">
    <label>Following (editable)</label><input id="crm-following" value="${esc(d.following_text)}">
    <label>Posts (editable)</label><input id="crm-posts" value="${esc(d.posts_text)}">
    <label>Bio (editable)</label><textarea id="crm-bio" rows="3">${esc(d.bio)}</textarea>
    <label>Tags (comma separated)</label><input id="crm-tags" placeholder="fashion, micro-influencer">
    <label>Notes</label><textarea id="crm-notes" rows="2" placeholder="Any notes..."></textarea>
    <small style="color:#6b7090">Source: ${esc(d.src || "page text (please check numbers)")}</small>
    <div class="actions"><button id="crm-save">Save</button><button id="crm-close">Close</button></div>
    <div id="crm-msg" hidden></div>`;
  document.body.appendChild(panel);
  panel.querySelector("#crm-close").onclick = closePanel;

  const msg = panel.querySelector("#crm-msg");
  const show = (text, cls) => { msg.hidden = false; msg.className = cls; msg.textContent = text; };
  const saveBtn = panel.querySelector("#crm-save");

  saveBtn.onclick = async () => {
    saveBtn.disabled = true;
    show("Saving...", "warn");
    try {
      const ft = panel.querySelector("#crm-followers").value.trim();
      const data = { ...d, followers_text: ft, followers: parseCount(ft), following_text: panel.querySelector("#crm-following").value.trim(), posts_text: panel.querySelector("#crm-posts").value.trim(), bio: panel.querySelector("#crm-bio").value.trim(),
        tags: panel.querySelector("#crm-tags").value.trim(), notes: panel.querySelector("#crm-notes").value.trim() };
      const r = await send({ type: "SAVE", data });
      if (r?.ok) show("Influencer added to CRM successfully.", "ok");
      else if (r?.status === 409) show("Already saved in CRM.", "warn");
      else { saveBtn.disabled = false; show(r?.error || "Could not save.", "err"); }
    } catch (e) {
      console.error("CRM save error:", e);
      saveBtn.disabled = false;
      show("Error: " + e.message, "err");
    }
  };

  const chk = await send({ type: "CHECK", username: d.username });
  if (chk?.exists) { saveBtn.disabled = true; show("Already saved in CRM.", "warn"); }
  else if (chk && chk.ok === false) show(chk.error, "err");
}

// Instagram is a single-page app, so re-check the URL regularly
function sync() {
  const btn = document.getElementById("crm-btn");
  if (getUsername()) {
    if (!btn) {
      const b = document.createElement("button");
      b.id = "crm-btn"; b.innerHTML = CRM_ICON; b.title = "Add to CRM"; b.setAttribute("aria-label", "Add to CRM"); b.onclick = openPanel;
      document.body.appendChild(b);
    }
  } else { btn?.remove(); closePanel(); }
}
let last = location.href;
setInterval(() => { if (location.href !== last) { last = location.href; closePanel(); } sync(); }, 800);
sync();
