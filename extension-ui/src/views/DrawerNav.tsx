import { RefreshCw, Shield, Settings, Trash2, Folder, X } from "lucide-react";
import { useTheme } from "../shared/theme";
import { type Folder as FolderType, type View } from "../shared/types";

export default function DrawerNav({ view, onClose, onNav, folders }: {
  view: View; onClose: () => void; onNav: (v: View) => void; folders: FolderType[];
}) {
  const { palette: C } = useTheme();
  const items = [
    { id: "vault" as View, icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>, label: "Vault" },
    { id: "generator" as View, icon: <RefreshCw size={14} />, label: "Generator" },
    { id: "snapshot" as View, icon: <Shield size={14} />, label: "Snapshot" },
    { id: "settings" as View, icon: <Settings size={14} />, label: "Settings" },
    { id: "trash" as View, icon: <Trash2 size={14} />, label: "Trash" },
  ];

  return (
    <>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.5)" }} onClick={onClose} />
      <div className="absolute left-0 top-0 bottom-0 flex flex-col" style={{ width: 220, background: C.surface, borderRight: `1px solid ${C.hairline}` }}>
        <div className="flex items-center justify-between px-3.5" style={{ height: 48, borderBottom: `1px solid ${C.hairline}` }}>
          <img src="icons/icon-16.png" style={{ width: 20, height: 20, borderRadius: 3 }} />
          <button style={{ color: C.inkFaint }} className="hover:opacity-70" onClick={onClose}><X size={15} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-4" style={{ scrollbarWidth: "none" }}>
          <div className="space-y-0.5">
            {items.map(item => (
              <button key={item.id} className="w-full flex items-center gap-2.5 rounded-md transition-colors"
                style={{ padding: "8px 10px", fontSize: 13, background: view === item.id ? C.accentSubtle : "transparent", color: view === item.id ? C.accent : C.inkMuted }}
                onClick={() => { onNav(item.id); onClose(); }}>
                {item.icon} {item.label}
              </button>
            ))}
          </div>
          {folders.length > 0 && (
            <div>
              <div className="px-2.5 mb-1.5" style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: C.inkFaint }}>Folders</div>
              {folders.map(f => (
                <button key={f.id} className="w-full flex items-center gap-2 px-2.5 rounded-md" style={{ padding: "6px 10px", fontSize: 12, color: C.inkMuted }} onClick={onClose}>
                  <Folder size={12} />{f.name}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="px-3.5 pb-3 pt-2" style={{ borderTop: `1px solid ${C.hairline}` }}>
          <div style={{ fontSize: 11, textAlign: "center", color: C.inkFaint }}>AES-256-GCM · Argon2id</div>
        </div>
      </div>
    </>
  );
}
