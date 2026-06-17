// ═══════════════════════════════════════════════════════
// VaultChain Extension — Background Service Worker
// Session keystore using browser.storage.session
// ═══════════════════════════════════════════════════════

// Allow browser.storage.session to be accessed from the popup context.
// This is required in Manifest V3 for Firefox.
try {
  browser.storage.session.setAccessLevel({ accessLevel: "TRUSTED_AND_UNTRUSTED_CONTEXTS" });
} catch {
  // Older Firefox versions may not support setAccessLevel — the popup
  // can still use browser.storage.session directly in those cases.
}

// ─── Message handler for future extensibility ───
// The popup currently manages tokens directly via browser.storage.session,
// but this handler allows context menus or other features to query state.
browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "GET_TOKEN") {
    browser.storage.session.get("vaultchain_token").then((data) => {
      sendResponse({ token: data.vaultchain_token || null });
    });
    return true; // async sendResponse
  }

  if (message.type === "SET_TOKEN") {
    browser.storage.session
      .set({ vaultchain_token: message.token })
      .then(() => sendResponse({ ok: true }));
    return true;
  }

  if (message.type === "CLEAR_TOKEN") {
    browser.storage.session
      .remove("vaultchain_token")
      .then(() => sendResponse({ ok: true }));
    return true;
  }
});
