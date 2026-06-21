import { useState, useEffect, useCallback } from "react";
import {
  type Entry,
  getPassword,
  toggleFavorite,
  deleteEntry,
  getTotp,
  getPasswordHistory,
  type PasswordHistoryEntry,
} from "./api";

const SERVICE_COLORS: Record<string, { color: string; letter: string }> = {
  github: { color: "#24292e", letter: "G" },
  google: { color: "#4285f4", letter: "G" },
  facebook: { color: "#1877f2", letter: "f" },
  snapchat: { color: "#fffc00", letter: "👻" },
  linkedin: { color: "#0a66c2", letter: "in" },
  amazon: { color: "#ff9900", letter: "a" },
  figma: { color: "#a259ff", letter: "F" },
  twitter: { color: "#1da1f2", letter: "X" },
  discord: { color: "#5865f2", letter: "D" },
  reddit: { color: "#ff4500", letter: "R" },
};
function svc(name: string) {
  const l = name.toLowerCase();
  for (const [k, v] of Object.entries(SERVICE_COLORS)) {
    if (l.includes(k)) return v;
  }
  return { color: "#6366f1", letter: name[0]?.toUpperCase() || "?" };
}

interface Props {
  entry: Entry;
  token: string;
  onBack: () => void;
  onEdit: (e: Entry) => void;
  onDeleted: () => void;
  show: (m: string) => void;
}

export default function DetailView({
  entry: e,
  token,
  onBack,
  onEdit,
  onDeleted,
  show,
}: Props) {
  const [showPw, setShowPw] = useState(false);
  const [password, setPassword] = useState("");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [fav, setFav] = useState(e.favorite || false);
  const [totp, setTotp] = useState<{ token: string; remaining: number } | null>(null);
  const [history, setHistory] = useState<PasswordHistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [loading, setLoading] = useState(true);

  const info = svc(e.name);

  const loadPassword = useCallback(async () => {
    try {
      const d = await getPassword(e.name, token);
      setPassword(d.password);
    } catch {
      setPassword("[decryption failed]");
    }
  }, [e.name, token]);

  const loadTotp = useCallback(async () => {
    if (!e.hasTotp) return;
    try {
      const d = await getTotp(e.name, token);
      setTotp(d);
    } catch {}
  }, [e.name, e.hasTotp, token]);

  const loadHistory = useCallback(async () => {
    try {
      const h = await getPasswordHistory(e.name, token);
      setHistory(h);
    } catch {}
  }, [e.name, token]);

  useEffect(() => {
    Promise.all([loadPassword(), loadTotp(), loadHistory()]).then(() =>
      setLoading(false),
    );
  }, [loadPassword, loadTotp, loadHistory]);

  useEffect(() => {
    if (!e.hasTotp || !totp) return;
    const iv = setInterval(() => {
      loadTotp();
    }, (totp.remaining > 1 ? totp.remaining - 1 : 30) * 1000);
    return () => clearInterval(iv);
  }, [e.hasTotp, totp, loadTotp]);

  const copy = async (value: string, field: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedField(field);
    show(`${field} copied`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleFav = async () => {
    try {
      const d = await toggleFavorite(e.name, token);
      setFav(d.favorite);
      show(d.favorite ? "Added to favorites" : "Removed from favorites");
    } catch {
      show("Failed to toggle favorite");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteEntry(e.name, token);
      show("Entry moved to trash");
      onDeleted();
    } catch {
      show("Failed to delete");
    }
  };

  if (loading) {
    return (
      <div className="absolute inset-0 bg-gray-950 flex items-center justify-center fade-in z-40">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 bg-gray-950 flex flex-col fade-in z-40">
      <div className="flex items-center gap-3 px-5 pt-5 pb-3">
        <button
          onClick={onBack}
          className="p-2 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h2 className="text-lg font-bold text-white flex-1 truncate">{e.name}</h2>
        <button
          onClick={handleFav}
          className="p-2 rounded-xl hover:bg-white/10"
          title={fav ? "Unfavorite" : "Favorite"}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill={fav ? "#fbbf24" : "none"} stroke={fav ? "#fbbf24" : "currentColor"} strokeWidth="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </button>
        <button
          onClick={() => onEdit(e)}
          className="p-2 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white"
          title="Edit"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-4">
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/10">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-lg font-bold flex-shrink-0"
            style={{ backgroundColor: info.color }}
          >
            {info.letter}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{e.name}</p>
            <p className="text-xs text-gray-400 truncate">{e.username}</p>
          </div>
        </div>

        {e.type === "login" && (
          <div className="space-y-3">
            <FieldRow
              label="Username"
              value={e.username}
              copied={copiedField === "username"}
              onCopy={() => copy(e.username, "Username")}
            />
            <FieldRow
              label="Password"
              value={showPw ? password : "••••••••••••"}
              copied={copiedField === "password"}
              onCopy={() => copy(password, "Password")}
              extra={
                <button
                  onClick={() => setShowPw(!showPw)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white"
                >
                  {showPw ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              }
            />
          </div>
        )}

        {e.url && (
          <FieldRow
            label="Website"
            value={e.url}
            copied={copiedField === "url"}
            onCopy={() => copy(e.url, "URL")}
            extra={
              <a
                href={e.url}
                target="_blank"
                rel="noopener"
                className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
            }
          />
        )}

        {e.hasTotp && totp && (
          <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500">TOTP Code</span>
              <span className="text-xs text-gray-500">{totp.remaining}s</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-lg font-mono font-bold text-white tracking-[0.2em]">
                {totp.token.slice(0, 3)} {totp.token.slice(3)}
              </span>
              <button
                onClick={() => copy(totp.token, "TOTP")}
                className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white"
              >
                {copiedField === "TOTP" ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                )}
              </button>
            </div>
            <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-1000"
                style={{ width: `${(totp.remaining / 30) * 100}%` }}
              />
            </div>
          </div>
        )}

        {e.uris && e.uris.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 mb-1.5">URIs</p>
            <div className="space-y-1">
              {e.uris.map((u, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] text-xs text-gray-300">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500 flex-shrink-0">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  </svg>
                  <span className="truncate">{u}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {e.notes && (
          <div>
            <p className="text-xs text-gray-500 mb-1.5">Notes</p>
            <p className="text-sm text-gray-300 whitespace-pre-wrap px-3 py-2 rounded-lg bg-white/[0.03]">
              {e.notes}
            </p>
          </div>
        )}

        {e.customFields && e.customFields.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 mb-1.5">Custom Fields</p>
            <div className="space-y-2">
              {e.customFields.map((f, i) => (
                <div key={i} className="px-3 py-2 rounded-lg bg-white/[0.03]">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">{f.name}</p>
                  <p className="text-sm text-gray-300 mt-0.5">
                    {f.type === "password" ? "••••••••" : String(f.value)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {e.folder && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            <span className="text-xs text-gray-400">{e.folder}</span>
          </div>
        )}

        {history.length > 0 && (
          <div>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-300 mb-1.5"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={`transition-transform ${showHistory ? "rotate-90" : ""}`}
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
              Password History ({history.length})
            </button>
            {showHistory && (
              <div className="space-y-1">
                {history.map((h, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.03]"
                  >
                    <span className="text-xs text-gray-400 font-mono">••••••••</span>
                    <span className="text-[10px] text-gray-600">
                      {new Date(h.changedAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {e.createdAt && (
          <div className="text-[10px] text-gray-600 space-y-0.5">
            <p>Created: {new Date(e.createdAt).toLocaleString()}</p>
            {e.updatedAt && <p>Updated: {new Date(e.updatedAt).toLocaleString()}</p>}
          </div>
        )}

        <div className="pt-2">
          {confirmDelete ? (
            <div className="p-4 rounded-2xl bg-red-950/30 border border-red-900/50 space-y-3">
              <p className="text-sm text-red-400 text-center">
                Move "{e.name}" to trash?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 text-gray-300 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="w-full py-3 rounded-2xl bg-white/5 text-red-400 text-sm font-medium hover:bg-red-500/10 transition-colors"
            >
              Delete Entry
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function FieldRow({
  label,
  value,
  copied,
  onCopy,
  extra,
}: {
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
  extra?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/5">
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</p>
        <p className="text-sm text-white truncate mt-0.5 font-mono">{value}</p>
      </div>
      <div className="flex items-center gap-0.5">
        {extra}
        <button
          onClick={onCopy}
          className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white"
        >
          {copied ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
