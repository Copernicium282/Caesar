import { useState, useEffect, useCallback, useRef } from "react";
import {
  unlock as apiUnlock,
  lock as apiLock,
  getMatchedEntriesFiltered,
  getPassword,
  addEntry as apiAddEntry,
  type Entry,
  type MatchResult,
} from "./api";
import DetailView from "./DetailView";
import EditView from "./EditView";
import TrashView from "./TrashView";
import GeneratorView from "./GeneratorView";
import SettingsView from "./SettingsView";
import "./index.css";

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

type View =
  | "vault"
  | "detail"
  | "edit"
  | "add"
  | "generator"
  | "trash"
  | "settings"
  | "folders";

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
  const [editEntry, setEditEntry] = useState<Entry | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [folderFilter, setFolderFilter] = useState<string>("");
  const [favOnly, setFavOnly] = useState(false);
  const clipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchEntries = useCallback(
    async (tok: string) => {
      setFetching(true);
      try {
        let r: MatchResult;
        try {
          const tabs = await browser.tabs.query({
            active: true,
            currentWindow: true,
          });
          r = await getMatchedEntriesFiltered(
            tabs[0]?.url || "",
            tok,
            {
              type: typeFilter || undefined,
              folder: folderFilter || undefined,
              favorite: favOnly || undefined,
            },
          );
        } catch {
          r = await getMatchedEntriesFiltered("about:blank", tok, {
            type: typeFilter || undefined,
            folder: folderFilter || undefined,
            favorite: favOnly || undefined,
          });
        }
        setMatchResult(r);
      } catch {
        setToken(null);
        setError("Session expired.");
      } finally {
        setFetching(false);
      }
    },
    [typeFilter, folderFilter, favOnly],
  );

  useEffect(() => {
    browser.storage.session.get("vaultchain_token").then((d) => {
      const s = d.vaultchain_token as string | undefined;
      if (s) {
        setToken(s);
        fetchEntries(s);
      }
    });
  }, []);

  useEffect(() => {
    if (token) fetchEntries(token);
  }, [typeFilter, folderFilter, favOnly]);

  const err = (m: string) => {
    setError(m);
    setShakeKey((k) => k + 1);
  };

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    setLoading(true);
    setError("");
    try {
      const d = await apiUnlock(password);
      if (d.token) {
        await browser.storage.session.set({ vaultchain_token: d.token });
        setToken(d.token);
        setPassword("");
        setShowPw(false);
        fetchEntries(d.token);
      } else {
        err("Invalid response");
      }
    } catch (e) {
      err(e instanceof Error ? e.message : "Unlock failed");
    } finally {
      setLoading(false);
    }
  };

  const show = (m: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(m);
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  };

  const handleCopy = async (entry: Entry) => {
    if (!token || copiedName === entry.name) return;
    try {
      const d = await getPassword(entry.name, token);
      await navigator.clipboard.writeText(d.password);
      setCopiedName(entry.name);
      show("Password copied");
      if (clipTimer.current) clearTimeout(clipTimer.current);
      clipTimer.current = setTimeout(() => {
        navigator.clipboard.writeText("").catch(() => {});
        setCopiedName(null);
      }, 30000);
      setTimeout(() => setCopiedName(null), 2000);
    } catch {
      setToken(null);
      err("Session expired.");
    }
  };

  const handleFill = async (entry: Entry) => {
    if (!token) return;
    try {
      const d = await getPassword(entry.name, token);
      const tabs = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      const id = tabs[0]?.id;
      if (id) {
        browser.tabs.sendMessage(id, {
          type: "FILL_CREDENTIALS",
          username: entry.username,
          password: d.password,
        });
        show("Credentials filled");
      }
    } catch {
      setToken(null);
      err("Session expired.");
    }
  };

  const handleLock = async () => {
    if (token) {
      try {
        await apiLock(token);
      } catch {}
    }
    await browser.storage.session.remove("vaultchain_token");
    setToken(null);
    setMatchResult(null);
    setSearch("");
    setView("vault");
  };

  const navigateTo = (v: View) => setView(v);
  const currentView = view;

  const filter = (entries: Entry[]) => {
    if (!search.trim()) return entries;
    const q = search.toLowerCase();
    return entries.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.username.toLowerCase().includes(q) ||
        (e.uris || []).some((u) => u.toLowerCase().includes(q)) ||
        (e.notes || "").toLowerCase().includes(q),
    );
  };

  const filtered = matchResult
    ? {
        matched: filter(matchResult.matched),
        unmatched: filter(matchResult.unmatched),
      }
    : null;
  const total = filtered
    ? filtered.matched.length + filtered.unmatched.length
    : 0;

  const favorites = filtered
    ? [...filtered.matched, ...filtered.unmatched].filter((e) => e.favorite)
    : [];
  const nonFavorites = filtered
    ? [...filtered.matched, ...filtered.unmatched].filter((e) => !e.favorite)
    : [];
  const showFavorites = favorites.length > 0 && !favOnly;

  // ── Overlay views ──
  if (view === "detail" && selEntry) {
    return (
      <DetailView
        entry={selEntry}
        token={token!}
        onBack={() => {
          setView("vault");
          setSelEntry(null);
        }}
        onEdit={(e) => {
          setEditEntry(e);
          setView("edit");
        }}
        onDeleted={() => {
          setView("vault");
          setSelEntry(null);
          fetchEntries(token!);
        }}
        show={show}
      />
    );
  }

  if (view === "edit") {
    return (
      <EditView
        token={token!}
        entry={editEntry}
        onBack={() => {
          setView(editEntry ? "detail" : "vault");
          setEditEntry(null);
        }}
        onSaved={() => {
          setView("vault");
          setEditEntry(null);
          fetchEntries(token!);
        }}
        show={show}
      />
    );
  }

  if (view === "generator") {
    return (
      <GeneratorView
        token={token!}
        entry={selEntry}
        onBack={() => {
          setView("vault");
          setSelEntry(null);
        }}
        show={show}
      />
    );
  }

  if (view === "trash") {
    return (
      <TrashView
        token={token!}
        onBack={() => setView("settings")}
        show={show}
        onChanged={() => fetchEntries(token!)}
      />
    );
  }

  if (view === "settings") {
    return (
      <SettingsView
        token={token!}
        onBack={() => setView("vault")}
        onLock={handleLock}
        onNavigate={navigateTo}
        show={show}
      />
    );
  }

  // ── Unlock view ──
  if (!token) {
    return (
      <div
        className="flex flex-col items-center justify-center p-8 min-h-[520px]"
        style={{
          background: "linear-gradient(to bottom, #1e1b4b, #030712 60%)",
        }}
      >
        <div className="w-full max-w-xs space-y-6 fade-in">
          <div className="text-center">
            <div
              className="w-24 h-24 mx-auto mb-5 rounded-3xl flex items-center justify-center shadow-2xl"
              style={{
                background: "linear-gradient(135deg, #6366f1, #9333ea)",
                boxShadow: "0 25px 50px -12px rgba(99,102,241,0.3)",
              }}
            >
              <svg
                width="44"
                height="44"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white">
              Enhance safety with
            </h1>
            <h1 className="text-2xl font-bold text-white">Total security</h1>
            <p className="text-sm text-gray-400 mt-2">
              Protect your passwords with AES-256 encryption
            </p>
          </div>
          <form onSubmit={handleUnlock} className="space-y-3">
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Master Password"
                autoFocus
                className="w-full px-5 py-4 pr-12 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/10"
              >
                {showPw ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            {error && (
              <p
                key={shakeKey}
                className="text-sm text-red-400 text-center shake"
              >
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading || !password.trim()}
              className="w-full py-4 rounded-2xl text-white font-semibold transition-all disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-500"
              style={{
                background:
                  loading || !password.trim()
                    ? "#374151"
                    : "linear-gradient(135deg, #6366f1, #9333ea)",
                boxShadow: loading
                  ? "none"
                  : "0 10px 25px -5px rgba(99,102,241,0.3)",
              }}
            >
              {loading ? "Unlocking..." : "Unlock"}
            </button>
          </form>
          <p className="text-center text-xs text-gray-600">
            AES-256-GCM · Argon2id · On-Chain Verified
          </p>
        </div>
      </div>
    );
  }

  // ── Main vault view ──
  return (
    <div className="flex flex-col min-h-[520px] bg-gray-950 fade-in relative">
      <div className="px-5 pt-5 pb-2">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button className="p-1 text-gray-400 hover:text-white">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <div>
              <h1 className="text-lg font-bold text-white">Hello, User</h1>
              <p className="text-xs text-gray-500">{total} passwords saved</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setView("settings")}
              className="p-2 rounded-xl bg-white/5 text-gray-400 hover:text-white"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
            <button
              onClick={handleLock}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold"
              style={{
                background: "linear-gradient(135deg, #6366f1, #9333ea)",
              }}
            >
              U
            </button>
          </div>
        </div>

        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <svg
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            onClick={() => setView("generator")}
            className="w-12 rounded-2xl flex items-center justify-center text-white flex-shrink-0"
            style={{ background: "#6366f1" }}
            title="Generator"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
            </svg>
          </button>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
          <FilterChip
            active={!typeFilter && !folderFilter && !favOnly}
            onClick={() => {
              setTypeFilter("");
              setFolderFilter("");
              setFavOnly(false);
            }}
          >
            All
          </FilterChip>
          <FilterChip
            active={typeFilter === "login"}
            onClick={() => setTypeFilter(typeFilter === "login" ? "" : "login")}
          >
            Logins
          </FilterChip>
          <FilterChip
            active={typeFilter === "note"}
            onClick={() => setTypeFilter(typeFilter === "note" ? "" : "note")}
          >
            Notes
          </FilterChip>
          <FilterChip
            active={favOnly}
            onClick={() => setFavOnly(!favOnly)}
          >
            Favorites
          </FilterChip>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-2">
        {fetching && (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 py-3 px-3 rounded-2xl bg-white/[0.02] mb-1"
              >
                <div className="w-10 h-10 rounded-xl bg-white/5 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-24 bg-white/5 rounded-full animate-pulse" />
                  <div className="h-2.5 w-36 bg-white/5 rounded-full animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!fetching && filtered && total === 0 && (
          <div className="flex flex-col items-center py-12 text-gray-500">
            <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.4">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <p className="text-sm">
              {search ? "No matching entries" : "No entries yet"}
            </p>
          </div>
        )}

        {!fetching && filtered && showFavorites && favorites.length > 0 && (
          <div className="mb-3">
            <p className="text-[10px] font-semibold text-amber-400 uppercase tracking-widest mb-2">
              Favorites
            </p>
            {favorites.map((e) => (
              <EntryRow
                key={e.name}
                entry={e}
                copiedName={copiedName}
                onCopy={handleCopy}
                onFill={handleFill}
                onView={(ent) => {
                  setSelEntry(ent);
                  setView("detail");
                }}
                onGen={(ent) => {
                  setSelEntry(ent);
                  setView("generator");
                }}
              />
            ))}
          </div>
        )}

        {!fetching &&
          filtered &&
          filtered.matched.length > 0 &&
          !(showFavorites && favorites.length > 0) && (
            <div className="mb-3">
              <p className="text-[10px] font-semibold text-indigo-400 uppercase tracking-widest mb-2">
                This site
              </p>
              {filtered.matched.map((e) => (
                <EntryRow
                  key={e.name}
                  entry={e}
                  copiedName={copiedName}
                  onCopy={handleCopy}
                  onFill={handleFill}
                  onView={(ent) => {
                    setSelEntry(ent);
                    setView("detail");
                  }}
                  onGen={(ent) => {
                    setSelEntry(ent);
                    setView("generator");
                  }}
                />
              ))}
            </div>
          )}

        {!fetching && filtered && filtered.unmatched.length > 0 && (
          <div>
            {filtered.matched.length > 0 && (
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2">
                All items
              </p>
            )}
            {filtered.unmatched.map((e) => (
              <EntryRow
                key={e.name}
                entry={e}
                copiedName={copiedName}
                onCopy={handleCopy}
                onFill={handleFill}
                onView={(ent) => {
                  setSelEntry(ent);
                  setView("detail");
                }}
                onGen={(ent) => {
                  setSelEntry(ent);
                  setView("generator");
                }}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-6 py-3 border-t border-white/5 bg-gray-950 relative">
        <Nav
          active={currentView === "vault"}
          onClick={() => setView("vault")}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </Nav>
        <Nav onClick={() => setView("generator")}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
          </svg>
        </Nav>
        <button
          onClick={() => {
            setEditEntry(null);
            setView("add");
          }}
          className="w-14 h-14 -mt-6 rounded-full flex items-center justify-center text-white shadow-lg"
          style={{
            background: "linear-gradient(135deg, #6366f1, #9333ea)",
            boxShadow: "0 10px 25px -5px rgba(99,102,241,0.4)",
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
        <Nav onClick={() => setView("trash")}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </Nav>
        <Nav
          active={currentView === "settings"}
          onClick={() => setView("settings")}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </Nav>
      </div>

      {view === "add" && (
        <EditView
          token={token}
          entry={null}
          onBack={() => setView("vault")}
          onSaved={() => {
            setView("vault");
            fetchEntries(token);
          }}
          show={show}
        />
      )}

      {error && (
        <div className="px-4 py-2 bg-red-950/50 border-t border-red-900/50">
          <p className="text-xs text-red-400 text-center">{error}</p>
        </div>
      )}
      {toast && (
        <div
          className="fixed bottom-24 left-1/2 -translate-x-1/2 flex items-center gap-2 px-5 py-3 rounded-full shadow-xl text-sm text-white font-medium toast-in z-50"
          style={{
            background: "#4f46e5",
            boxShadow: "0 10px 25px -5px rgba(79,70,229,0.3)",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {toast}
        </div>
      )}
    </div>
  );
}

function EntryRow({
  entry,
  copiedName,
  onCopy,
  onFill,
  onView,
  onGen,
}: {
  entry: Entry;
  copiedName: string | null;
  onCopy: (e: Entry) => void;
  onFill: (e: Entry) => void;
  onView: (e: Entry) => void;
  onGen: (e: Entry) => void;
}) {
  const info = svc(entry.name);
  const isCopied = copiedName === entry.name;
  return (
    <div
      className="flex items-center gap-3 py-3 px-3 rounded-2xl hover:bg-white/[0.03] transition-colors group mb-1 cursor-pointer"
      onClick={() => onView(entry)}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-white text-sm font-bold"
        style={{ backgroundColor: info.color }}
      >
        {info.letter}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-semibold text-white truncate">
            {entry.name}
          </p>
          {entry.favorite && (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="#fbbf24" stroke="#fbbf24" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          )}
        </div>
        <p className="text-xs text-gray-400 truncate">{entry.username}</p>
      </div>
      <div className="flex items-center gap-0.5">
        <button
          onClick={(ev) => {
            ev.stopPropagation();
            onCopy(entry);
          }}
          className="p-2 rounded-xl hover:bg-white/10 transition-colors"
          title="Copy"
        >
          {isCopied ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400 group-hover:text-white">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          )}
        </button>
        <button
          onClick={(ev) => {
            ev.stopPropagation();
            onGen(entry);
          }}
          className="p-2 rounded-xl hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
          title="Generate"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
          </svg>
        </button>
        <button
          onClick={(ev) => {
            ev.stopPropagation();
            onFill(entry);
          }}
          className="p-2 rounded-xl hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
          title="Fill"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function Nav({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`p-2 rounded-xl transition-colors ${active ? "text-indigo-400" : "text-gray-500 hover:text-gray-300"}`}
    >
      {children}
    </button>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
        active
          ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
          : "bg-white/5 text-gray-400 border border-white/5"
      }`}
    >
      {children}
    </button>
  );
}
