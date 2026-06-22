import { useState, useEffect } from "react";
import {
  getFolders, createFolder as apiCreateFolder,
  deleteFolder as apiDeleteFolder, renameFolder as apiRenameFolder,
} from "../api";
import { type Folder as FolderType } from "../shared/types";

export function useFolderManagerLogic(token: string) {
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const load = async () => {
    setLoading(true);
    try { setFolders(await getFolders(token)); } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try { await apiCreateFolder(newName.trim(), token); setNewName(""); load(); } catch {}
  };

  const handleDelete = async (id: string) => {
    try { await apiDeleteFolder(id, token); load(); } catch {}
  };

  const handleRename = async (id: string) => {
    if (!editingName.trim()) return;
    try { await apiRenameFolder(id, editingName.trim(), token); setEditingId(null); load(); } catch {}
  };

  return {
    folders, newName, setNewName, loading,
    editingId, setEditingId, editingName, setEditingName,
    handleCreate, handleDelete, handleRename,
  };
}
