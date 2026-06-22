import { useState } from "react";
import {
  ChevronRight, Folder, AlertCircle, Upload, Download, Trash2,
  Clock, LogOut, Check, Key,
} from "lucide-react";
import { C } from "../shared/palette";
import { type View } from "../shared/types";
import { TopBar } from "./shared";
import { useSettingsLogic } from "../logic/useSettings";
import { useFolderManagerLogic } from "../logic/useFolderManager";
import { useHealthLogic } from "../logic/useHealth";

function FolderManagerView({ token, onBack }: { token: string; onBack: () => void }) {
  const {
    folders, newName, setNewName, loading,
    editingId, setEditingId, editingName, setEditingName,
    handleCreate, handleDelete, handleRename,
  } = useFolderManagerLogic(token);

  return (
    <div className="rounded-md p-3 space-y-3" style={{ background: C.surface, border: `1px solid ${C.hairline}` }}>
      <div className="flex items-center justify-between">
        <div style={{ fontSize: 12, fontWeight: 600, color: C.ink }}>Folders</div>
        <button onClick={onBack} style={{ fontSize: 11, color: C.inkFaint }}>Close</button>
      </div>
      <div className="flex gap-2">
        <input type="text" placeholder="New folder..." value={newName} onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleCreate()}
          className="flex-1 rounded-md outline-none" style={{ background: C.bg, border: `1px solid ${C.hairline}`, color: C.ink, padding: "6px 10px", height: 32, fontSize: 12 }} />
        <button onClick={handleCreate} className="rounded-md" style={{ background: C.accent, color: C.accentTextOn, padding: "6px 12px", fontSize: 11, fontWeight: 600, border: "none" }}>Add</button>
      </div>
      {loading ? (
        <div className="skeleton rounded" style={{ height: 32 }} />
      ) : folders.length === 0 ? (
        <div style={{ fontSize: 11, color: C.inkFaint, textAlign: "center", padding: "12px 0" }}>No folders</div>
      ) : (
        <div className="space-y-1">
          {folders.map(f => (
            <div key={f.id} className="flex items-center gap-2 rounded-md px-3 py-2" style={{ background: C.bg }}>
              <Folder size={12} style={{ color: C.inkFaint, flexShrink: 0 }} />
              {editingId === f.id ? (
                <input type="text" value={editingName} onChange={e => setEditingName(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleRename(f.id); if (e.key === "Escape") setEditingId(null); }}
                  onBlur={() => handleRename(f.id)}
                  autoFocus className="flex-1 rounded outline-none px-1 py-0.5"
                  style={{ background: C.surface, border: `1px solid ${C.accent}`, color: C.ink, fontSize: 12 }} />
              ) : (
                <span className="flex-1" style={{ fontSize: 12, color: C.ink }}>{f.name}</span>
              )}
              <button onClick={() => { setEditingId(f.id); setEditingName(f.name); }}
                style={{ fontSize: 11, color: C.inkFaint }}>Rename</button>
              <button onClick={() => handleDelete(f.id)} style={{ fontSize: 11, color: C.error }}>Delete</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function HealthView({ token, onBack }: { token: string; onBack: () => void }) {
  const { health, loading } = useHealthLogic(token);

  return (
    <div className="rounded-md p-3 space-y-3" style={{ background: C.surface, border: `1px solid ${C.hairline}` }}>
      <div className="flex items-center justify-between">
        <div style={{ fontSize: 12, fontWeight: 600, color: C.ink }}>Vault Health</div>
        <button onClick={onBack} style={{ fontSize: 11, color: C.inkFaint }}>Close</button>
      </div>
      {loading ? (
        <div className="skeleton rounded" style={{ height: 60 }} />
      ) : health ? (
        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="flex-1 rounded-md p-2.5" style={{ background: C.errorSubtle, border: `1px solid ${C.error}30` }}>
              <div style={{ fontSize: 11, color: C.error }}>Weak</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.error }}>{health.weak.length}</div>
            </div>
            <div className="flex-1 rounded-md p-2.5" style={{ background: C.accentSubtle, border: `1px solid ${C.accent}30` }}>
              <div style={{ fontSize: 11, color: C.accent }}>Reused</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.accent }}>{health.reused.length}</div>
            </div>
          </div>
          {health.weak.length > 0 && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", color: C.inkFaint, marginBottom: 4 }}>Weak Passwords</div>
              {health.weak.map((w, i) => (
                <div key={i} className="py-1.5" style={{ fontSize: 12, color: C.inkMuted }}>
                  {w.name} ({w.username})
                </div>
              ))}
            </div>
          )}
          {health.reused.length > 0 && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", color: C.inkFaint, marginBottom: 4 }}>Reused Passwords</div>
              {health.reused.map((r, i) => (
                <div key={i} className="py-1.5" style={{ fontSize: 12, color: C.inkMuted }}>
                  {r.entries.map(e => e.name).join(", ")}
                </div>
              ))}
            </div>
          )}
          {health.weak.length === 0 && health.reused.length === 0 && (
            <div style={{ fontSize: 12, color: C.inkFaint, textAlign: "center", padding: "8px 0" }}>All passwords look good</div>
          )}
        </div>
      ) : (
        <div style={{ fontSize: 12, color: C.inkFaint, textAlign: "center", padding: "8px 0" }}>Failed to load</div>
      )}
    </div>
  );
}

export default function SettingsView({ onBack, onLock, onNav, token }: {
  onBack: () => void; onLock: () => void; onNav: (v: View) => void; token: string;
}) {
  const {
    oldPw, setOldPw, newPw, setNewPw, confirmPw, setConfirmPw,
    changingPw, showChangePw, setShowChangePw,
    showFolders, setShowFolders, showHealth, setShowHealth,
    showAutoLock, setShowAutoLock, folderList, autoLockMinutes,
    setAutoLock, handleChangePassword, handleExport, handleImport,
  } = useSettingsLogic(token, onLock);

  const sections = [
    { title: "Account", items: [
      { icon: <Key size={14} />, label: "Change Master Password", sub: "Re-encrypts all entries", onClick: () => setShowChangePw(!showChangePw) },
    ]},
    { title: "Vault", items: [
      { icon: <Folder size={14} />, label: "Manage Folders", sub: `${folderList.length} folders`, onClick: () => setShowFolders(!showFolders) },
      { icon: <AlertCircle size={14} />, label: "Vault Health", sub: "Weak & reused passwords", onClick: () => setShowHealth(!showHealth) },
      { icon: <Upload size={14} />, label: "Import Data", sub: "From JSON or CSV", onClick: () => handleImport() },
      { icon: <Download size={14} />, label: "Export Vault", sub: "JSON or CSV", onClick: () => handleExport("json") },
      { icon: <Trash2 size={14} />, label: "Trash", sub: "Deleted entries", onClick: () => onNav("trash") },
    ]},
    { title: "Security", items: [
      { icon: <Clock size={14} />, label: "Auto-lock Timer", sub: `After ${autoLockMinutes} minutes`, onClick: () => setShowAutoLock(!showAutoLock) },
    ]},
  ];

  const handleSettingsBack = () => {
    if (showFolders) { setShowFolders(false); return; }
    if (showHealth) { setShowHealth(false); return; }
    if (showChangePw) { setShowChangePw(false); return; }
    if (showAutoLock) { setShowAutoLock(false); return; }
    onBack();
  };

  return (
    <div className="view-fade flex flex-col" style={{ height: "100%" }}>
      <TopBar title="Settings" showBack onBack={handleSettingsBack} />
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4" style={{ scrollbarWidth: "none" }}>
        {showChangePw && (
          <div className="rounded-md p-3 space-y-2" style={{ background: C.surface, border: `1px solid ${C.hairline}` }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.ink }}>Change Master Password</div>
            <input type="password" placeholder="Current password" value={oldPw} onChange={e => setOldPw(e.target.value)}
              className="w-full rounded-md outline-none" style={{ background: C.bg, border: `1px solid ${C.hairline}`, color: C.ink, padding: "8px 12px", height: 38, fontSize: 13 }} />
            <input type="password" placeholder="New password" value={newPw} onChange={e => setNewPw(e.target.value)}
              className="w-full rounded-md outline-none" style={{ background: C.bg, border: `1px solid ${C.hairline}`, color: C.ink, padding: "8px 12px", height: 38, fontSize: 13 }} />
            <input type="password" placeholder="Confirm" value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
              className="w-full rounded-md outline-none" style={{ background: C.bg, border: `1px solid ${C.hairline}`, color: C.ink, padding: "8px 12px", height: 38, fontSize: 13 }} />
            <button onClick={handleChangePassword} disabled={changingPw} className="w-full rounded-md font-semibold"
              style={{ height: 36, fontSize: 12, background: C.accent, color: C.accentTextOn, border: "none" }}>
              {changingPw ? "Changing..." : "Change Password"}
            </button>
          </div>
        )}
        {showFolders && <FolderManagerView token={token} onBack={() => setShowFolders(false)} />}
        {showHealth && <HealthView token={token} onBack={() => setShowHealth(false)} />}
        {showAutoLock && (
          <div className="rounded-md p-3 space-y-3" style={{ background: C.surface, border: `1px solid ${C.hairline}` }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.ink }}>Auto-lock Timer</div>
            <div className="space-y-1.5">
              {[5, 10, 15, 30, 60].map(m => (
                <button key={m} className="w-full flex items-center justify-between px-3 py-2.5 rounded-md transition-colors"
                  style={{ background: autoLockMinutes === m ? C.accentSubtle : C.bg, border: `1px solid ${autoLockMinutes === m ? C.accent : C.hairline}` }}
                  onClick={() => setAutoLock(m)}>
                  <span style={{ fontSize: 12, color: autoLockMinutes === m ? C.accent : C.ink }}>{m} minutes</span>
                  {autoLockMinutes === m && <Check size={13} style={{ color: C.accent }} />}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 10, color: C.inkFaint }}>Vault locks after this many minutes of inactivity</div>
          </div>
        )}
        {!showFolders && !showHealth && !showAutoLock && sections.map(sec => (
          <div key={sec.title}>
            <div className="px-3 mb-1.5" style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: C.inkFaint }}>{sec.title}</div>
            <div className="rounded-md overflow-hidden" style={{ border: `1px solid ${C.hairline}` }}>
              {sec.items.map((item, i) => (
                <button key={item.label} className="w-full flex items-center gap-3 px-3 text-left transition-colors"
                  style={{ height: 44, background: C.surface, borderTop: i > 0 ? `1px solid ${C.hairline}` : "none" }}
                  onClick={item.onClick}>
                  <div className="flex items-center justify-center rounded-md flex-shrink-0" style={{ width: 28, height: 28, background: C.accentSubtle }}>
                    <span style={{ color: C.accent }}>{item.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div style={{ fontSize: 13, color: C.ink }}>{item.label}</div>
                    <div style={{ fontSize: 11, color: C.inkMuted, marginTop: 1 }}>{item.sub}</div>
                  </div>
                  <ChevronRight size={13} style={{ color: C.inkFaint, flexShrink: 0 }} />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="px-3 py-2.5" style={{ borderTop: `1px solid ${C.hairline}` }}>
        <button className="w-full flex items-center justify-center gap-2 rounded-md transition-colors"
          style={{ height: 36, fontSize: 12, fontWeight: 600, background: "transparent", border: `1px solid ${C.error}`, color: C.error }}
          onClick={onLock}>
          <LogOut size={13} /> Lock
        </button>
      </div>
    </div>
  );
}
