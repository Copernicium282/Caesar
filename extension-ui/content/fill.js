let dismissed = false;
let notificationBar = null;

function fillField(f, v) {
  f.focus();
  f.value = v;
  f.dispatchEvent(new Event("input", { bubbles: true }));
  f.dispatchEvent(new Event("change", { bubbles: true }));
}

function findUsername(pwField) {
  let el = pwField;
  while (el) {
    let prev = el.previousElementSibling;
    while (prev) {
      if (
        prev.matches(
          'input[type="text"], input[type="email"], input[type="tel"]'
        )
      )
        return prev;
      const inputs = prev.querySelectorAll(
        'input[type="text"], input[type="email"], input[type="tel"]'
      );
      if (inputs.length)
        return inputs[inputs.length - 1];
      prev = prev.previousElementSibling;
    }
    el = el.parentElement;
  }
  return null;
}

function showBanner(entries) {
  if (dismissed || document.getElementById("vc-banner")) return;
  const e = entries[0];
  if (!e) return;
  const b = document.createElement("div");
  b.id = "vc-banner";
  b.innerHTML = `<div style="position:fixed;bottom:12px;left:50%;transform:translateX(-50%);background:#3d3835;color:#fafaf9;padding:10px 14px;border-radius:6px;border:1px solid #57534e;box-shadow:0 4px 16px rgba(0,0,0,0.4);font-family:'JetBrains Mono',ui-monospace,monospace;font-size:12px;z-index:2147483647;display:flex;align-items:center;gap:10px;max-width:320px;width:calc(100% - 24px)"><div style="flex:1;min-width:0"><div style="font-weight:600;color:#fafaf9">Fill ${e.name}?</div><div style="font-size:11px;color:#a8a29e;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${e.username}</div></div><button id="vc-yes" style="background:#c9a84c;color:#1c1917;border:none;padding:6px 12px;border-radius:4px;font-weight:600;cursor:pointer;flex-shrink:0;font-size:11px;font-family:inherit">Fill</button><button id="vc-no" style="background:transparent;color:#78716c;border:1px solid #44403c;width:28px;height:28px;border-radius:4px;cursor:pointer;font-size:14px;flex-shrink:0;display:flex;align-items:center;justify-content:center">&times;</button></div>`;
  document.body.appendChild(b);
  document.getElementById("vc-yes").onclick = function() {
    browser.runtime.sendMessage({ type: "FILL_ENTRY", name: e.name });
    b.remove();
  };
  document.getElementById("vc-no").onclick = function() {
    dismissed = true;
    b.remove();
  };
}

function showSaveNotification(data) {
  if (notificationBar) return;
  const bar = document.createElement("div");
  notificationBar = bar;
  bar.id = "vc-save-bar";
  bar.innerHTML = `<div style="position:fixed;top:0;left:0;right:0;background:#3d3835;color:#fafaf9;padding:10px 14px;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:12px;z-index:2147483647;display:flex;align-items:center;gap:10px;border-bottom:1px solid #57534e"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" strokeWidth="2" style="flex-shrink:0"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg><div style="flex:1;min-width:0"><div style="font-weight:600;color:#fafaf9">Save to Caesar?</div><div style="font-size:11px;color:#a8a29e;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${data.url || window.location.href}</div></div><button id="vc-save-yes" style="background:#c9a84c;color:#1c1917;border:none;padding:6px 12px;border-radius:4px;font-weight:600;cursor:pointer;flex-shrink:0;font-size:11px;font-family:inherit">Save</button><button id="vc-save-no" style="background:transparent;color:#78716c;border:1px solid #44403c;padding:6px 10px;border-radius:4px;cursor:pointer;font-size:11px;font-family:inherit">Dismiss</button></div>`;
  document.body.appendChild(bar);

  document.getElementById("vc-save-yes").onclick = function() {
    browser.runtime.sendMessage({
      type: "SAVE_LOGIN",
      username: "",
      password: "",
      url: data.url || window.location.href,
    });
    bar.remove();
    notificationBar = null;
  };

  document.getElementById("vc-save-no").onclick = function() {
    bar.remove();
    notificationBar = null;
  };

  setTimeout(function() {
    if (bar.parentNode) {
      bar.remove();
      notificationBar = null;
    }
  }, 10000);
}

function showUpdateNotification(data) {
  if (notificationBar) return;
  const bar = document.createElement("div");
  notificationBar = bar;
  bar.id = "vc-update-bar";
  bar.innerHTML = `<div style="position:fixed;top:0;left:0;right:0;background:#3d3835;color:#fafaf9;padding:10px 14px;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:12px;z-index:2147483647;display:flex;align-items:center;gap:10px;border-bottom:1px solid #57534e"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" strokeWidth="2" style="flex-shrink:0"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg><div style="flex:1;min-width:0"><div style="font-weight:600;color:#fafaf9">Update ${data.entryName}?</div><div style="font-size:11px;color:#a8a29e">Password changed on this page</div></div><button id="vc-update-yes" style="background:#c9a84c;color:#1c1917;border:none;padding:6px 12px;border-radius:4px;font-weight:600;cursor:pointer;flex-shrink:0;font-size:11px;font-family:inherit">Update</button><button id="vc-update-no" style="background:transparent;color:#78716c;border:1px solid #44403c;padding:6px 10px;border-radius:4px;cursor:pointer;font-size:11px;font-family:inherit">Dismiss</button></div>`;
  document.body.appendChild(bar);

  document.getElementById("vc-update-yes").onclick = function() {
    browser.runtime.sendMessage({
      type: "UPDATE_PASSWORD",
      entryName: data.entryName,
      newPassword: data.newPassword,
    });
    bar.remove();
    notificationBar = null;
  };

  document.getElementById("vc-update-no").onclick = function() {
    bar.remove();
    notificationBar = null;
  };

  setTimeout(function() {
    if (bar.parentNode) {
      bar.remove();
      notificationBar = null;
    }
  }, 10000);
}

function detectPasswordChange() {
  const pwFields = document.querySelectorAll('input[type="password"]');
  pwFields.forEach(function(pwField) {
    const input = pwField;
    if (input.value && input.value.length > 0) {
      // Track changes for update detection
    }
  });
}

browser.runtime.onMessage.addListener(function(msg) {
  if (msg.type === "FILL_CREDENTIALS") {
    const pw = document.querySelector('input[type="password"]');
    if (!pw) return;
    fillField(pw, msg.password || "");
    const un = findUsername(pw);
    if (un && msg.username) fillField(un, msg.username);
  }
  if (msg.type === "SHOW_AUTOFILL_BANNER")
    showBanner(msg.matched || []);
  if (msg.type === "SHOW_SAVE_NOTIFICATION" && msg.url) {
    showSaveNotification({
      username: msg.username || "",
      password: msg.password || "",
      url: msg.url,
    });
  }
  if (msg.type === "SHOW_UPDATE_NOTIFICATION" && msg.entryName && msg.newPassword) {
    showUpdateNotification({
      entryName: msg.entryName,
      newPassword: msg.newPassword,
    });
  }
});

// Autofill-on-load detection
if (document.querySelector('input[type="password"]')) {
  setTimeout(function() {
    if (!document.querySelector('input[type="password"]')) return;
    browser.runtime.sendMessage({ type: "CHECK_AUTOFILL" });
  }, 1000);
}

// Detect form submissions with password fields
document.addEventListener(
  "submit",
  function(e) {
    const form = e.target;
    const pwField = form ? form.querySelector('input[type="password"]') : null;
    if (!pwField || !pwField.value) return;

    const unField = findUsername(pwField);
    const username = unField ? unField.value : "";

    browser.runtime.sendMessage({
      type: "DETECT_LOGIN_SUBMIT",
      username: username,
      password: pwField.value,
      url: window.location.href,
    });
  },
  true
);

// Detect password field changes for update detection
document.addEventListener("input", function(e) {
  const target = e.target;
  if (target && target.type === "password" && target.value) {
    detectPasswordChange();
  }
});
