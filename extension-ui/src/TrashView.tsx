import { useState, useEffect } from "react";
import {
  type Entry,
  getTrash,
  restoreEntry,
  permanentDeleteEntry,
  purgeTrash,
} from "./api";

interface Props {
  token: string;
  onBack: () => void;
  show: (m: string) => void;
  onChanged: () => void;
}

export default function TrashView({ token, onBack, show, onChanged }: Props) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmPurge, setConfirmPurge] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const list = await getTrash(token);
      setEntries(list);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleRestore = async (name: string) => {
    try {
      await restoreEntry(name, token);
      show("Entry restored");
      load();
      onChanged();
    } catch {
      show("Failed to restore");
    }
  };

  const handlePermanentDelete = async (name: string) => {
    try {
      await permanentDeleteEntry(name, token);
      show("Entry permanently deleted");
      load();
    } catch {
      show("Failed to delete");
    }
  };

  const handlePurge = async () => {
    try {
      const d = await purgeTrash(token);
      show(`Purged ${d.deleted} entries`);
      load();
      setConfirmPurge(false);
      onChanged();
    } catch {
      show("Failed to purge trash");
    }
  };

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
        <h2 className="text-lg font-bold text-white flex-1">Trash</h2>
        {entries.length > 0 && (
          <button
            onClick={() => setConfirmPurge(true)}
            className="text-xs text-red-400 hover:text-red-300"
          >
            Purge All
          </button>
        )}
      </div>

      <div className="px-5 mb-3">
        <div className="px-4 py-2.5 rounded-xl bg-red-950/30 border border-red-900/50">
          <p className="text-xs text-red-400">
            Items in trash are permanently deleted after 30 days.
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-4">
        {loading && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 py-3 px-3 rounded-2xl bg-white/[0.02]">
                <div className="w-10 h-10 rounded-xl bg-white/5 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-24 bg-white/5 rounded-full animate-pulse" />
                  <div className="h-2.5 w-36 bg-white/5 rounded-full animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && entries.length === 0 && (
          <div className="flex flex-col items-center py-12 text-gray-500">
            <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.4">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </div>
            <p className="text-sm">Trash is empty</p>
          </div>
        )}

        {!loading &&
          entries.map((e) => (
            <div
              key={e.name}
              className="flex items-center gap-3 py-3 px-3 rounded-2xl bg-white/[0.02] mb-1"
            >
              <div className="w-10 h-10 rounded-xl bg-gray-700/50 flex items-center justify-center text-gray-500 text-sm font-bold flex-shrink-0">
                {e.name[0]?.toUpperCase() || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-400 truncate line-through">
                  {e.name}
                </p>
                <p className="text-xs text-gray-600 truncate">{e.username}</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleRestore(e.name)}
                  className="p-2 rounded-xl hover:bg-white/10 text-gray-400 hover:text-green-400"
                  title="Restore"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="1 4 1 10 7 10" />
                    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                  </svg>
                </button>
                <button
                  onClick={() => handlePermanentDelete(e.name)}
                  className="p-2 rounded-xl hover:bg-white/10 text-gray-400 hover:text-red-400"
                  title="Delete forever"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
      </div>

      {confirmPurge && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="mx-6 p-5 rounded-2xl bg-gray-900 border border-white/10 space-y-4">
            <p className="text-sm text-white text-center">
              Permanently delete all {entries.length} trashed items?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmPurge(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 text-gray-300 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handlePurge}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-medium"
              >
                Purge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
