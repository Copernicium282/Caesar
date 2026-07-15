import {
  Eye, EyeOff, Copy, Check, Star, ExternalLink, Trash2,
  ChevronDown, Folder, Key,
} from "lucide-react";
import { useTheme } from "../shared/theme";
import { type Entry } from "../shared/types";
import { TopBar, FieldCard, ServiceAvatar } from "./shared";
import { strengthOf } from "../shared/hooks";
import { useDetailLogic } from "../logic/useDetail";

export default function DetailView({ entry, token, onBack, onEdit, onDelete, onCopy, onCopyPassword, copied }: {
  entry: Entry; token: string; onBack: () => void; onEdit: () => void; onDelete: () => void;
  onCopy: (t: string, k: string) => void; onCopyPassword: (n: string, k: string) => void; copied: string | null;
}) {
  const {
    showPw, setShowPw, password, histOpen, setHistOpen,
    fav, toggleFav, totp, history, confirmDelete, setConfirmDelete,
  } = useDetailLogic(entry, token);
  const { palette: C } = useTheme();

  const domain = entry.url?.replace(/^https?:\/\//, "").split("/")[0] ?? "";
  const str = strengthOf(password);

  return (
    <div className="view-fade flex flex-col" style={{ height: "100%" }}>
      <TopBar title={entry.name} showBack onBack={onBack}
        right={
          <div className="flex items-center gap-1">
            <button className="flex items-center justify-center hover:opacity-70" style={{ width: 32, height: 32, color: fav ? C.accent : C.inkFaint }}
              onClick={toggleFav}>
              <Star size={14} fill={fav ? C.accent : "none"} />
            </button>
            <button className="flex items-center justify-center hover:opacity-70" style={{ width: 32, height: 32, color: C.inkFaint }} onClick={onEdit}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
            <button className="flex items-center justify-center hover:opacity-70" style={{ width: 32, height: 32, color: C.error }} onClick={() => setConfirmDelete(true)}><Trash2 size={14} /></button>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3" style={{ scrollbarWidth: "none" }}>
        <div className="flex items-center gap-3 py-1">
          <ServiceAvatar name={entry.name} url={entry.url} size={32} />
          <div>
            <div className="font-semibold" style={{ fontSize: 13, color: C.ink }}>{entry.name}</div>
            {entry.folder && (
              <div className="flex items-center gap-1 mt-1">
                <Folder size={9} style={{ color: C.inkFaint }} />
                <span style={{ fontSize: 11, color: C.inkFaint }}>{entry.folder}</span>
              </div>
            )}
          </div>
        </div>

        {entry.username && (
          <FieldCard label="Username" value={entry.username}
            onCopy={() => onCopy(entry.username, "d-user")} copied={copied === "d-user"} />
        )}

        {password && (
          <div className="rounded-md p-3" style={{ background: C.surface, border: `1px solid ${C.hairline}` }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: C.inkFaint, marginBottom: 6 }}>Password</div>
            <div className="flex items-center gap-2 mb-2">
              <span className="flex-1 truncate" style={{ fontSize: 13, color: C.ink, fontFamily: "monospace" }}>
                {showPw ? password : "••••••••••••"}
              </span>
              <button className="hover:opacity-70" style={{ color: C.inkFaint }} onClick={() => setShowPw(s => !s)}>
                {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
              <button className="hover:opacity-70" style={{ color: copied === "d-pass" ? C.accent : C.inkFaint }}
                onClick={() => onCopyPassword(entry.name, "d-pass")}>
                {copied === "d-pass" ? <Check size={13} /> : <Copy size={13} />}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-sm overflow-hidden" style={{ height: 3, background: C.hairline }}>
                <div className="rounded-sm transition-all" style={{ width: `${(str.score / 5) * 100}%`, height: "100%", background: str.color }} />
              </div>
              <span style={{ fontSize: 11, color: str.color }}>{str.label}</span>
            </div>
          </div>
        )}

        {entry.url && (
          <FieldCard label="URL" value={domain}
            onCopy={() => onCopy(entry.url || "", "d-url")} copied={copied === "d-url"}
            extra={<a href={`https://${domain}`} target="_blank" rel="noreferrer" className="hover:opacity-70 flex-shrink-0"><ExternalLink size={12} style={{ color: C.inkFaint }} /></a>}
          />
        )}

        {totp && (
          <div className="flex items-center gap-3 rounded-md p-3" style={{ background: C.accentSubtle, border: `1px solid ${C.accent}30` }}>
            <svg width="28" height="28" style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
              <circle cx="14" cy="14" r={10} fill="none" stroke={C.hairline} strokeWidth="2" />
              <circle cx="14" cy="14" r={10} fill="none" stroke={totp.remaining <= 8 ? C.error : C.accent} strokeWidth="2"
                strokeDasharray={`${(totp.remaining / 30) * 2 * Math.PI * 10} ${2 * Math.PI * 10}`} strokeLinecap="round" style={{ transition: "stroke-dasharray 1s linear" }} />
            </svg>
            <div className="flex-1">
              <div style={{ fontSize: 11, color: C.inkFaint }}>TOTP · {totp.remaining}s</div>
              <div style={{ fontSize: 14, fontWeight: 600, fontFamily: "monospace", letterSpacing: 2, color: totp.remaining <= 8 ? C.error : C.accent }}>
                {totp.token.slice(0, 3)} {totp.token.slice(3)}
              </div>
            </div>
            <button className="hover:opacity-70" style={{ color: C.inkFaint }}
              onClick={() => onCopy(totp.token, "d-totp")}>
              {copied === "d-totp" ? <Check size={13} style={{ color: C.accent }} /> : <Copy size={13} />}
            </button>
          </div>
        )}

        {entry.notes && (
          <div className="rounded-md p-3" style={{ background: C.surface, border: `1px solid ${C.hairline}` }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: C.inkFaint, marginBottom: 6 }}>Notes</div>
            <p style={{ fontSize: 13, color: C.ink, lineHeight: 1.5 }}>{entry.notes}</p>
          </div>
        )}

        {history.length > 0 && (
          <div className="rounded-md overflow-hidden" style={{ border: `1px solid ${C.hairline}` }}>
            <button className="w-full flex items-center justify-between px-3 py-2.5" style={{ background: C.surface, fontSize: 12, fontWeight: 600, color: C.ink }}
              onClick={() => setHistOpen(o => !o)}>
              <span>Password History ({history.length})</span>
              <ChevronDown size={13} style={{ color: C.inkFaint, transform: histOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
            </button>
            {histOpen && history.map((h, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2" style={{ background: C.bg, borderTop: `1px solid ${C.hairline}` }}>
                <span className="flex-1" style={{ fontSize: 12, color: C.inkFaint, fontFamily: "monospace" }}>{"•".repeat(14)}</span>
                <span style={{ fontSize: 11, color: C.inkFaint }}>{new Date(h.changedAt).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-2 px-3 py-2.5" style={{ borderTop: `1px solid ${C.hairline}` }}>
        <button className="flex-1 flex items-center justify-center gap-1.5 rounded-md transition-colors"
          style={{ height: 36, fontSize: 12, fontWeight: 600, background: "transparent", border: `1px solid ${C.hairline}`, color: C.inkMuted }}
          onClick={() => onCopy(entry.username, "d-user")}>
          {copied === "d-user" ? <Check size={12} /> : <Copy size={12} />}
          {copied === "d-user" ? "Copied" : "Copy User"}
        </button>
        <button className="flex-1 flex items-center justify-center gap-1.5 rounded-md transition-colors"
          style={{ height: 36, fontSize: 12, fontWeight: 600, background: "transparent", border: `1px solid ${C.hairline}`, color: C.inkMuted }}
          onClick={() => onCopyPassword(entry.name, "d-pass")}>
          {copied === "d-pass" ? <Check size={12} /> : <Key size={12} />}
          {copied === "d-pass" ? "Copied" : "Copy Pass"}
        </button>
      </div>

      {confirmDelete && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)", zIndex: 20 }}>
          <div className="mx-6 p-4 rounded-md space-y-3" style={{ background: C.surface, border: `1px solid ${C.hairline}` }}>
            <p style={{ fontSize: 13, textAlign: "center", color: C.ink }}>Delete "{entry.name}"?</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(false)} className="flex-1 rounded-md" style={{ height: 36, fontSize: 12, background: "transparent", border: `1px solid ${C.hairline}`, color: C.inkMuted }}>Cancel</button>
              <button onClick={() => { onDelete(); setConfirmDelete(false); }} className="flex-1 rounded-md" style={{ height: 36, fontSize: 12, fontWeight: 600, background: "transparent", border: `1px solid ${C.error}`, color: C.error }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
