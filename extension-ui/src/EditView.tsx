import { useState, useEffect } from "react";
import {
  type Entry,
  type CustomField,
  addEntry,
  updateEntry,
  getFolders,
  type Folder,
  generatePassword,
} from "./api";

interface Props {
  token: string;
  entry?: Entry | null;
  onBack: () => void;
  onSaved: () => void;
  show: (m: string) => void;
}

export default function EditView({ token, entry, onBack, onSaved, show }: Props) {
  const isEdit = !!entry;
  const [name, setName] = useState(entry?.name || "");
  const [username, setUsername] = useState(entry?.username || "");
  const [password, setPassword] = useState("");
  const [url, setUrl] = useState(entry?.url || "");
  const [uris, setUris] = useState<string[]>(entry?.uris || []);
  const [uriInput, setUriInput] = useState("");
  const [notes, setNotes] = useState(entry?.notes || "");
  const [folder, setFolder] = useState(entry?.folder || "");
  const [type, setType] = useState<"login" | "note">(entry?.type || "login");
  const [customFields, setCustomFields] = useState<CustomField[]>(entry?.customFields || []);
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldValue, setNewFieldValue] = useState("");
  const [newFieldType, setNewFieldType] = useState<"text" | "password" | "boolean" | "number">("text");
  const [folders, setFolders] = useState<Folder[]>([]);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    getFolders(token).then(setFolders).catch(() => {});
    browser.tabs.query({ active: true, currentWindow: true }).then((t) => {
      try {
        setTab(new URL(t[0]?.url || "").hostname);
      } catch {}
    });
  }, [token]);

  const addUri = () => {
    const u = uriInput.trim();
    if (u && !uris.includes(u)) {
      setUris([...uris, u]);
      setUriInput("");
    }
  };

  const removeUri = (idx: number) => {
    setUris(uris.filter((_, i) => i !== idx));
  };

  const addCustomField = () => {
    if (!newFieldName.trim()) return;
    setCustomFields([
      ...customFields,
      { name: newFieldName.trim(), value: newFieldValue, type: newFieldType },
    ]);
    setNewFieldName("");
    setNewFieldValue("");
    setNewFieldType("text");
  };

  const removeCustomField = (idx: number) => {
    setCustomFields(customFields.filter((_, i) => i !== idx));
  };

  const handleGenerate = async () => {
    try {
      const d = await generatePassword(20, token);
      setPassword(d.password);
      setShowPassword(true);
    } catch {}
  };

  const handleSave = async () => {
    if (!name.trim()) {
      show("Name is required");
      return;
    }
    if (!isEdit && !password.trim()) {
      show("Password is required");
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        const data: Record<string, unknown> = {};
        if (name !== entry!.name) data.name = name;
        if (username !== entry!.username) data.username = username;
        if (password) data.password = password;
        if (url !== (entry!.url || "")) data.url = url;
        if (JSON.stringify(uris) !== JSON.stringify(entry!.uris || [])) data.uris = uris;
        if (notes !== (entry!.notes || "")) data.notes = notes;
        if (folder !== (entry!.folder || "")) data.folder = folder || null;
        if (type !== (entry!.type || "login")) data.type = type;
        if (JSON.stringify(customFields) !== JSON.stringify(entry!.customFields || []))
          data.customFields = customFields;
        await updateEntry(entry!.name, data, token);
        show("Entry updated");
      } else {
        await addEntry(
          {
            name: name.trim(),
            username: username.trim(),
            password: password.trim(),
            url: url.trim() || undefined,
            uris: uris.length > 0 ? uris : tab ? [tab] : undefined,
            notes: notes.trim() || undefined,
            folder: folder || undefined,
            type,
            customFields: customFields.length > 0 ? customFields : undefined,
          },
          token,
        );
        show("Entry saved");
      }
      onSaved();
    } catch (e) {
      show(e instanceof Error ? e.message : "Failed to save");
    }
    setSaving(false);
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
        <h2 className="text-lg font-bold text-white">
          {isEdit ? "Edit Entry" : "Add Entry"}
        </h2>
      </div>

      <div className="flex-1 px-5 space-y-4 overflow-y-auto">
        {!isEdit && tab && (
          <div className="px-4 py-2.5 rounded-xl" style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)" }}>
            <p className="text-xs text-indigo-400">
              Current site: <span className="font-medium text-indigo-300">{tab}</span>
            </p>
          </div>
        )}

        <div className="flex gap-2">
          {(["login", "note"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`flex-1 py-2 rounded-xl text-xs font-medium transition-colors ${
                type === t
                  ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                  : "bg-white/5 text-gray-400 border border-white/5"
              }`}
            >
              {t === "login" ? "Login" : "Secure Note"}
            </button>
          ))}
        </div>

        <FieldInput label="Name" value={name} onChange={setName} placeholder="e.g. GitHub" />
        {type === "login" && (
          <FieldInput label="Username" value={username} onChange={setUsername} placeholder="e.g. user@email.com" />
        )}

        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">Password</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isEdit ? "Leave blank to keep current" : "Enter password"}
                className="w-full px-4 py-3 pr-10 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-white"
              >
                {showPassword ? (
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
            </div>
            <button
              onClick={handleGenerate}
              className="px-3 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Generate password"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
              </svg>
            </button>
          </div>
        </div>

        <FieldInput label="URL" value={url} onChange={setUrl} placeholder="e.g. https://github.com" />

        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">URIs</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={uriInput}
              onChange={(e) => setUriInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addUri())}
              placeholder="e.g. github.com"
              className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={addUri}
              className="px-3 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white"
            >
              +
            </button>
          </div>
          {uris.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {uris.map((u, i) => (
                <span
                  key={i}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 text-xs text-gray-300"
                >
                  {u}
                  <button onClick={() => removeUri(i)} className="text-gray-500 hover:text-white">
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">Folder</label>
          <select
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="" className="bg-gray-900">No folder</option>
            {folders.map((f) => (
              <option key={f.id} value={f.name} className="bg-gray-900">
                {f.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes..."
            rows={3}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">Custom Fields</label>
          {customFields.map((f, i) => (
            <div key={i} className="flex items-center gap-2 mb-2">
              <div className="flex-1 px-3 py-2 rounded-lg bg-white/[0.03] text-xs">
                <span className="text-gray-500">{f.name}:</span>{" "}
                <span className="text-gray-300">
                  {f.type === "password" ? "••••••••" : String(f.value)}
                </span>
              </div>
              <button
                onClick={() => removeCustomField(i)}
                className="p-1.5 text-gray-500 hover:text-red-400"
              >
                ×
              </button>
            </div>
          ))}
          <div className="flex gap-2">
            <input
              type="text"
              value={newFieldName}
              onChange={(e) => setNewFieldName(e.target.value)}
              placeholder="Field name"
              className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-xs placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <select
              value={newFieldType}
              onChange={(e) => setNewFieldType(e.target.value as any)}
              className="px-2 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-xs focus:outline-none"
            >
              <option value="text" className="bg-gray-900">Text</option>
              <option value="password" className="bg-gray-900">Password</option>
              <option value="number" className="bg-gray-900">Number</option>
              <option value="boolean" className="bg-gray-900">Boolean</option>
            </select>
          </div>
          <div className="flex gap-2 mt-2">
            <input
              type="text"
              value={newFieldValue}
              onChange={(e) => setNewFieldValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomField())}
              placeholder="Field value"
              className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-xs placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={addCustomField}
              className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white text-xs"
            >
              Add
            </button>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="w-full py-3.5 rounded-2xl text-white font-semibold transition-all mt-4 disabled:from-gray-700 disabled:to-gray-700"
          style={{
            background:
              saving || !name.trim()
                ? "#374151"
                : "linear-gradient(135deg, #6366f1, #9333ea)",
          }}
        >
          {saving ? "Saving..." : isEdit ? "Save Changes" : "Save Entry"}
        </button>
      </div>
    </div>
  );
}

function FieldInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="text-xs text-gray-500 mb-1.5 block">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
    </div>
  );
}
