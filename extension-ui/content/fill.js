let dismissed = false;

function fillField(f, v) { f.focus(); f.value = v; f.dispatchEvent(new Event("input", { bubbles: true })); f.dispatchEvent(new Event("change", { bubbles: true })); }

function findUsername(pwField) {
  let el = pwField;
  while (el) {
    let prev = el.previousElementSibling;
    while (prev) {
      if (prev.matches?.('input[type="text"], input[type="email"], input[type="tel"]')) return prev;
      const inputs = prev.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"]');
      if (inputs.length) return inputs[inputs.length - 1];
      prev = prev.previousElementSibling;
    }
    el = el.parentElement;
  }
  return null;
}

function showBanner(entries) {
  if (dismissed || document.getElementById("vc-banner")) return;
  const e = entries[0]; if (!e) return;
  const b = document.createElement("div"); b.id = "vc-banner";
  b.innerHTML = `<div style="position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#4f46e5,#7c3aed);color:white;padding:12px 20px;border-radius:16px;box-shadow:0 8px 32px rgba(79,70,229,0.4);font-family:-apple-system,sans-serif;font-size:14px;z-index:2147483647;display:flex;align-items:center;gap:12px;max-width:400px;width:calc(100% - 40px)"><div style="width:36px;height:36px;border-radius:10px;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;font-weight:bold;flex-shrink:0">${(e.name||"?")[0].toUpperCase()}</div><div style="flex:1;min-width:0"><div style="font-weight:600">Fill ${e.name}?</div><div style="font-size:12px;opacity:0.8;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${e.username}</div></div><button id="vc-yes" style="background:white;color:#4f46e5;border:none;padding:8px 16px;border-radius:10px;font-weight:600;cursor:pointer;flex-shrink:0">Fill</button><button id="vc-no" style="background:rgba(255,255,255,0.15);color:white;border:none;width:32px;height:32px;border-radius:8px;cursor:pointer;font-size:16px;flex-shrink:0">&times;</button></div>`;
  document.body.appendChild(b);
  document.getElementById("vc-yes").onclick = () => { browser.runtime.sendMessage({ type: "FILL_ENTRY", name: e.name }); b.remove(); };
  document.getElementById("vc-no").onclick = () => { dismissed = true; b.remove(); };
}

browser.runtime.onMessage.addListener((msg) => {
  if (msg.type === "FILL_CREDENTIALS") {
    const pw = document.querySelector('input[type="password"]');
    if (!pw) return;
    fillField(pw, msg.password);
    const un = findUsername(pw);
    if (un && msg.username) fillField(un, msg.username);
  }
  if (msg.type === "SHOW_AUTOFILL_BANNER") showBanner(msg.matched || []);
});

if (document.querySelector('input[type="password"]')) {
  setTimeout(() => {
    if (!document.querySelector('input[type="password"]')) return;
    browser.runtime.sendMessage({ type: "CHECK_AUTOFILL" });
  }, 1000);
}
