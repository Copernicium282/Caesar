import { useState, useEffect } from "react";
import {
  getVaultHealth,
  type HealthReport,
  changePassword as apiChangePassword,
  getFolders,
  type Folder,
  exportVault,
  importVault,
} from "./api";

interface Props {
  token: string;
  onBack: () => void;
  onLock: () => void;
  onNavigate: (view: string) => void;
  show: (m: string) => void;
}

export default function SettingsView({
  token,
  onBack,
  onLock,
  onNavigate,
  show,
}: Props) {
  const [section, setSection] = useState<"main" | "health" | "changepw" | "folders">("main");
  const [health, setHealth] = useState<HealthReport | null>(null);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [changingPw, setChangingPw] = useState(false);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; skipped: number } | null>(null);

  useEffect(() => {
    getFolders(token).then(setFolders).catch(() => {});
  }, [token]);

  const loadHealth = async () => {
    setLoadingHealth(true);
    try {
      const h = await getVaultHealth(token);
      setHealth(h);
    } catch {
      show("Failed to load health report");
    }
    setLoadingHealth(false);
  };

  const handleExport = async (format: "json" | "csv") => {
    setExporting(true);
    try {
      const data = await exportVault(format, token);
      const blob =
        format === "csv"
          ? new Blob([data as unknown as string], { type: "text/csv" })
          : new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `vaultchain-export.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      show(`Exported as ${format.toUpperCase()}`);
    } catch {
      show("Export failed");
    }
    setExporting(false);
  };

  const handleImport = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,.csv";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setImporting(true);
      try {
        const text = await file.text();
        let entries: Array<Record<string, unknown>>;

        if (file.name.endsWith(".csv")) {
          const lines = text.split("\n").filter((l) => l.trim());
          if (lines.length < 2) {
            show("Empty CSV file");
            setImporting(false);
            return;
          }
          const header = lines[0]!.split(",").map((h) => h.trim().toLowerCase());
          entries = lines.slice(1).map((line) => {
            const values: string[] = [];
            let current = "";
            let inQuotes = false;
            for (const char of line) {
              if (char === '"') {
                inQuotes = !inQuotes;
              } else if (char === "," && !inQuotes) {
                values.push(current);
                current = "";
              } else {
                current += char;
              }
            }
            values.push(current);
            const obj: Record<string, unknown> = {};
            header.forEach((h, i) => {
              obj[h] = values[i] || "";
            });
            return obj;
          });
        } else {
          const parsed = JSON.parse(text);
          entries = parsed.entries || parsed;
          if (!Array.isArray(entries)) {
            show("Invalid JSON format");
            setImporting(false);
            return;
          }
        }

        const result = await importVault(entries, token);
        setImportResult({ created: result.created, skipped: result.skipped });
        show(`Imported ${result.created} entries (${result.skipped} skipped)`);
      } catch (err) {
        show(err instanceof Error ? err.message : "Import failed");
      }
      setImporting(false);
    };
    input.click();
  };

  const handleChangePassword = async () => {
    if (!oldPw || !newPw) return;
    if (newPw !== confirmPw) {
      show("Passwords don't match");
      return;
    }
    if (newPw.length < 8) {
      show("Password must be at least 8 characters");
      return;
    }
    setChangingPw(true);
    try {
      await apiChangePassword(oldPw, newPw, token);
      show("Password changed. Please unlock again.");
      onLock();
    } catch (e) {
      show(e instanceof Error ? e.message : "Failed to change password");
    }
    setChangingPw(false);
  };

  if (section === "changepw") {
    return (
      <div className="absolute inset-0 bg-gray-950 flex flex-col fade-in z-40">
        <div className="flex items-center gap-3 px-5 pt-5 pb-3">
          <button onClick={() => setSection("main")} className="p-2 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <h2 className="text-lg font-bold text-white">Change Password</h2>
        </div>
        <div className="flex-1 px-5 space-y-4 overflow-y-auto">
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Current Password</label>
            <input type="password" value={oldPw} onChange={(e) => setOldPw(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">New Password</label>
            <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Confirm New Password</label>
            <input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <button onClick={handleChangePassword} disabled={changingPw || !oldPw || !newPw} className="w-full py-3.5 rounded-2xl text-white font-semibold transition-all disabled:opacity-40" style={{ background: "linear-gradient(135deg, #6366f1, #9333ea)" }}>
            {changingPw ? "Changing..." : "Change Password"}
          </button>
          <p className="text-[10px] text-gray-600 text-center">
            This will re-encrypt all entries with the new password.
          </p>
        </div>
      </div>
    );
  }

  if (section === "health") {
    return (
      <div className="absolute inset-0 bg-gray-950 flex flex-col fade-in z-40">
        <div className="flex items-center gap-3 px-5 pt-5 pb-3">
          <button onClick={() => setSection("main")} className="p-2 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <h2 className="text-lg font-bold text-white">Vault Health</h2>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-4">
          {!health && !loadingHealth && (
            <button onClick={loadHealth} className="w-full py-3 rounded-2xl bg-white/5 text-gray-300 text-sm">
              Scan Vault
            </button>
          )}
          {loadingHealth && (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {health && (
            <>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <p className="text-sm text-white font-medium">Weak Passwords</p>
                <p className="text-2xl font-bold text-red-400 mt-1">{health.weak.length}</p>
                {health.weak.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {health.weak.map((e) => (
                      <p key={e.name} className="text-xs text-gray-400">• {e.name} ({e.username})</p>
                    ))}
                  </div>
                )}
              </div>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <p className="text-sm text-white font-medium">Reused Passwords</p>
                <p className="text-2xl font-bold text-amber-400 mt-1">{health.reused.length}</p>
                {health.reused.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {health.reused.map((r, i) => (
                      <div key={i}>
                        <p className="text-xs text-gray-500">Shared by:</p>
                        {r.entries.map((e) => (
                          <p key={e.name} className="text-xs text-gray-400">• {e.name} ({e.username})</p>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {health.weak.length === 0 && health.reused.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">Your vault looks healthy!</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  if (section === "folders") {
    return (
      <div className="absolute inset-0 bg-gray-950 flex flex-col fade-in z-40">
        <div className="flex items-center gap-3 px-5 pt-5 pb-3">
          <button onClick={() => setSection("main")} className="p-2 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <h2 className="text-lg font-bold text-white">Folders</h2>
        </div>
        <div className="flex-1 px-5 overflow-y-auto">
          {folders.length === 0 ? (
            <p className="text-xs text-gray-600 text-center py-8">No folders yet</p>
          ) : (
            <div className="space-y-1">
              {folders.map((f) => (
                <div key={f.id} className="flex items-center gap-3 py-3 px-3 rounded-xl bg-white/[0.03]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  </svg>
                  <span className="text-sm text-white">{f.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 bg-gray-950 flex flex-col fade-in z-40">
      <div className="flex items-center gap-3 px-5 pt-5 pb-3">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <h2 className="text-lg font-bold text-white">Settings</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-1">
        <SettingsSection title="Account">
          <SettingsRow icon="🔑" label="Change Master Password" onClick={() => setSection("changepw")} />
        </SettingsSection>

        <SettingsSection title="Vault">
          <SettingsRow icon="📁" label="Folders" sub={`${folders.length} folders`} onClick={() => setSection("folders")} />
          <SettingsRow icon="❤️" label="Vault Health" sub="Check weak & reused passwords" onClick={() => { setSection("health"); loadHealth(); }} />
          <button
            onClick={() => handleExport("json")}
            disabled={exporting}
            className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/[0.03] transition-colors text-left"
          >
            <span className="text-lg">📤</span>
            <div className="flex-1">
              <p className="text-sm text-white">Export Vault</p>
              <p className="text-xs text-gray-500">Download as JSON or CSV</p>
            </div>
          </button>
          <div className="flex border-t border-white/5">
            <button
              onClick={() => handleExport("json")}
              disabled={exporting}
              className="flex-1 py-3 text-xs text-indigo-400 hover:bg-white/[0.03] border-r border-white/5"
            >
              {exporting ? "..." : "JSON"}
            </button>
            <button
              onClick={() => handleExport("csv")}
              disabled={exporting}
              className="flex-1 py-3 text-xs text-indigo-400 hover:bg-white/[0.03]"
            >
              {exporting ? "..." : "CSV"}
            </button>
          </div>
          <button
            onClick={handleImport}
            disabled={importing}
            className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/[0.03] transition-colors text-left border-t border-white/5"
          >
            <span className="text-lg">📥</span>
            <div className="flex-1">
              <p className="text-sm text-white">Import Vault</p>
              <p className="text-xs text-gray-500">
                {importing
                  ? "Importing..."
                  : importResult
                    ? `${importResult.created} imported, ${importResult.skipped} skipped`
                    : "From JSON or CSV file"}
              </p>
            </div>
          </button>
        </SettingsSection>

        <SettingsSection title="Autofill">
          <SettingsRow icon="🌐" label="URI Match Strategy" sub="Base Domain (default)" />
          <SettingsRow icon="🔄" label="Autofill on Page Load" sub="Enabled" />
          <SettingsRow icon="📋" label="Context Menu Fill" sub="Enabled" />
        </SettingsSection>

        <SettingsSection title="Security">
          <SettingsRow icon="🔒" label="Auto-lock Timeout" sub="15 minutes" />
          <SettingsRow icon="⏱️" label="Clipboard Clear" sub="30 seconds" />
        </SettingsSection>

        <div className="pt-4">
          <button
            onClick={onLock}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-colors hover:bg-red-500/10 text-red-400"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span className="text-sm font-medium">Lock Vault</span>
          </button>
        </div>

        <div className="pt-2 pb-4 text-center">
          <p className="text-xs text-gray-600">VaultChain v0.1.0</p>
        </div>
      </div>
    </div>
  );
}

function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="pt-3 pb-1">
      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-1 px-1">
        {title}
      </p>
      <div className="rounded-2xl bg-white/[0.02] border border-white/5 overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function SettingsRow({
  icon,
  label,
  sub,
  onClick,
}: {
  icon: string;
  label: string;
  sub?: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/[0.03] transition-colors text-left"
    >
      <span className="text-lg">{icon}</span>
      <div className="flex-1">
        <p className="text-sm text-white">{label}</p>
        {sub && <p className="text-xs text-gray-500">{sub}</p>}
      </div>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-600">
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </button>
  );
}
