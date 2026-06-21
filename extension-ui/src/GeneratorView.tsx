import { useState, useEffect, useCallback } from "react";
import {
  generatePassword,
  generatePassphrase,
  getGenerationHistory,
  saveGenerationHistory,
  clearGenerationHistory,
  type GeneratedPassword,
} from "./api";

interface Props {
  token: string;
  entry?: { name: string; username: string } | null;
  onBack: () => void;
  onUsePassword?: (pw: string) => void;
  show: (m: string) => void;
}

export default function GeneratorView({
  token,
  entry,
  onBack,
  onUsePassword,
  show,
}: Props) {
  const [mode, setMode] = useState<"password" | "passphrase">("password");
  const [length, setLength] = useState(16);
  const [words, setWords] = useState(4);
  const [separator, setSeparator] = useState("-");
  const [capitalize, setCapitalize] = useState(true);
  const [result, setResult] = useState("");
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<GeneratedPassword[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const SERVICE_COLORS: Record<string, { color: string; letter: string }> = {
    github: { color: "#24292e", letter: "G" },
    google: { color: "#4285f4", letter: "G" },
    facebook: { color: "#1877f2", letter: "f" },
  };
  const info = entry
    ? Object.entries(SERVICE_COLORS).find(([k]) =>
        entry.name.toLowerCase().includes(k),
      )?.[1] || { color: "#6366f1", letter: entry.name[0]?.toUpperCase() || "?" }
    : null;

  const doGen = useCallback(async () => {
    setGenerating(true);
    try {
      let pw: string;
      if (mode === "password") {
        const d = await generatePassword(length, token);
        pw = d.password;
      } else {
        const d = await generatePassphrase(words, separator, capitalize, token);
        pw = d.passphrase;
      }
      setResult(pw);
      setCopied(false);
    } catch {}
    setGenerating(false);
  }, [mode, length, words, separator, capitalize, token]);

  useEffect(() => {
    doGen();
  }, []);

  const loadHistory = async () => {
    try {
      const h = await getGenerationHistory(token);
      setHistory(h);
    } catch {}
  };

  useEffect(() => {
    if (showHistory) loadHistory();
  }, [showHistory]);

  const copy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result);
    setCopied(true);
    show("Password copied");
    try {
      await saveGenerationHistory(result, mode, token);
    } catch {}
    setTimeout(() => setCopied(false), 2000);
  };

  const clearHist = async () => {
    try {
      await clearGenerationHistory(token);
      setHistory([]);
      show("History cleared");
    } catch {}
  };

  const usePassword = () => {
    if (onUsePassword && result) {
      onUsePassword(result);
      show("Password applied");
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
        <h2 className="text-lg font-bold text-white">Generator</h2>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="ml-auto p-2 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white"
          title="History"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </button>
      </div>

      <div className="flex-1 px-5 space-y-5 overflow-y-auto">
        {entry && info && (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/10">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold"
              style={{ backgroundColor: info.color }}
            >
              {info.letter}
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{entry.name}</p>
              <p className="text-xs text-gray-400">{entry.username}</p>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          {(["password", "passphrase"] as const).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                setTimeout(doGen, 0);
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-medium transition-colors ${
                mode === m
                  ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                  : "bg-white/5 text-gray-400 border border-white/5"
              }`}
            >
              {m === "password" ? "Password" : "Passphrase"}
            </button>
          ))}
        </div>

        <div>
          <p className="text-xs text-gray-500 mb-2 text-center">Generated</p>
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
            <p className="text-base font-mono text-white text-center tracking-wider break-all">
              {result || "—"}
            </p>
          </div>
        </div>

        {mode === "password" ? (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Length</span>
              <span
                className="text-sm font-bold px-3 py-1 rounded-full"
                style={{
                  color: "#818cf8",
                  background: "rgba(99,102,241,0.15)",
                }}
              >
                {length}
              </span>
            </div>
            <input
              type="range"
              min={8}
              max={64}
              value={length}
              onChange={(e) => setLength(Number(e.target.value))}
              onMouseUp={doGen}
              onTouchEnd={doGen}
              className="w-full cursor-pointer"
            />
            <div className="grid grid-cols-2 gap-3 mt-4">
              {["Uppercase", "Lowercase", "Numbers", "Symbol"].map((l) => (
                <div
                  key={l}
                  className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.03] border border-white/5"
                >
                  <span className="text-xs text-gray-300">{l}</span>
                  <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Words</span>
                <span
                  className="text-sm font-bold px-3 py-1 rounded-full"
                  style={{
                    color: "#818cf8",
                    background: "rgba(99,102,241,0.15)",
                  }}
                >
                  {words}
                </span>
              </div>
              <input
                type="range"
                min={2}
                max={10}
                value={words}
                onChange={(e) => setWords(Number(e.target.value))}
                onMouseUp={doGen}
                onTouchEnd={doGen}
                className="w-full cursor-pointer"
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">Separator</label>
                <select
                  value={separator}
                  onChange={(e) => {
                    setSeparator(e.target.value);
                    setTimeout(doGen, 0);
                  }}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none"
                >
                  <option value="-" className="bg-gray-900">- (dash)</option>
                  <option value=" " className="bg-gray-900">space</option>
                  <option value="." className="bg-gray-900">. (dot)</option>
                  <option value="_" className="bg-gray-900">_ (underscore)</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">Capitalize</label>
                <button
                  onClick={() => {
                    setCapitalize(!capitalize);
                    setTimeout(doGen, 0);
                  }}
                  className={`w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    capitalize
                      ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                      : "bg-white/5 text-gray-400 border border-white/5"
                  }`}
                >
                  {capitalize ? "Yes" : "No"}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-3 pb-4">
          <button
            onClick={copy}
            disabled={!result}
            className="flex-1 py-3.5 rounded-2xl text-white font-semibold transition-all flex items-center justify-center gap-2 disabled:from-gray-700 disabled:to-gray-700"
            style={{
              background: result
                ? "linear-gradient(135deg, #10b981, #14b8a6)"
                : "#374151",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            {copied ? "Copied!" : "Copy to clipboard"}
          </button>
          <button
            onClick={doGen}
            disabled={generating}
            className="w-14 rounded-2xl border-2 flex items-center justify-center transition-colors flex-shrink-0"
            style={{
              background: "rgba(245,158,11,0.2)",
              borderColor: "#f59e0b",
              color: "#fbbf24",
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={generating ? "animate-spin" : ""}
            >
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
          </button>
        </div>

        {onUsePassword && (
          <button
            onClick={usePassword}
            disabled={!result}
            className="w-full py-3 rounded-2xl text-white font-semibold transition-all disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #6366f1, #9333ea)" }}
          >
            Use This Password
          </button>
        )}

        {showHistory && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-500">Generation History</p>
              {history.length > 0 && (
                <button
                  onClick={clearHist}
                  className="text-[10px] text-red-400 hover:text-red-300"
                >
                  Clear
                </button>
              )}
            </div>
            {history.length === 0 ? (
              <p className="text-xs text-gray-600 text-center py-4">
                No history yet
              </p>
            ) : (
              <div className="space-y-1">
                {history.map((h, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.03]"
                  >
                    <span className="text-xs text-gray-300 font-mono truncate flex-1 mr-2">
                      {h.password}
                    </span>
                    <span className="text-[10px] text-gray-600 flex-shrink-0">
                      {new Date(h.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
