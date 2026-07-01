import { Trash2, RotateCcw, X, AlertTriangle } from "lucide-react";
import { useTheme } from "../shared/theme";
import { TopBar, ServiceAvatar } from "./shared";
import { useTrashLogic } from "../logic/useTrash";

export default function TrashView({ token, onBack, onRestore, onDelete }: {
  token: string; onBack: () => void; onRestore: (n: string) => void; onDelete: (n: string) => void;
}) {
  const { entries, loading, handlePurge } = useTrashLogic(token);
  const { palette: C } = useTheme();

  return (
    <div className="view-fade flex flex-col" style={{ height: "100%" }}>
      <TopBar title="Trash" showBack onBack={onBack}
        right={entries.length > 0 ? (
          <button className="rounded-md" style={{ fontSize: 11, fontWeight: 600, color: C.error, padding: "4px 8px", background: "transparent", border: "none" }}
            onClick={handlePurge}>Purge All</button>
        ) : undefined}
      />
      {entries.length > 0 && (
        <div className="mx-3 mt-3 flex items-start gap-2 rounded-md px-3 py-2" style={{ background: C.errorSubtle, border: `1px solid ${C.error}30` }}>
          <AlertTriangle size={12} style={{ color: C.error, flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 11, color: C.error, lineHeight: 1.4 }}>Auto-purged after <strong>30 days</strong>.</p>
        </div>
      )}
      <div className="flex-1 overflow-y-auto mt-2 px-3 space-y-1" style={{ scrollbarWidth: "none" }}>
        {loading ? (
          <div className="space-y-1">{[1, 2].map(i => <div key={i} className="skeleton rounded-md" style={{ height: 52 }} />)}</div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center" style={{ padding: "40px 0", gap: 8 }}>
            <Trash2 size={20} style={{ color: C.inkFaint, opacity: 0.3 }} />
            <span style={{ fontSize: 12, color: C.inkFaint }}>Trash is empty</span>
          </div>
        ) : entries.map(e => (
          <div key={e.name} className="flex items-center gap-3 rounded-md" style={{ padding: "10px 12px", background: C.surface, border: `1px solid ${C.hairline}` }}>
            <ServiceAvatar name={e.name} url={e.url} size={32} />
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate" style={{ fontSize: 13, color: C.ink }}>{e.name}</div>
              <div className="truncate" style={{ fontSize: 12, color: C.inkMuted }}>{e.username || e.folder}</div>
            </div>
            <div className="flex items-center gap-1">
              <button className="flex items-center justify-center rounded-md" style={{ width: 32, height: 32, background: C.accentSubtle, color: C.accent }} onClick={() => onRestore(e.name)} title="Restore"><RotateCcw size={13} /></button>
              <button className="flex items-center justify-center rounded-md" style={{ width: 32, height: 32, background: C.errorSubtle, color: C.error }} onClick={() => onDelete(e.name)} title="Delete permanently"><X size={13} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
