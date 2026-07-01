import { Search, Settings } from "lucide-react";
import { useTheme } from "../shared/theme";
import { type Entry, type View } from "../shared/types";
import { TopBar, EntryRow } from "./shared";
import { useVaultLogic } from "../logic/useVault";

export default function VaultView({ entries, fetching, onViewEntry, onEditEntry, onAdd, onMenu, onNav, onCopy, onCopyPassword, onFill, copied }: {
  entries: Entry[]; fetching: boolean;
  onViewEntry: (e: Entry) => void; onEditEntry: (e: Entry) => void;
  onAdd: () => void; onMenu: () => void; onNav: (v: View) => void;
  onCopy: (t: string, k: string) => void; onCopyPassword: (n: string, k: string) => void;
  onFill: (e: Entry) => void; copied: string | null;
}) {
  const { palette: C } = useTheme();
  const { search, setSearch, tab, setTab, filtered, TABS } = useVaultLogic(entries, fetching);

  return (
    <div className="flex flex-col" style={{ height: "100%" }}>
      <TopBar title="Caesar" onMenu={onMenu}
        right={<button className="flex items-center justify-center hover:opacity-70" style={{ width: 32, height: 32, color: C.inkFaint }} onClick={() => onNav("settings")}><Settings size={15} /></button>}
      />

      <div style={{ padding: "8px 12px" }}>
        <div className="relative">
          <Search size={13} className="absolute" style={{ left: 10, top: "50%", transform: "translateY(-50%)", color: C.inkFaint }} />
          <input type="text" placeholder="Search vault..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full rounded-md outline-none transition-colors"
            style={{ background: C.surface, border: `1px solid ${C.hairline}`, color: C.ink, caretColor: C.accent, padding: "7px 10px 7px 32px", height: 34, fontSize: 12 }} />
        </div>
      </div>

      <div className="flex gap-2 px-3" style={{ paddingBottom: 8 }}>
        {TABS.map(t => (
          <button key={t.id} className="rounded-md transition-colors"
            style={{
              padding: "4px 10px", fontSize: 12, fontWeight: 500,
              background: tab === t.id ? C.accentSubtle : "transparent",
              color: tab === t.id ? C.accent : C.inkFaint,
              border: `1px solid ${tab === t.id ? C.accent : C.hairline}`,
            }}
            onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
        {fetching ? (
          <div className="px-3 space-y-1">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3 rounded-md" style={{ padding: "10px 12px" }}>
                <div className="skeleton rounded" style={{ width: 32, height: 32 }} />
                <div className="flex-1 space-y-2">
                  <div className="skeleton rounded" style={{ width: "60%", height: 12 }} />
                  <div className="skeleton rounded" style={{ width: "80%", height: 10 }} />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center" style={{ padding: "40px 0", gap: 8 }}>
            <Search size={20} style={{ color: C.inkFaint, opacity: 0.4 }} />
            <span style={{ fontSize: 12, color: C.inkFaint }}>No entries found</span>
          </div>
        ) : (
          <div className="px-3">
            {filtered.map(e => (
              <EntryRow key={e.name} entry={e}
                onView={() => onViewEntry(e)} onEdit={() => onEditEntry(e)}
                onCopy={onCopy} onFill={() => onFill(e)} copied={copied} />
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-center py-3">
        <button onClick={onAdd}
          className="flex items-center justify-center rounded-lg transition-transform hover:scale-105 active:scale-95"
          style={{ width: 40, height: 40, background: C.accent, color: C.accentTextOn, border: "none", cursor: "pointer" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
