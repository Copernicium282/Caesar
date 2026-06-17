// ═══════════════════════════════════════════════════════
// VaultChain Extension — Popup Logic
// ═══════════════════════════════════════════════════════

const API_BASE = "http://127.0.0.1:9876";
const CLIPBOARD_CLEAR_MS = 30_000;

// ─── DOM References ───
const unlockView = document.getElementById("unlock-view");
const entriesView = document.getElementById("entries-view");
const unlockForm = document.getElementById("unlock-form");
const passwordInput = document.getElementById("password-input");
const unlockBtn = document.getElementById("unlock-btn");
const unlockError = document.getElementById("unlock-error");
const togglePassword = document.getElementById("toggle-password");
const eyeOpen = document.getElementById("eye-open");
const eyeClosed = document.getElementById("eye-closed");
const searchInput = document.getElementById("search-input");
const entriesList = document.getElementById("entries-list");
const entriesCountText = document.getElementById("entries-count-text");
const emptyState = document.getElementById("empty-state");
const lockBtn = document.getElementById("lock-btn");
const clipboardToast = document.getElementById("clipboard-toast");

let clipboardClearTimer = null;
let toastTimer = null;

// ─── Icons (SVG strings) ───
const COPY_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
const CHECK_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;

// ═══════════════════════════════════════════════════════
// Session Token Management (via browser.storage.session)
// ═══════════════════════════════════════════════════════

async function getToken() {
  try {
    const data = await browser.storage.session.get("vaultchain_token");
    return data.vaultchain_token || null;
  } catch {
    return null;
  }
}

async function setToken(token) {
  await browser.storage.session.set({ vaultchain_token: token });
}

async function clearToken() {
  await browser.storage.session.remove("vaultchain_token");
}

// ═══════════════════════════════════════════════════════
// API Helpers
// ═══════════════════════════════════════════════════════

async function apiPost(path, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Request failed (${res.status})`);
  }
  return res.json();
}

async function apiGet(path, token) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Request failed (${res.status})`);
  }
  return res.json();
}

// ═══════════════════════════════════════════════════════
// View Management
// ═══════════════════════════════════════════════════════

function showView(view) {
  unlockView.style.display = "none";
  entriesView.style.display = "none";
  view.style.display = "";
  // Re-trigger fade-in animation
  view.classList.remove("view");
  void view.offsetWidth; // force reflow
  view.classList.add("view");
}

// ═══════════════════════════════════════════════════════
// Unlock Flow
// ═══════════════════════════════════════════════════════

unlockForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const password = passwordInput.value.trim();
  if (!password) return;

  // UI: loading state
  unlockBtn.classList.add("loading");
  unlockBtn.disabled = true;
  unlockError.textContent = "";

  try {
    const data = await apiPost("/unlock", { MasterPwd: password });

    if (data.token) {
      // Store session token
      await setToken(data.token);

      // Switch to entries view
      passwordInput.value = "";
      showView(entriesView);
      await fetchAndRenderEntries(data.token);
    } else {
      showError("Invalid response from server");
    }
  } catch (err) {
    showError(
      err.message === "Failed to fetch"
        ? "Cannot reach VaultChain server. Is it running?"
        : err.message || "Unlock failed"
    );
  } finally {
    unlockBtn.classList.remove("loading");
    unlockBtn.disabled = false;
  }
});

function showError(msg) {
  unlockError.textContent = msg;
  unlockError.classList.remove("shake");
  void unlockError.offsetWidth;
  unlockError.classList.add("shake");
}

// Toggle password visibility
togglePassword.addEventListener("click", () => {
  const isPassword = passwordInput.type === "password";
  passwordInput.type = isPassword ? "text" : "password";
  eyeOpen.style.display = isPassword ? "none" : "";
  eyeClosed.style.display = isPassword ? "" : "none";
});

// ═══════════════════════════════════════════════════════
// Entries Rendering
// ═══════════════════════════════════════════════════════

function showSkeletons() {
  entriesList.innerHTML = "";
  for (let i = 0; i < 5; i++) {
    const skeleton = document.createElement("div");
    skeleton.className = "skeleton-row";
    skeleton.innerHTML = `
      <div class="skeleton-avatar"></div>
      <div class="skeleton-lines">
        <div class="skeleton-line"></div>
        <div class="skeleton-line"></div>
        <div class="skeleton-line"></div>
      </div>
    `;
    entriesList.appendChild(skeleton);
  }
}

async function fetchAndRenderEntries(token) {
  showSkeletons();

  try {
    const entries = await apiGet("/entries", token);
    renderEntries(entries);
  } catch (err) {
    entriesList.innerHTML = "";
    if (err.message === "Unauthorized" || err.message.includes("401")) {
      // Session expired — go back to unlock
      await clearToken();
      showView(unlockView);
      showError("Session expired. Please unlock again.");
    } else {
      emptyState.querySelector("p").textContent = "Failed to load entries";
      emptyState.style.display = "";
    }
  }
}

function renderEntries(entries) {
  entriesList.innerHTML = "";

  if (!entries || entries.length === 0) {
    entriesCountText.textContent = "0 entries";
    emptyState.style.display = "";
    return;
  }

  emptyState.style.display = "none";
  entriesCountText.textContent = `${entries.length} ${entries.length === 1 ? "entry" : "entries"}`;

  entries.forEach((entry) => {
    const row = document.createElement("div");
    row.className = "entry-row";
    row.dataset.name = entry.name || "";
    row.dataset.username = entry.username || "";
    row.dataset.url = entry.url || "";

    const initial = (entry.name || "?")[0];
    const urlDisplay = entry.url
      ? `<span class="entry-url">
           <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
           ${escapeHtml(entry.url)}
         </span>`
      : '';

    row.innerHTML = `
      <div class="entry-icon">${escapeHtml(initial)}</div>
      <div class="entry-info">
        <span class="entry-name">${escapeHtml(entry.name || "Untitled")}</span>
        <span class="entry-username">${escapeHtml(entry.username || "—")}</span>
        ${urlDisplay}
      </div>
      <button class="copy-btn" title="Copy password" data-entry-name="${escapeAttr(entry.name)}">
        ${COPY_ICON}
      </button>
    `;

    entriesList.appendChild(row);
  });

  // Attach copy handlers
  entriesList.querySelectorAll(".copy-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      handleCopy(btn);
    });
  });
}

// ═══════════════════════════════════════════════════════
// Copy Password
// ═══════════════════════════════════════════════════════

async function handleCopy(btn) {
  const name = btn.dataset.entryName;
  if (!name || btn.classList.contains("copied")) return;

  const token = await getToken();
  if (!token) {
    showView(unlockView);
    return;
  }

  // Visual feedback: show loading
  const originalHTML = btn.innerHTML;
  btn.disabled = true;

  try {
    const data = await apiGet(`/entries/${encodeURIComponent(name)}/password`, token);

    if (data.password) {
      await navigator.clipboard.writeText(data.password);

      // Show "copied" state
      btn.innerHTML = CHECK_ICON;
      btn.classList.add("copied");

      // Show toast
      showToast();

      // Reset button after 2s
      setTimeout(() => {
        btn.innerHTML = originalHTML;
        btn.classList.remove("copied");
        btn.disabled = false;
      }, 2000);

      // Clear clipboard after 30s
      if (clipboardClearTimer) clearTimeout(clipboardClearTimer);
      clipboardClearTimer = setTimeout(() => {
        navigator.clipboard.writeText("").catch(() => {});
        clipboardClearTimer = null;
      }, CLIPBOARD_CLEAR_MS);
    }
  } catch (err) {
    btn.disabled = false;
    if (err.message === "Unauthorized" || err.message.includes("401")) {
      await clearToken();
      showView(unlockView);
      showError("Session expired. Please unlock again.");
    }
  }
}

function showToast() {
  if (toastTimer) clearTimeout(toastTimer);
  clipboardToast.classList.add("show");
  toastTimer = setTimeout(() => {
    clipboardToast.classList.remove("show");
    toastTimer = null;
  }, 2500);
}

// ═══════════════════════════════════════════════════════
// Search / Filter
// ═══════════════════════════════════════════════════════

searchInput.addEventListener("input", () => {
  const query = searchInput.value.toLowerCase().trim();
  const rows = entriesList.querySelectorAll(".entry-row");
  let visibleCount = 0;

  rows.forEach((row) => {
    const name = (row.dataset.name || "").toLowerCase();
    const username = (row.dataset.username || "").toLowerCase();
    const url = (row.dataset.url || "").toLowerCase();
    const matches = name.includes(query) || username.includes(query) || url.includes(query);
    row.style.display = matches ? "" : "none";
    if (matches) visibleCount++;
  });

  // Update empty state
  if (rows.length > 0) {
    emptyState.style.display = visibleCount === 0 ? "" : "none";
    if (visibleCount === 0) {
      emptyState.querySelector("p").textContent = "No matching entries";
    }
  }
});

// ═══════════════════════════════════════════════════════
// Lock
// ═══════════════════════════════════════════════════════

lockBtn.addEventListener("click", async () => {
  const token = await getToken();

  try {
    if (token) {
      await apiPost("/lock", {}, token);
    }
  } catch {
    // Lock locally even if server call fails
  }

  await clearToken();
  entriesList.innerHTML = "";
  searchInput.value = "";
  showView(unlockView);
});

// ═══════════════════════════════════════════════════════
// Utilities
// ═══════════════════════════════════════════════════════

function escapeHtml(str) {
  const el = document.createElement("span");
  el.textContent = str;
  return el.innerHTML;
}

function escapeAttr(str) {
  return str.replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ═══════════════════════════════════════════════════════
// Init — On popup open
// ═══════════════════════════════════════════════════════

(async function init() {
  const token = await getToken();

  if (token) {
    // We have a stored token — try to use it
    showView(entriesView);
    await fetchAndRenderEntries(token);
  } else {
    // No token — show unlock
    showView(unlockView);
    passwordInput.focus();
  }
})();
