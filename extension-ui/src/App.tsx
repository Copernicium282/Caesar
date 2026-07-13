import { useState, useEffect, useCallback } from "react";
import { Eye, EyeOff, AlertTriangle } from "lucide-react";
import {
  unlock as apiUnlock, lock as apiLock, getMatchedEntriesFiltered,
  getPassword, type Entry, type MatchResult, type Folder as FolderType,
  getFolders, deleteEntry, updateEntry, addEntry as apiAddEntry,
  setTotp as apiSetTotp, restoreEntry, permanentDeleteEntry,
} from "./api";
import { useTheme } from "./shared/theme";
import { useCopy } from "./shared/hooks";
import { type View } from "./shared/types";
import VaultView from "./views/VaultView";
import DetailView from "./views/DetailView";
import AddEditView from "./views/AddEditView";
import GeneratorView from "./views/GeneratorView";
import SettingsView from "./views/SettingsView";
import TrashView from "./views/TrashView";
import SnapshotView from "./views/SnapshotView";
import DrawerNav from "./views/DrawerNav";
import "./index.css";

type Panel = null | "detail" | "add" | "edit";

export default function App() {
  const { palette: C, clipboardClearMs } = useTheme();
  const { copied, copy } = useCopy(clipboardClearMs);
  const [token, setToken] = useState<string | null>(null);
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<View>("vault");
  const [panel, setPanel] = useState<Panel>(null);
  const [drawer, setDrawer] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [selected, setSelected] = useState<Entry | null>(null);
  const [editTarget, setEditTarget] = useState<Entry | null>(null);
  const [fetching, setFetching] = useState(false);

  const fetchEntries = useCallback(async (tok: string) => {
    setFetching(true);
    try {
      let r: MatchResult;
      try {
        const tabs = await browser.tabs.query({ active: true, currentWindow: true });
        r = await getMatchedEntriesFiltered(tabs[0]?.url || "", tok, {});
      } catch {
        r = await getMatchedEntriesFiltered("about:blank", tok, {});
      }
      setEntries([...r.matched, ...r.unmatched]);
    } catch (e) {
      if (e instanceof Error && e.message === "SESSION_EXPIRED") {
        setToken(null);
      }
    } finally {
      setFetching(false);
    }
  }, []);

  const fetchFolders = useCallback(async (tok: string) => {
    try { setFolders(await getFolders(tok)); } catch {}
  }, []);

  useEffect(() => {
    browser.storage.session.get("caesar_token").then((d) => {
      const s = d.caesar_token as string | undefined;
      if (s) { setToken(s); fetchEntries(s); fetchFolders(s); }
    });
    try { browser.runtime.sendMessage({ type: "POPUP_OPEN" }); } catch {}
  }, [fetchEntries, fetchFolders]);

  const handleUnlock = async () => {
    if (!pw.trim()) return;
    setLoading(true); setErr("");
    try {
      const d = await apiUnlock(pw);
      if (d.token) {
        await browser.storage.session.set({ caesar_token: d.token });
        setToken(d.token); setPw(""); setShowPw(false);
        fetchEntries(d.token); fetchFolders(d.token);
      } else setErr("Invalid response");
    } catch (e) { setErr(e instanceof Error ? e.message : "Unlock failed"); }
    finally { setLoading(false); }
  };

  const handleLock = async () => {
    if (token) { try { await apiLock(token); } catch (e) { console.error("[Caesar] lock failed:", e); } }
    await browser.storage.session.remove("caesar_token");
    setToken(null); setEntries([]); setView("vault"); setPanel(null); setDrawer(false);
  };

  const handleCopyPassword = async (name: string, key: string) => {
    if (!token) return;
    try { copy((await getPassword(name, token)).password, key); } catch (e) { console.error("[Caesar] copy password failed:", e); }
  };

  const handleCopyText = (text: string, key: string) => { copy(text, key); };

  const handleFill = async (entry: Entry) => {
    if (!token) return;
    try {
      const d = await getPassword(entry.name, token);
      browser.runtime.sendMessage({ type: "FILL_CREDENTIALS", username: entry.username, password: d.password });
    } catch (e) { console.error("[Caesar] fill failed:", e); }
  };

  const handleDelete = async (name: string) => {
    if (!token) return;
    try { await deleteEntry(name, token); fetchEntries(token); setPanel(null); setSelected(null); } catch (e) { console.error("[Caesar] delete failed:", e); }
  };

  const handleRestore = async (name: string) => {
    if (!token) return;
    try { await restoreEntry(name, token); fetchEntries(token); } catch (e) { console.error("[Caesar] restore failed:", e); }
  };

  const handlePermanentDelete = async (name: string) => {
    if (!token) return;
    try { await permanentDeleteEntry(name, token); } catch (e) { console.error("[Caesar] permanent delete failed:", e); }
  };

  const handleSave = async (data: Partial<Entry>) => {
    if (!token) return;
    try {
      if (editTarget) {
        await updateEntry(editTarget.name, data as Record<string, unknown>, token);
        if ((data as any).totpSecret) await apiSetTotp(editTarget.name, (data as any).totpSecret, token);
      } else {
        await apiAddEntry({ name: data.name || "", username: data.username || "", password: (data as any).password || "", url: data.url, uris: data.uris, notes: data.notes, folder: data.folder, type: data.type || "login" }, token);
        if ((data as any).totpSecret && data.name) await apiSetTotp(data.name, (data as any).totpSecret, token);
      }
      fetchEntries(token); setPanel(null); setEditTarget(null);
    } catch (e) { console.error("[Caesar] save failed:", e); }
  };

  const nav = (v: View) => { setView(v); setPanel(null); };

  // ── Locked: unlock screen ──
  if (!token) {
    return (
      <div className="view-fade flex flex-col items-center justify-center" style={{ background: C.bg, padding: "40px 32px", minHeight: 480 }}>
        <div className="mb-8 text-center">
          <div style={{ fontSize: 24, fontWeight: 700, color: C.accent, marginBottom: 4 }}>Caesar</div>
          <div style={{ fontSize: 11, color: C.inkFaint }}>Your passwords, secured.</div>
        </div>
        <div className="w-full mb-3">
          <div className="relative">
            <input type={showPw ? "text" : "password"} placeholder="Master password" value={pw}
              onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === "Enter" && handleUnlock()}
              className="w-full rounded-md outline-none transition-colors"
              style={{ background: C.surface, color: C.ink, caretColor: C.accent, padding: "8px 12px", height: 38, fontSize: 13, border: `1px solid ${err ? C.error : pw ? C.accent : C.hairline}` }}
              autoFocus />
            <button className="absolute right-2 top-1/2 -translate-y-1/2 hover:opacity-70 transition-opacity"
              style={{ color: C.inkFaint, width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center" }}
              onClick={() => setShowPw(s => !s)}>
              {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          {err && (
            <div className="shake flex items-center gap-1.5 mt-1.5" style={{ fontSize: 11, color: C.error }}>
              <AlertTriangle size={11} /> {err}
            </div>
          )}
        </div>
        <button className="w-full rounded-md font-semibold transition-colors"
          style={{ background: pw ? C.accent : C.surfaceRaised, color: pw ? C.accentTextOn : C.inkFaint, height: 36, fontSize: 13, cursor: loading ? "wait" : "pointer", border: "none" }}
          onClick={handleUnlock} disabled={loading}>
          {loading ? "Unlocking..." : "Unlock"}
        </button>
        <div className="mt-4" style={{ fontSize: 11, color: C.inkFaint }}>AES-256-GCM · Argon2id</div>
      </div>
    );
  }

  const renderPanel = () => {
    if (panel === "detail" && selected) {
      return <DetailView entry={selected} token={token} onBack={() => setPanel(null)}
        onEdit={() => { setEditTarget(selected); setPanel("edit"); }}
        onDelete={() => handleDelete(selected.name)}
        onCopy={handleCopyText} onCopyPassword={handleCopyPassword} copied={copied} />;
    }
    if (panel === "add" || panel === "edit") {
      return <AddEditView entry={panel === "edit" ? editTarget : null} token={token} folders={folders}
        onBack={() => { setPanel(null); setEditTarget(null); }} onSave={handleSave} />;
    }
    return null;
  };

  const renderView = () => {
    if (view === "settings") return <SettingsView onBack={() => nav("vault")} onLock={handleLock} onNav={nav} token={token} />;
    if (view === "trash") return <TrashView token={token} onBack={() => nav("vault")} onRestore={handleRestore} onDelete={handlePermanentDelete} />;
    if (view === "generator") return <GeneratorView onBack={() => nav("vault")} token={token} />;
    if (view === "snapshot") return <SnapshotView onBack={() => nav("vault")} token={token} />;
    return (
      <VaultView entries={entries} fetching={fetching}
        onViewEntry={e => { setSelected(e); setPanel("detail"); }}
        onEditEntry={e => { setEditTarget(e); setPanel("edit"); }}
        onAdd={() => setPanel("add")} onMenu={() => setDrawer(true)} onNav={nav}
        onCopy={handleCopyText} onCopyPassword={handleCopyPassword} onFill={handleFill} copied={copied} />
    );
  };

  return (
    <div className="relative" style={{ background: C.bg, width: 380, minHeight: 480, maxHeight: 580, overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, overflow: "auto" }}>{renderView()}</div>
      {panel && <div className="absolute inset-0 view-fade" style={{ background: C.bg, zIndex: 5 }}>{renderPanel()}</div>}
      {drawer && <div className="absolute inset-0" style={{ zIndex: 10 }}><DrawerNav view={view} onClose={() => setDrawer(false)} onNav={nav} folders={folders} /></div>}
    </div>
  );
}
