import { Eye, EyeOff, RefreshCw } from "lucide-react";
import { useTheme } from "../shared/theme";
import { type Entry, type Folder as FolderType } from "../shared/types";
import { removeTotp } from "../api";
import { TopBar, FormField } from "./shared";
import { strengthOf } from "../shared/hooks";
import { useAddEditLogic } from "../logic/useAddEdit";

export default function AddEditView({ entry, token, folders, onBack, onSave }: {
  entry?: Entry | null; token: string; folders: FolderType[];
  onBack: () => void; onSave: (data: Partial<Entry>) => void;
}) {
  const { form, upd, showPw, setShowPw, handleGenerate } = useAddEditLogic(entry, token);
  const { palette: C } = useTheme();
  const str = strengthOf((form.password as string) || "");

  return (
    <div className="view-fade flex flex-col" style={{ height: "100%" }}>
      <TopBar title={entry ? "Edit Entry" : "Add Entry"} showBack onBack={onBack} />
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3" style={{ scrollbarWidth: "none" }}>
        <div className="flex gap-2">
          {(["login", "note"] as const).map(t => (
            <button key={t} className="flex-1 rounded-md transition-colors"
              style={{ height: 36, fontSize: 12, fontWeight: 600, textTransform: "capitalize",
                background: form.type === t ? C.accentSubtle : "transparent",
                color: form.type === t ? C.accent : C.inkFaint,
                border: `1px solid ${form.type === t ? C.accent : C.hairline}` }}
              onClick={() => upd("type", t)}>
              {t === "login" ? "Login" : "Secure Note"}
            </button>
          ))}
        </div>
        <FormField label="Name" placeholder="e.g. Gmail" value={(form.name as string) || ""} onChange={v => upd("name", v)} />
        {form.type === "login" && (<>
          <FormField label="Username" placeholder="you@example.com" value={(form.username as string) || ""} onChange={v => upd("username", v)} />
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: C.inkFaint, marginBottom: 6 }}>Password</div>
            <div className="relative">
              <input type={showPw ? "text" : "password"} placeholder="Enter or generate..." value={(form.password as string) || ""} onChange={e => upd("password", e.target.value)}
                className="w-full rounded-md outline-none" style={{ background: C.surface, border: `1px solid ${C.hairline}`, color: C.ink, caretColor: C.accent, padding: "8px 48px 8px 12px", height: 38, fontSize: 13, fontFamily: "monospace" }} />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button style={{ color: C.inkFaint }} className="hover:opacity-70" onClick={() => setShowPw(s => !s)}>{showPw ? <EyeOff size={13} /> : <Eye size={13} />}</button>
                <button style={{ color: C.accent }} className="hover:opacity-70" onClick={handleGenerate}><RefreshCw size={13} /></button>
              </div>
            </div>
            {(form.password as string)?.length > 0 && (
              <div className="flex items-center gap-2 mt-2.5">
                <div className="flex-1 rounded-sm overflow-hidden" style={{ height: 3, background: C.hairline }}>
                  <div className="rounded-sm transition-all" style={{ width: `${(str.score / 5) * 100}%`, height: "100%", background: str.color }} />
                </div>
                <span style={{ fontSize: 11, color: str.color }}>{str.label}</span>
              </div>
            )}
          </div>
          <FormField label="URL" placeholder="https://example.com" value={(form.url as string) || ""} onChange={v => upd("url", v)} />
        </>)}
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: C.inkFaint, marginBottom: 6 }}>Folder</div>
          <select value={(form.folder as string) || ""} onChange={e => upd("folder", e.target.value)}
            className="w-full rounded-md outline-none" style={{ background: C.surface, border: `1px solid ${C.hairline}`, color: C.ink, padding: "8px 12px", height: 38, fontSize: 13 }}>
            <option value="" style={{ background: C.surface }}>No folder</option>
            {folders.map(f => <option key={f.id} value={f.name} style={{ background: C.surface }}>{f.name}</option>)}
          </select>
        </div>
        <FormField label="Notes" placeholder="Optional notes..." value={(form.notes as string) || ""} onChange={v => upd("notes", v)} multiline />
        {entry?.hasTotp ? (
          <div className="rounded-md p-3" style={{ background: C.accentSubtle, border: `1px solid ${C.accent}30` }}>
            <div className="flex items-center justify-between">
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: C.accent }}>TOTP</div>
                <div style={{ fontSize: 11, color: C.inkMuted }}>Configured</div>
              </div>
              <button onClick={async () => { await removeTotp(entry!.name, token); onBack(); }}
                className="rounded-md px-3 py-1.5" style={{ fontSize: 11, background: "transparent", border: `1px solid ${C.error}`, color: C.error }}>Remove</button>
            </div>
          </div>
        ) : (
          <FormField label="TOTP Secret (optional)" placeholder="Base32 secret" value={(form.totpSecret as string) || ""} onChange={v => upd("totpSecret", v)} />
        )}
      </div>
      <div className="px-3 py-2.5" style={{ borderTop: `1px solid ${C.hairline}` }}>
        <button className="w-full rounded-md font-semibold transition-colors"
          style={{ height: 36, fontSize: 13, background: C.accent, color: C.accentTextOn, border: "none", cursor: "pointer" }}
          onClick={() => onSave(form as Partial<Entry>)}>
          {entry ? "Save Changes" : "Add Entry"}
        </button>
      </div>
    </div>
  );
}
