import { useState } from "react";
import { Copy, Check, ArrowLeft, Star, Globe, Key, Edit2 } from "lucide-react";
import { useTheme } from "../shared/theme";
import { type Entry } from "../shared/types";

export function TopBar({ title, onMenu, onBack, showBack = false, right }: {
  title: string; onMenu?: () => void; onBack?: () => void; showBack?: boolean; right?: React.ReactNode;
}) {
  const { palette: C } = useTheme();
  return (
    <div className="flex items-center justify-between px-3.5 flex-shrink-0" style={{ height: 48, borderBottom: `1px solid ${C.hairline}`, background: C.bg }}>
      {showBack ? (
        <button className="flex items-center justify-center hover:opacity-70 transition-opacity" style={{ color: C.inkFaint, width: 32, height: 32 }} onClick={onBack}>
          <ArrowLeft size={16} />
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <img src="icons/icon-16.png" style={{ width: 20, height: 20, borderRadius: 3 }} />
          <span style={{ color: C.ink, fontWeight: 600, fontSize: 13 }}>{title}</span>
        </div>
      )}
      {right}
    </div>
  );
}

export function FieldCard({ label, value, onCopy, copied, extra }: {
  label: string; value: string; onCopy: () => void; copied: boolean; extra?: React.ReactNode;
}) {
  const { palette: C } = useTheme();
  return (
    <div className="rounded-md p-3" style={{ background: C.surface, border: `1px solid ${C.hairline}` }}>
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: C.inkFaint, marginBottom: 6 }}>{label}</div>
      <div className="flex items-center gap-2">
        <span className="flex-1 truncate" style={{ fontSize: 13, color: C.ink }}>{value}</span>
        {extra}
        <button className="hover:opacity-70 transition-opacity flex-shrink-0"
          style={{ color: copied ? C.accent : C.inkFaint }} onClick={onCopy}>
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>
    </div>
  );
}

export function FormField({ label, placeholder, value, onChange, multiline, type = "text" }: {
  label: string; placeholder: string; value: string; onChange: (v: string) => void; multiline?: boolean; type?: string;
}) {
  const { palette: C } = useTheme();
  const base = {
    placeholder, value,
    className: "w-full rounded-md outline-none resize-none transition-colors",
    style: { background: C.surface, border: `1px solid ${C.hairline}`, color: C.ink, caretColor: C.accent, padding: "8px 12px", height: multiline ? undefined : 38, fontSize: 13 } as React.CSSProperties,
  };
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: C.inkFaint, marginBottom: 6 }}>{label}</div>
      {multiline
        ? <textarea {...base} rows={3} onChange={e => onChange(e.target.value)} />
        : <input {...base} type={type} onChange={e => onChange(e.target.value)} />}
    </div>
  );
}

export function LetterAvatar({ name, size = 32 }: { name: string; size?: number }) {
  const { palette: C } = useTheme();
  const fs = size <= 28 ? 11 : 13;
  return (
    <div style={{
      width: size, height: size, borderRadius: 4,
      background: C.surfaceRaised, display: "flex",
      alignItems: "center", justifyContent: "center", flexShrink: 0,
    }}>
      <span style={{ color: C.accent, fontSize: fs, fontWeight: 600 }}>{name[0]?.toUpperCase() || "?"}</span>
    </div>
  );
}

export function ServiceAvatar({ name, url, size = 32 }: { name: string; url?: string; size?: number }) {
  const { palette: C } = useTheme();
  const domain = url?.replace(/^https?:\/\//, "").split("/")[0] || "";
  const [imgError, setImgError] = useState(false);

  if (domain && !imgError) {
    return (
      <img
        src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
        style={{ width: size, height: size, borderRadius: 4, flexShrink: 0, background: C.surfaceRaised }}
        onError={() => setImgError(true)}
        alt=""
      />
    );
  }
  return <LetterAvatar name={name} size={size} />;
}

export function EntryRow({ entry, onView, onEdit, onCopy, onFill, copied }: {
  entry: Entry; onView: () => void; onEdit: () => void;
  onCopy: (text: string, key: string) => void; onFill: () => void; copied: string | null;
}) {
  const { palette: C } = useTheme();
  const domain = entry.url?.replace(/^https?:\/\//, "").split("/")[0] ?? "";
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="flex items-center gap-3 cursor-pointer group transition-colors rounded-md"
      style={{ padding: "10px 12px", background: hovered ? C.surfaceRaised : "transparent" }}
      onClick={onView}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <ServiceAvatar name={entry.name} url={entry.url} size={32} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="font-semibold truncate" style={{ fontSize: 13, color: C.ink }}>{entry.name}</span>
          {entry.favorite && <Star size={9} style={{ color: C.accent, flexShrink: 0 }} fill={C.accent} />}
          {entry.hasTotp && (
            <span className="px-1 rounded" style={{ fontSize: 9, fontWeight: 600, background: C.accentSubtle, color: C.accent }}>TOTP</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <span className="truncate" style={{ fontSize: 12, color: C.inkMuted }}>
            {entry.username || (entry.type === "note" ? "Secure note" : "")}
          </span>
        </div>
        {domain && (
          <div className="flex items-center gap-1 mt-0.5">
            <Globe size={10} style={{ color: C.inkFaint, flexShrink: 0 }} />
            <span className="truncate" style={{ fontSize: 11, color: C.inkFaint }}>{domain}</span>
          </div>
        )}
      </div>

      <div className={`flex items-center gap-1 transition-opacity ${hovered ? "opacity-100" : "opacity-0"}`}
        onClick={e => e.stopPropagation()}>
        <button className="flex items-center justify-center rounded-md hover:bg-white/5 transition-colors"
          style={{ width: 32, height: 32, color: copied === `u-${entry.name}` ? C.accent : C.inkFaint }}
          onClick={() => onCopy(entry.username || "", `u-${entry.name}`)} title="Copy username">
          {copied === `u-${entry.name}` ? <Check size={13} /> : <Copy size={13} />}
        </button>
        <button className="flex items-center justify-center rounded-md hover:bg-white/5 transition-colors"
          style={{ width: 32, height: 32, color: copied === `p-${entry.name}` ? C.accent : C.inkFaint }}
          onClick={() => onCopy(entry.name, `p-${entry.name}`)} title="Copy password">
          {copied === `p-${entry.name}` ? <Check size={13} /> : <Key size={13} />}
        </button>
        <button className="flex items-center justify-center rounded-md hover:bg-white/5 transition-colors"
          style={{ width: 32, height: 32, color: C.inkFaint }} onClick={onFill} title="Autofill">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
        </button>
        <button className="flex items-center justify-center rounded-md hover:bg-white/5 transition-colors"
          style={{ width: 32, height: 32, color: C.inkFaint }} onClick={onEdit} title="Edit">
          <Edit2 size={13} />
        </button>
      </div>
    </div>
  );
}
