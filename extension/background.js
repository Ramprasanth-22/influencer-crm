// Talks to the backend (avoids CORS/mixed-content issues from the Instagram page)
const API = "http://localhost:3000/api";

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    try {
      if (msg.type === "CHECK") {
        const r = await fetch(`${API}/influencers/exists/${encodeURIComponent(msg.username)}`);
        sendResponse({ ok: true, ...(await r.json()) });
      } else if (msg.type === "SAVE") {
        const r = await fetch(`${API}/influencers`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(msg.data),
        });
        sendResponse({ ok: r.ok, status: r.status, ...(await r.json()) });
      }
    } catch (e) {
      sendResponse({ ok: false, error: "Cannot reach CRM server. Is the backend running on port 3000?" });
    }
  })();
  return true; // async response
});
