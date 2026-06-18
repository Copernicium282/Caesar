import { useState, useEffect, useCallback, useRef } from "react";
import { unlock as apiUnlock, lock as apiLock, getMatchedEntries, getPassword, generatePassword, addEntry as apiAddEntry, type Entry, type MatchResult } from "./api";
import "./index.css";

const SERVICE_COLORS: Record<string, { color: string; letter: string }> = {
  github: { color: "#24292e", letter: "G" }, google: { color: "#4285f4", letter: "G" },
  facebook: { color: "#1877f2", letter: "f" }, snapchat: { color: "#fffc00", letter: "👻" },
  linkedin: { color: "#0a66c2", letter: "in" }, amazon: { color: "#ff9900", letter: "a" },
  figma: { color: "#a259ff", letter: "F" },
};
function svc(name: string) { const l = name.toLowerCase(); for (const [k, v] of Object.entries(SERVICE_COLORS)) { if (l.includes(k)) return v; } return { color: "#6366f1", letter: name[0]?.toUpperCase() || "?" }; }

type View = "vault" | "generator" | "add" | "settings";

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [shakeKey, setShakeKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [search, setSearch] = useState("");
  const [copiedName, setCopiedName] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [view, setView] = useState<View>("vault");
  const [selEntry, setSelEntry] = useState<Entry | null>(null);
  const clipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchEntries = useCallback(async (tok: string) => {
    setFetching(true);
    try {
      let r: MatchResult;
      try { const tabs = await browser.tabs.query({ active: true, currentWindow: true }); r = await getMatchedEntries(tabs[0]?.url || "", tok); }
      catch { r = await getMatchedEntries("about:blank", tok); }
      setMatchResult(r);
    } catch { setToken(null); setError("Session expired."); }
    finally { setFetching(false); }
  }, []);

  useEffect(() => { browser.storage.session.get("vaultchain_token").then((d) => { const s = d.vaultchain_token as string | undefined; if (s) { setToken(s); fetchEntries(s); } }); }, [fetchEntries]);

  const err = (m: string) => { setError(m); setShakeKey((k) => k + 1); };

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault(); if (!password.trim()) return; setLoading(true); setError("");
    try { const d = await apiUnlock(password); if (d.token) { await browser.storage.session.set({ vaultchain_token: d.token }); setToken(d.token); setPassword(""); setShowPw(false); fetchEntries(d.token); } else err("Invalid response"); }
    catch (e) { err(e instanceof Error ? e.message : "Unlock failed"); }
    finally { setLoading(false); }
  };

  const show = (m: string) => { if (toastTimer.current) clearTimeout(toastTimer.current); setToast(m); toastTimer.current = setTimeout(() => setToast(null), 2500); };

  const handleCopy = async (entry: Entry) => {
    if (!token || copiedName === entry.name) return;
    try { const d = await getPassword(entry.name, token); await navigator.clipboard.writeText(d.password); setCopiedName(entry.name); show("Password copied");
      if (clipTimer.current) clearTimeout(clipTimer.current); clipTimer.current = setTimeout(() => { navigator.clipboard.writeText("").catch(() => {}); setCopiedName(null); }, 30000);
      setTimeout(() => setCopiedName(null), 2000);
    } catch { setToken(null); err("Session expired."); }
  };

  const handleLock = async () => { if (token) { try { await apiLock(token); } catch {} } await browser.storage.session.remove("vaultchain_token"); setToken(null); setMatchResult(null); setSearch(""); setView("vault"); };

  const handleFill = async (entry: Entry) => {
    if (!token) return;
    try { const d = await getPassword(entry.name, token); const tabs = await browser.tabs.query({ active: true, currentWindow: true }); const id = tabs[0]?.id; if (id) { browser.tabs.sendMessage(id, { type: "FILL_CREDENTIALS", username: entry.username, password: d.password }); show("Credentials filled"); } }
    catch { setToken(null); err("Session expired."); }
  };

  const filter = (entries: Entry[]) => { if (!search.trim()) return entries; const q = search.toLowerCase(); return entries.filter((e) => e.name.toLowerCase().includes(q) || e.username.toLowerCase().includes(q) || (e.uris || []).some((u) => u.toLowerCase().includes(q))); };
  const filtered = matchResult ? { matched: filter(matchResult.matched), unmatched: filter(matchResult.unmatched) } : null;
  const total = filtered ? filtered.matched.length + filtered.unmatched.length : 0;

  if (!token) {
    return (
      <div className="flex flex-col items-center justify-center p-8 min-h-[520px]" style={{background:"linear-gradient(to bottom, #1e1b4b, #030712 60%)"}}>
        <div className="w-full max-w-xs space-y-6 fade-in">
          <div className="text-center">
            <div className="w-24 h-24 mx-auto mb-5 rounded-3xl flex items-center justify-center shadow-2xl" style={{background:"linear-gradient(135deg, #6366f1, #9333ea)", boxShadow:"0 25px 50px -12px rgba(99,102,241,0.3)"}}>
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </div>
            <h1 className="text-2xl font-bold text-white">Enhance safety with</h1>
            <h1 className="text-2xl font-bold text-white">Total security</h1>
            <p className="text-sm text-gray-400 mt-2">Protect your passwords with AES-256 encryption</p>
          </div>
          <form onSubmit={handleUnlock} className="space-y-3">
            <div className="relative">
              <input type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Master Password" autoFocus
                className="w-full px-5 py-4 pr-12 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/10">
                {showPw
                  ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
              </button>
            </div>
            {error && <p key={shakeKey} className="text-sm text-red-400 text-center shake">{error}</p>}
            <button type="submit" disabled={loading || !password.trim()}
              className="w-full py-4 rounded-2xl text-white font-semibold transition-all disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-500"
              style={{background: loading || !password.trim() ? "#374151" : "linear-gradient(135deg, #6366f1, #9333ea)", boxShadow: loading ? "none" : "0 10px 25px -5px rgba(99,102,241,0.3)"}}>
              {loading ? "Unlocking..." : "Unlock"}
            </button>
          </form>
          <p className="text-center text-xs text-gray-600">AES-256-GCM · Argon2id · On-Chain Verified</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[520px] bg-gray-950 fade-in relative">
      <div className="px-5 pt-5 pb-2">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button className="p-1 text-gray-400 hover:text-white"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg></button>
            <div><h1 className="text-lg font-bold text-white">Hello, User</h1><p className="text-xs text-gray-500">{total} passwords saved</p></div>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-xl bg-white/5 text-gray-400 hover:text-white"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg></button>
            <button onClick={handleLock} className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold" style={{background:"linear-gradient(135deg, #6366f1, #9333ea)"}}>U</button>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..."
              className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
          </div>
          <button className="w-12 rounded-2xl flex items-center justify-center text-white flex-shrink-0" style={{background:"#6366f1"}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
          </button>
        </div>
      </div>

      <div className="px-5 py-3">
        <div className="flex items-center justify-between mb-3"><h2 className="text-sm font-bold text-white">Manage Password</h2><button className="text-xs text-indigo-400 font-medium">See All</button></div>
        <div className="flex gap-3">
          {[{icon:"👤",label:"Social",bg:"rgba(16,185,129,0.15)",border:"rgba(16,185,129,0.2)"},{icon:"🔑",label:"Apps",bg:"rgba(59,130,246,0.15)",border:"rgba(59,130,246,0.2)"},{icon:"💳",label:"Card",bg:"rgba(245,158,11,0.15)",border:"rgba(245,158,11,0.2)"}].map(c => (
            <button key={c.label} className="flex-1 flex flex-col items-center gap-2 py-4 rounded-2xl border transition-colors hover:brightness-110" style={{background:c.bg,borderColor:c.border}}>
              <span className="text-xl">{c.icon}</span><span className="text-xs font-medium text-gray-300">{c.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-2">
        <div className="flex items-center justify-between mb-2"><h2 className="text-sm font-bold text-white">Recently Used</h2><button className="text-xs text-gray-500">Show all</button></div>
        {fetching && [...Array(4)].map((_, i) => <div key={i} className="flex items-center gap-3 py-3 px-3 rounded-2xl bg-white/[0.02] mb-1"><div className="w-10 h-10 rounded-xl bg-white/5 animate-pulse"/><div className="flex-1 space-y-2"><div className="h-3 w-24 bg-white/5 rounded-full animate-pulse"/><div className="h-2.5 w-36 bg-white/5 rounded-full animate-pulse"/></div></div>)}
        {!fetching && filtered && total === 0 && <div className="flex flex-col items-center py-12 text-gray-500"><div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-3"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.4"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div><p className="text-sm">{search ? "No matching entries" : "No entries yet"}</p></div>}
        {!fetching && filtered && filtered.matched.length > 0 && <div className="mb-3"><p className="text-[10px] font-semibold text-indigo-400 uppercase tracking-widest mb-2">This site</p>{filtered.matched.map(e => <EntryRow key={e.name} entry={e} copiedName={copiedName} onCopy={handleCopy} onFill={handleFill} onGen={(ent) => { setSelEntry(ent); setView("generator"); }} />)}</div>}
        {!fetching && filtered && filtered.unmatched.length > 0 && <div>{filtered.matched.length > 0 && <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2">All items</p>}{filtered.unmatched.map(e => <EntryRow key={e.name} entry={e} copiedName={copiedName} onCopy={handleCopy} onFill={handleFill} onGen={(ent) => { setSelEntry(ent); setView("generator"); }} />)}</div>}
      </div>

      <div className="flex items-center justify-between px-6 py-3 border-t border-white/5 bg-gray-950 relative">
        <Nav active={view === "vault"} onClick={() => setView("vault")}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></Nav>
        <Nav onClick={() => {}}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></Nav>
        <button onClick={() => setView("add")} className="w-14 h-14 -mt-6 rounded-full flex items-center justify-center text-white shadow-lg" style={{background:"linear-gradient(135deg, #6366f1, #9333ea)", boxShadow:"0 10px 25px -5px rgba(99,102,241,0.4)"}}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
        <Nav onClick={() => {}}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></Nav>
        <Nav active={view === "settings"} onClick={() => setView("settings")}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></Nav>
      </div>

      {view === "generator" && <GenView token={token} entry={selEntry} onBack={() => setView("vault")} show={show} />}
      {view === "add" && <AddView token={token} onBack={() => setView("vault")} show={show} onSaved={() => { setView("vault"); fetchEntries(token!); }} />}
      {view === "settings" && <SettingsView onLock={handleLock} onBack={() => setView("vault")} />}

      {error && <div className="px-4 py-2 bg-red-950/50 border-t border-red-900/50"><p className="text-xs text-red-400 text-center">{error}</p></div>}
      {toast && <div className="fixed bottom-24 left-1/2 -translate-x-1/2 flex items-center gap-2 px-5 py-3 rounded-full shadow-xl text-sm text-white font-medium toast-in z-50" style={{background:"#4f46e5",boxShadow:"0 10px 25px -5px rgba(79,70,229,0.3)"}}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>{toast}
      </div>}
    </div>
  );
}

function EntryRow({ entry, copiedName, onCopy, onFill, onGen }: { entry: Entry; copiedName: string | null; onCopy: (e: Entry) => void; onFill: (e: Entry) => void; onGen: (e: Entry) => void; }) {
  const info = svc(entry.name); const isCopied = copiedName === entry.name;
  return (
    <div className="flex items-center gap-3 py-3 px-3 rounded-2xl hover:bg-white/[0.03] transition-colors group mb-1">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-white text-sm font-bold" style={{backgroundColor: info.color}}>{info.letter}</div>
      <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-white truncate">{entry.name}</p><p className="text-xs text-gray-400 truncate">{entry.username}</p></div>
      <div className="flex items-center gap-0.5">
        <button onClick={() => onCopy(entry)} className="p-2 rounded-xl hover:bg-white/10 transition-colors" title="Copy">
          {isCopied ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400 group-hover:text-white"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>}
        </button>
        <button onClick={() => onGen(entry)} className="p-2 rounded-xl hover:bg-white/10 transition-colors text-gray-400 hover:text-white" title="Generate"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg></button>
        <button onClick={() => onFill(entry)} className="p-2 rounded-xl hover:bg-white/10 transition-colors text-gray-400 hover:text-white" title="Fill"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></button>
      </div>
    </div>
  );
}

function Nav({ active, onClick, children }: { active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={`p-2 rounded-xl transition-colors ${active ? "text-indigo-400" : "text-gray-500 hover:text-gray-300"}`}>{children}</button>;
}

function GenView({ token, entry, onBack, show }: { token: string; entry: Entry | null; onBack: () => void; show: (m: string) => void; }) {
  const [length, setLength] = useState(16);
  const [pw, setPw] = useState("");
  const [gen, setGen] = useState(false);
  const [copied, setCopied] = useState(false);

  const doGen = useCallback(async () => { setGen(true); try { const d = await generatePassword(length, token); setPw(d.password); setCopied(false); } catch {} setGen(false); }, [length, token]);
  useEffect(() => { doGen(); }, []);
  const copy = async () => { if (!pw) return; await navigator.clipboard.writeText(pw); setCopied(true); show("Password copied"); setTimeout(() => setCopied(false), 2000); };
  const info = entry ? svc(entry.name) : null;

  return (
    <div className="absolute inset-0 bg-gray-950 flex flex-col fade-in z-40">
      <div className="flex items-center gap-3 px-5 pt-5 pb-3">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg></button>
        <h2 className="text-lg font-bold text-white">Password Generator</h2>
      </div>
      <div className="flex-1 px-5 space-y-5 overflow-y-auto">
        {entry && info && <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/10"><div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold" style={{backgroundColor: info.color}}>{info.letter}</div><div><p className="text-sm font-semibold text-white">{entry.name}</p><p className="text-xs text-gray-400">{entry.username}</p></div></div>}
        {entry && <div className="flex items-center justify-between"><div><p className="text-xs text-gray-500 mb-0.5">User id</p><p className="text-sm text-white">{entry.username}</p></div><div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg></div></div>}
        <div><p className="text-xs text-gray-500 mb-2 text-center">Password</p><div className="p-4 rounded-2xl bg-white/5 border border-white/10"><p className="text-base font-mono text-white text-center tracking-wider break-all">{pw || "—"}</p></div></div>
        <div><div className="flex items-center justify-between mb-2"><span className="text-sm text-gray-400">Length</span><span className="text-sm font-bold text-indigo-400 px-3 py-1 rounded-full" style={{background:"rgba(99,102,241,0.15)"}}>{length}</span></div><input type="range" min={8} max={64} value={length} onChange={(e) => setLength(Number(e.target.value))} className="w-full cursor-pointer"/></div>
        <div className="grid grid-cols-2 gap-3">{["Uppercase","Lowercase","Numbers","Symbol"].map(l => <div key={l} className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.03] border border-white/5"><span className="text-xs text-gray-300">{l}</span><div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg></div></div>)}</div>
        <div className="flex gap-3 pb-4">
          <button onClick={copy} disabled={!pw} className="flex-1 py-3.5 rounded-2xl text-white font-semibold transition-all flex items-center justify-center gap-2 disabled:from-gray-700 disabled:to-gray-700" style={{background: pw ? "linear-gradient(135deg, #10b981, #14b8a6)" : "#374151"}}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            {copied ? "Copied!" : "Copy to clipboard"}
          </button>
          <button onClick={doGen} disabled={gen} className="w-14 rounded-2xl border-2 flex items-center justify-center transition-colors flex-shrink-0" style={{background:"rgba(245,158,11,0.2)",borderColor:"#f59e0b",color:"#fbbf24"}}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={gen ? "animate-spin" : ""}><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
}

function AddView({ token, onBack, show, onSaved }: { token: string; onBack: () => void; show: (m: string) => void; onSaved: () => void; }) {
  const [name, setName] = useState(""); const [username, setUsername] = useState(""); const [password, setPassword] = useState(""); const [uri, setUri] = useState(""); const [saving, setSaving] = useState(false); const [tab, setTab] = useState("");
  useEffect(() => { browser.tabs.query({ active: true, currentWindow: true }).then((t) => { try { setTab(new URL(t[0]?.url || "").hostname); } catch {} }); }, []);
  const save = async () => { if (!name.trim() || !username.trim() || !password.trim()) return; setSaving(true); try { await apiAddEntry({ name: name.trim(), username: username.trim(), password: password.trim(), uris: uri.trim() ? [uri.trim()] : tab ? [tab] : [] }, token); show("Entry saved"); onSaved(); } catch (e) { show(e instanceof Error ? e.message : "Failed"); } setSaving(false); };

  return (
    <div className="absolute inset-0 bg-gray-950 flex flex-col fade-in z-40">
      <div className="flex items-center gap-3 px-5 pt-5 pb-3"><button onClick={onBack} className="p-2 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg></button><h2 className="text-lg font-bold text-white">Add Entry</h2></div>
      <div className="flex-1 px-5 space-y-4 overflow-y-auto">
        {tab && <div className="px-4 py-2.5 rounded-xl" style={{background:"rgba(99,102,241,0.1)",border:"1px solid rgba(99,102,241,0.2)"}}><p className="text-xs text-indigo-400">Current site: <span className="font-medium text-indigo-300">{tab}</span></p></div>}
        {[{l:"Name",v:name,s:setName,p:"e.g. GitHub"},{l:"Username",v:username,s:setUsername,p:"e.g. user@email.com"},{l:"Password",v:password,s:setPassword,p:"Enter password",t:"password"},{l:"URI (optional)",v:uri,s:setUri,p:tab||"e.g. github.com"}].map(f => <div key={f.l}><label className="text-xs text-gray-500 mb-1.5 block">{f.l}</label><input type={f.t||"text"} value={f.v} onChange={(e)=>f.s(e.target.value)} placeholder={f.p} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"/></div>)}
        <button onClick={save} disabled={saving||!name.trim()||!username.trim()||!password.trim()} className="w-full py-3.5 rounded-2xl text-white font-semibold transition-all mt-4 disabled:from-gray-700 disabled:to-gray-700" style={{background:(saving||!name.trim()||!username.trim()||!password.trim())?"#374151":"linear-gradient(135deg, #6366f1, #9333ea)"}}>{saving?"Saving...":"Save Entry"}</button>
      </div>
    </div>
  );
}

function SettingsView({ onLock, onBack }: { onLock: () => void; onBack: () => void }) {
  return (
    <div className="absolute inset-0 bg-gray-950 flex flex-col fade-in z-40">
      <div className="flex items-center gap-3 px-5 pt-5 pb-3"><button onClick={onBack} className="p-2 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg></button><h2 className="text-lg font-bold text-white">Settings</h2></div>
      <div className="flex-1 px-5 space-y-1">
        <button onClick={onLock} className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-colors hover:bg-red-500/10 text-red-400"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg><span className="text-sm font-medium">Lock Vault</span></button>
        <button className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-colors hover:bg-white/5 text-gray-300"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg><span className="text-sm font-medium">About VaultChain</span></button>
      </div>
      <div className="px-5 py-4 text-center"><p className="text-xs text-gray-600">VaultChain v0.1.0</p></div>
    </div>
  );
}
