const API_BASE = "http://127.0.0.1:9876";
let AUTO_LOCK_MS = 15 * 60 * 1000;

try {
  browser.storage.session.setAccessLevel({
    accessLevel: "TRUSTED_AND_UNTRUSTED_CONTEXTS",
  });
} catch {}

// Load configured timeout
browser.storage.local.get("autoLockTimeout").then((d) => {
  if (d.autoLockTimeout) AUTO_LOCK_MS = d.autoLockTimeout;
});

async function updateBadge(tab) {
  if (!tab?.url || tab.url.startsWith("about:")) {
    browser.action.setBadgeText({ text: "" });
    return;
  }
  try {
    const data = await browser.storage.session.get("vaultchain_token");
    const token = data.vaultchain_token;
    if (!token) {
      browser.action.setBadgeText({ text: "" });
      return;
    }
    const res = await fetch(
      `${API_BASE}/entries/match?url=${encodeURIComponent(tab.url)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) {
      browser.action.setBadgeText({ text: "" });
      return;
    }
    const result = await res.json();
    const count = (result.matched || []).length;
    browser.action.setBadgeText({
      text: count > 0 ? String(count) : "",
    });
    if (count > 0)
      browser.action.setBadgeBackgroundColor({ color: "#6366f1" });
  } catch {
    browser.action.setBadgeText({ text: "" });
  }
}

browser.tabs.onActivated.addListener(async (a) => {
  const t = await browser.tabs.get(a.tabId);
  updateBadge(t);
});
browser.tabs.onUpdated.addListener((_, c, t) => {
  if (c.url || c.status === "complete") updateBadge(t);
});

browser.runtime.onInstalled.addListener(() => {
  browser.contextMenus.create({
    id: "vaultchain-fill",
    title: "Fill with VaultChain",
    contexts: ["editable"],
  });
});

browser.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "vaultchain-fill" || !tab?.id) return;
  try {
    const data = await browser.storage.session.get("vaultchain_token");
    const token = data.vaultchain_token;
    if (!token || !tab.url) return;
    const res = await fetch(
      `${API_BASE}/entries/match?url=${encodeURIComponent(tab.url)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) return;
    const result = await res.json();
    const matched = result.matched || [];
    if (matched.length === 0) return;
    const entry = matched[0];
    const pwRes = await fetch(
      `${API_BASE}/entries/${encodeURIComponent(entry.name)}/password`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!pwRes.ok) return;
    const { password } = await pwRes.json();
    browser.tabs.sendMessage(tab.id, {
      type: "FILL_CREDENTIALS",
      username: entry.username,
      password,
    });
  } catch {}
});

let idleTimer = null;
function resetIdle() {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(async () => {
    try {
      const d = await browser.storage.session.get("vaultchain_token");
      if (d.vaultchain_token) {
        await fetch(`${API_BASE}/lock`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${d.vaultchain_token}`,
          },
        });
        await browser.storage.session.remove("vaultchain_token");
        browser.action.setBadgeText({ text: "" });
      }
    } catch {}
  }, AUTO_LOCK_MS);
}
browser.tabs.onActivated.addListener(resetIdle);
browser.tabs.onUpdated.addListener(resetIdle);
resetIdle();

browser.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "CHECK_AUTOFILL" && sender.tab?.id) {
    (async () => {
      try {
        const d = await browser.storage.session.get("vaultchain_token");
        const t = d.vaultchain_token;
        if (!t || !sender.tab?.url) return;
        const r = await fetch(
          `${API_BASE}/entries/match?url=${encodeURIComponent(sender.tab.url)}`,
          { headers: { Authorization: `Bearer ${t}` } }
        );
        if (!r.ok) return;
        const res = await r.json();
        const m = (res.matched || []).map((e) => ({
          name: e.name,
          username: e.username,
        }));
        if (m.length > 0)
          browser.tabs.sendMessage(sender.tab.id, {
            type: "SHOW_AUTOFILL_BANNER",
            matched: m,
          });
      } catch {}
    })();
    return false;
  }

  if (msg.type === "FILL_ENTRY" && sender.tab?.id) {
    (async () => {
      try {
        const d = await browser.storage.session.get("vaultchain_token");
        const t = d.vaultchain_token;
        if (!t) return;
        const pw = await fetch(
          `${API_BASE}/entries/${encodeURIComponent(msg.name)}/password`,
          { headers: { Authorization: `Bearer ${t}` } }
        );
        if (!pw.ok) return;
        const { password } = await pw.json();
        const mr = await fetch(
          `${API_BASE}/entries/match?url=${encodeURIComponent(sender.tab!.url || "")}`,
          { headers: { Authorization: `Bearer ${t}` } }
        );
        if (!mr.ok) return;
        const md = await mr.json();
        const e = (md.matched || []).find((e) => e.name === msg.name);
        if (!e) return;
        browser.tabs.sendMessage(sender.tab.id, {
          type: "FILL_CREDENTIALS",
          username: e.username,
          password,
        });
      } catch {}
    })();
    return true;
  }

  if (msg.type === "DETECT_LOGIN_SUBMIT" && sender.tab?.id) {
    (async () => {
      try {
        const d = await browser.storage.session.get("vaultchain_token");
        const t = d.vaultchain_token;
        if (!t || !msg.url || !msg.password) return;

        const r = await fetch(
          `${API_BASE}/entries/match?url=${encodeURIComponent(msg.url)}`,
          { headers: { Authorization: `Bearer ${t}` } }
        );
        if (!r.ok) return;
        const res = await r.json();
        const matched = res.matched || [];

        if (matched.length > 0) {
          const existing = matched.find(
            (e) => e.username.toLowerCase() === (msg.username || "").toLowerCase()
          );
          if (existing) {
            browser.tabs.sendMessage(sender.tab.id, {
              type: "SHOW_UPDATE_NOTIFICATION",
              entryName: existing.name,
              newPassword: msg.password,
            });
            return;
          }
        }

        browser.tabs.sendMessage(sender.tab.id, {
          type: "SHOW_SAVE_NOTIFICATION",
          username: msg.username || "",
          password: msg.password,
          url: msg.url,
        });
      } catch {}
    })();
    return false;
  }

  if (msg.type === "SAVE_LOGIN" && sender.tab?.id) {
    (async () => {
      try {
        const d = await browser.storage.session.get("vaultchain_token");
        const t = d.vaultchain_token;
        if (!t) return;

        const res = await fetch(`${API_BASE}/entries`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${t}`,
          },
          body: JSON.stringify({
            name: new URL(msg.url).hostname.replace("www.", ""),
            username: msg.username,
            password: msg.password,
            url: msg.url,
            uris: [new URL(msg.url).hostname],
          }),
        });

        if (res.ok) {
          updateBadge(
            await browser.tabs.get(sender.tab.id)
          );
        }
      } catch {}
    })();
    return false;
  }

  if (msg.type === "UPDATE_PASSWORD" && sender.tab?.id) {
    (async () => {
      try {
        const d = await browser.storage.session.get("vaultchain_token");
        const t = d.vaultchain_token;
        if (!t) return;

        await fetch(
          `${API_BASE}/entries/${encodeURIComponent(msg.entryName)}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${t}`,
            },
            body: JSON.stringify({ password: msg.newPassword }),
          }
        );
      } catch {}
    })();
    return false;
  }

  if (msg.type === "GET_TOKEN") {
    browser.storage.session
      .get("vaultchain_token")
      .then((d) =>
        sendResponse({ token: d.vaultchain_token || null })
      );
    return true;
  }
  if (msg.type === "SET_TOKEN") {
    browser.storage.session
      .set({ vaultchain_token: msg.token })
      .then(() => sendResponse({ ok: true }));
    return true;
  }
  if (msg.type === "CLEAR_TOKEN") {
    browser.storage.session
      .remove("vaultchain_token")
      .then(() => sendResponse({ ok: true }));
    return true;
  }
});
