let dismissed = false;
let notificationBar: HTMLDivElement | null = null;

function fillField(f: HTMLInputElement, v: string) {
  f.focus();
  f.value = v;
  f.dispatchEvent(new Event("input", { bubbles: true }));
  f.dispatchEvent(new Event("change", { bubbles: true }));
}

function findUsername(pwField: HTMLInputElement) {
  let el: HTMLElement | null = pwField;
  while (el) {
    let prev = el.previousElementSibling;
    while (prev) {
      if (
        prev.matches?.(
          'input[type="text"], input[type="email"], input[type="tel"]'
        )
      )
        return prev as HTMLInputElement;
      const inputs = prev.querySelectorAll(
        'input[type="text"], input[type="email"], input[type="tel"]'
      );
      if (inputs.length)
        return inputs[inputs.length - 1] as HTMLInputElement;
      prev = prev.previousElementSibling;
    }
    el = el.parentElement;
  }
  return null;
}

function showBanner(entries: Array<{ name: string; username: string }>) {
  if (dismissed || document.getElementById("vc-banner")) return;
  const e = entries[0];
  if (!e) return;
  const b = document.createElement("div");
  b.id = "vc-banner";
  b.innerHTML = `<div style="position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#4f46e5,#7c3aed);color:white;padding:12px 20px;border-radius:16px;box-shadow:0 8px 32px rgba(79,70,229,0.4);font-family:-apple-system,sans-serif;font-size:14px;z-index:2147483647;display:flex;align-items:center;gap:12px;max-width:400px;width:calc(100% - 40px)"><div style="width:36px;height:36px;border-radius:10px;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;font-weight:bold;flex-shrink:0">${(e.name || "?")[0].toUpperCase()}</div><div style="flex:1;min-width:0"><div style="font-weight:600">Fill ${e.name}?</div><div style="font-size:12px;opacity:0.8;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${e.username}</div></div><button id="vc-yes" style="background:white;color:#4f46e5;border:none;padding:8px 16px;border-radius:10px;font-weight:600;cursor:pointer;flex-shrink:0">Fill</button><button id="vc-no" style="background:rgba(255,255,255,0.15);color:white;border:none;width:32px;height:32px;border-radius:8px;cursor:pointer;font-size:16px;flex-shrink:0">&times;</button></div>`;
  document.body.appendChild(b);
  document.getElementById("vc-yes")!.onclick = () => {
    browser.runtime.sendMessage({ type: "FILL_ENTRY", name: e.name });
    b.remove();
  };
  document.getElementById("vc-no")!.onclick = () => {
    dismissed = true;
    b.remove();
  };
}

function showSaveNotification(data: {
  username: string;
  password: string;
  url: string;
}) {
  if (notificationBar) return;
  const bar = document.createElement("div");
  notificationBar = bar;
  bar.id = "vc-save-bar";
  bar.innerHTML = `<div style="position:fixed;top:0;left:0;right:0;background:linear-gradient(135deg,#059669,#10b981);color:white;padding:12px 20px;font-family:-apple-system,sans-serif;font-size:14px;z-index:2147483647;display:flex;align-items:center;gap:12px;box-shadow:0 4px 20px rgba(5,150,105,0.3)"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style="flex-shrink:0"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg><div style="flex:1;min-width:0"><div style="font-weight:600">Save login to VaultChain?</div><div style="font-size:11px;opacity:0.8;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${data.username} • ${new URL(data.url).hostname}</div></div><button id="vc-save-yes" style="background:white;color:#059669;border:none;padding:8px 16px;border-radius:10px;font-weight:600;cursor:pointer;flex-shrink:0;font-size:13px">Save</button><button id="vc-save-no" style="background:rgba(255,255,255,0.15);color:white;border:none;padding:8px 12px;border-radius:10px;cursor:pointer;font-size:13px">Dismiss</button></div>`;
  document.body.appendChild(bar);

  document.getElementById("vc-save-yes")!.onclick = () => {
    browser.runtime.sendMessage({
      type: "SAVE_LOGIN",
      username: data.username,
      password: data.password,
      url: data.url,
    });
    bar.remove();
    notificationBar = null;
  };

  document.getElementById("vc-save-no")!.onclick = () => {
    bar.remove();
    notificationBar = null;
  };

  setTimeout(() => {
    if (bar.parentNode) {
      bar.remove();
      notificationBar = null;
    }
  }, 10000);
}

function showUpdateNotification(data: {
  entryName: string;
  url: string;
  newPassword: string;
}) {
  if (notificationBar) return;
  const bar = document.createElement("div");
  notificationBar = bar;
  bar.id = "vc-update-bar";
  bar.innerHTML = `<div style="position:fixed;top:0;left:0;right:0;background:linear-gradient(135deg,#d97706,#f59e0b);color:white;padding:12px 20px;font-family:-apple-system,sans-serif;font-size:14px;z-index:2147483647;display:flex;align-items:center;gap:12px;box-shadow:0 4px 20px rgba(217,119,6,0.3)"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style="flex-shrink:0"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg><div style="flex:1;min-width:0"><div style="font-weight:600">Update ${data.entryName}?</div><div style="font-size:11px;opacity:0.8">Password changed on this page</div></div><button id="vc-update-yes" style="background:white;color:#d97706;border:none;padding:8px 16px;border-radius:10px;font-weight:600;cursor:pointer;flex-shrink:0;font-size:13px">Update</button><button id="vc-update-no" style="background:rgba(255,255,255,0.15);color:white;border:none;padding:8px 12px;border-radius:10px;cursor:pointer;font-size:13px">Dismiss</button></div>`;
  document.body.appendChild(bar);

  document.getElementById("vc-update-yes")!.onclick = () => {
    browser.runtime.sendMessage({
      type: "UPDATE_PASSWORD",
      entryName: data.entryName,
      newPassword: data.newPassword,
    });
    bar.remove();
    notificationBar = null;
  };

  document.getElementById("vc-update-no")!.onclick = () => {
    bar.remove();
    notificationBar = null;
  };

  setTimeout(() => {
    if (bar.parentNode) {
      bar.remove();
      notificationBar = null;
    }
  }, 10000);
}

let lastPasswordValue = "";
let lastUsernameValue = "";

function detectPasswordChange() {
  const pwFields = document.querySelectorAll('input[type="password"]');
  pwFields.forEach((pwField) => {
    const input = pwField as HTMLInputElement;
    if (input.value && input.value !== lastPasswordValue && input.value.length > 0) {
      lastPasswordValue = input.value;
      const usernameField = findUsername(input);
      const username = usernameField?.value || "";
      if (username !== lastUsernameValue) {
        lastUsernameValue = username;
      }
    }
  });
}

browser.runtime.onMessage.addListener(
  (msg: { type: string; username?: string; password?: string; matched?: Array<{ name: string; username: string }>; entryName?: string; newPassword?: string }) => {
    if (msg.type === "FILL_CREDENTIALS") {
      const pw = document.querySelector(
        'input[type="password"]'
      ) as HTMLInputElement | null;
      if (!pw) return;
      fillField(pw, msg.password || "");
      const un = findUsername(pw);
      if (un && msg.username) fillField(un, msg.username);
    }
    if (msg.type === "SHOW_AUTOFILL_BANNER")
      showBanner(msg.matched || []);
    if (msg.type === "SHOW_SAVE_NOTIFICATION" && msg.username && msg.password && msg.url) {
      showSaveNotification({
        username: msg.username,
        password: msg.password,
        url: msg.url,
      });
    }
    if (msg.type === "SHOW_UPDATE_NOTIFICATION" && msg.entryName && msg.newPassword) {
      showUpdateNotification({
        entryName: msg.entryName,
        url: window.location.href,
        newPassword: msg.newPassword,
      });
    }
  }
);

// Autofill-on-load detection
if (document.querySelector('input[type="password"]')) {
  setTimeout(() => {
    if (!document.querySelector('input[type="password"]')) return;
    browser.runtime.sendMessage({ type: "CHECK_AUTOFILL" });
  }, 1000);
}

// Detect form submissions with password fields
document.addEventListener(
  "submit",
  (e) => {
    const form = e.target as HTMLFormElement;
    const pwField = form?.querySelector(
      'input[type="password"]'
    ) as HTMLInputElement | null;
    if (!pwField || !pwField.value) return;

    const unField = findUsername(pwField);
    const username = unField?.value || "";

    browser.runtime.sendMessage({
      type: "DETECT_LOGIN_SUBMIT",
      username,
      password: pwField.value,
      url: window.location.href,
    });
  },
  true
);

// Detect password field changes for update detection
document.addEventListener("input", (e) => {
  const target = e.target as HTMLInputElement;
  if (target?.type === "password" && target.value) {
    detectPasswordChange();
  }
});
