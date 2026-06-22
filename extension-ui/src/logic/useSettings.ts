import { useState, useEffect } from "react";
import {
  getFolders, changePassword as apiChangePassword,
  exportVault, importVault,
} from "../api";
import { type Folder as FolderType } from "../shared/types";

export function useSettingsLogic(token: string, onLock: () => void) {
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [changingPw, setChangingPw] = useState(false);
  const [showChangePw, setShowChangePw] = useState(false);
  const [showFolders, setShowFolders] = useState(false);
  const [showHealth, setShowHealth] = useState(false);
  const [showAutoLock, setShowAutoLock] = useState(false);
  const [folderList, setFolderList] = useState<FolderType[]>([]);
  const [autoLockMinutes, setAutoLockMinutes] = useState(15);

  useEffect(() => {
    browser.storage.local.get("autoLockTimeout").then((d) => {
      const val = d.autoLockTimeout as number | undefined;
      if (val) setAutoLockMinutes(val / 60000);
    });
  }, []);

  const setAutoLock = async (minutes: number) => {
    setAutoLockMinutes(minutes);
    await browser.storage.local.set({ autoLockTimeout: minutes * 60000 });
  };

  const handleChangePassword = async () => {
    if (!oldPw || !newPw || newPw !== confirmPw || newPw.length < 8) return;
    setChangingPw(true);
    try { await apiChangePassword(oldPw, newPw, token); onLock(); } catch {}
    setChangingPw(false);
  };

  const handleExport = async (format: "json" | "csv") => {
    try {
      const data = await exportVault(format, token);
      const blob = format === "csv"
        ? new Blob([data as unknown as string], { type: "text/csv" })
        : new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `caesar-export.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {}
  };

  const handleImport = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,.csv";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        let entries: Record<string, unknown>[];
        if (file.name.endsWith(".csv")) {
          const lines = text.split("\n").filter(l => l.trim());
          if (lines.length < 2) return;
          const header = lines[0]!.split(",").map(h => h.trim().toLowerCase());
          entries = lines.slice(1).map(line => {
            const values: string[] = [];
            let current = "";
            let inQuotes = false;
            for (const char of line) {
              if (char === '"') inQuotes = !inQuotes;
              else if (char === "," && !inQuotes) { values.push(current); current = ""; }
              else current += char;
            }
            values.push(current);
            const obj: Record<string, unknown> = {};
            header.forEach((h, i) => { obj[h] = values[i] || ""; });
            return obj;
          });
        } else {
          const parsed = JSON.parse(text);
          entries = parsed.entries || parsed;
        }
        await importVault(entries, token);
      } catch {}
    };
    input.click();
  };

  useEffect(() => {
    getFolders(token).then(setFolderList).catch(() => {});
  }, [token, showFolders]);

  return {
    oldPw, setOldPw, newPw, setNewPw, confirmPw, setConfirmPw,
    changingPw, showChangePw, setShowChangePw,
    showFolders, setShowFolders, showHealth, setShowHealth,
    showAutoLock, setShowAutoLock, folderList, autoLockMinutes,
    setAutoLock, handleChangePassword, handleExport, handleImport,
  };
}
