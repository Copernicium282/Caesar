import { useState, useEffect } from "react";
import {
  type Folder,
  getFolders,
  createFolder,
  renameFolder,
  deleteFolder,
} from "./api";

interface Props {
  token: string;
  onBack: () => void;
  show: (m: string) => void;
  onChanged: () => void;
}

export default function FoldersView({ token, onBack, show, onChanged }: Props) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const list = await getFolders(token);
      setFolders(list);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      await createFolder(newName.trim(), token);
      setNewName("");
      show("Folder created");
      load();
      onChanged();
    } catch (e) {
      show(e instanceof Error ? e.message : "Failed to create folder");
    }
  };

  const handleRename = async (id: string) => {
    if (!editingName.trim()) return;
    try {
      await renameFolder(id, editingName.trim(), token);
      setEditingId(null);
      show("Folder renamed");
      load();
      onChanged();
    } catch (e) {
      show(e instanceof Error ? e.message : "Failed to rename folder");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    try {
      await deleteFolder(id, token);
      show(`Folder "${name}" deleted`);
      load();
      onChanged();
    } catch {
      show("Failed to delete folder");
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
        <h2 className="text-lg font-bold text-white">Folders</h2>
      </div>

      <div className="px-5 mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="New folder name..."
            className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={handleCreate}
            disabled={!newName.trim()}
            className="px-4 py-3 rounded-xl text-white text-sm font-medium disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #6366f1, #9333ea)" }}
          >
            Add
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-4">
        {loading && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 rounded-xl bg-white/[0.02] animate-pulse" />
            ))}
          </div>
        )}

        {!loading && folders.length === 0 && (
          <div className="flex flex-col items-center py-12 text-gray-500">
            <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.4">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <p className="text-sm">No folders yet</p>
          </div>
        )}

        {!loading &&
          folders.map((f) => (
            <div
              key={f.id}
              className="flex items-center gap-3 py-3 px-3 rounded-xl hover:bg-white/[0.03] transition-colors mb-1"
            >
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              {editingId === f.id ? (
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRename(f.id);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  onBlur={() => handleRename(f.id)}
                  autoFocus
                  className="flex-1 px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              ) : (
                <span className="flex-1 text-sm text-white">{f.name}</span>
              )}
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => {
                    setEditingId(f.id);
                    setEditingName(f.name);
                  }}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(f.id, f.name)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-red-400"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
