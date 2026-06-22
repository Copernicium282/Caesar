import { Copy, Check, RefreshCw } from "lucide-react";
import { C } from "../shared/palette";
import { saveGenerationHistory } from "../api";
import { strengthOf, useCopy } from "../shared/hooks";
import { TopBar } from "./shared";
import { useGeneratorLogic } from "../logic/useGenerator";

export default function GeneratorView({ onBack, token }: { onBack: () => void; token: string }) {
  const { copied, copy } = useCopy();
  const {
    mode, setMode, len, setLen, words, setWords,
    sep, setSep, cap, setCap, out, hist, showHist, setShowHist,
    regen, clearHist,
  } = useGeneratorLogic(token);

  const str = strengthOf(out);

  return (
    <div className="view-fade flex flex-col" style={{ height: "100%" }}>
      <TopBar title="Generator" showBack onBack={onBack} />
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3" style={{ scrollbarWidth: "none" }}>
        <div className="flex gap-2">
          {(["password", "passphrase"] as const).map(m => (
            <button key={m} className="flex-1 rounded-md transition-colors"
              style={{ height: 36, fontSize: 12, fontWeight: 600, textTransform: "capitalize",
                background: mode === m ? C.accentSubtle : "transparent", color: mode === m ? C.accent : C.inkFaint,
                border: `1px solid ${mode === m ? C.accent : C.hairline}` }}
              onClick={() => setMode(m)}>
              {m === "password" ? "Password" : "Passphrase"}
            </button>
          ))}
        </div>
        <div className="rounded-md p-3" style={{ background: C.surface, border: `1px solid ${C.hairline}` }}>
          <div className="break-all mb-2" style={{ fontSize: 13, fontFamily: "monospace", color: C.accent, minHeight: 40 }}>{out}</div>
          <div className="flex items-center gap-2">
            <div className="flex-1 rounded-sm overflow-hidden" style={{ height: 3, background: C.hairline }}>
              <div className="rounded-sm transition-all" style={{ width: `${(str.score / 5) * 100}%`, height: "100%", background: str.color }} />
            </div>
            <span style={{ fontSize: 11, color: str.color }}>{str.label}</span>
          </div>
        </div>
        {mode === "password" ? (
          <div>
            <div className="flex justify-between mb-1.5">
              <span style={{ fontSize: 12, color: C.inkMuted }}>Length</span>
              <span style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 600, color: C.accent }}>{len}</span>
            </div>
            <input type="range" min={8} max={64} value={len} onChange={e => setLen(+e.target.value)} className="w-full" />
          </div>
        ) : (
          <>
            <div>
              <div className="flex justify-between mb-1.5">
                <span style={{ fontSize: 12, color: C.inkMuted }}>Words</span>
                <span style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 600, color: C.accent }}>{words}</span>
              </div>
              <input type="range" min={2} max={10} value={words} onChange={e => setWords(+e.target.value)} className="w-full" />
            </div>
            <div>
              <div className="text-xs mb-1.5" style={{ color: C.inkMuted }}>Separator</div>
              <div className="flex gap-1.5">
                {["-", "_", ".", " ", "#"].map(s => (
                  <button key={s} className="w-9 h-9 rounded-md font-mono text-sm transition-colors"
                    style={{ background: sep === s ? C.accentSubtle : C.surface, color: sep === s ? C.accent : C.inkFaint, border: `1px solid ${sep === s ? C.accent : C.hairline}` }}
                    onClick={() => setSep(s)}>{s === " " ? "␣" : s}</button>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <div className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-colors"
                style={{ background: cap ? C.accentSubtle : C.surface, border: `1px solid ${cap ? C.accent : C.hairline}` }}
                onClick={() => setCap(c => !c)}>
                {cap && <Check size={9} style={{ color: C.accent }} />}
              </div>
              <span style={{ fontSize: 12, color: C.inkMuted }}>Capitalize</span>
            </label>
          </>
        )}
        <div className="flex gap-2">
          <button className="flex-1 flex items-center justify-center gap-1.5 rounded-md transition-colors"
            style={{ height: 36, fontSize: 12, fontWeight: 600, background: "transparent", border: `1px solid ${C.accent}`, color: C.accent }}
            onClick={() => { copy(out, "gen"); saveGenerationHistory(out, mode, token); }}>
            {copied === "gen" ? <Check size={12} /> : <Copy size={12} />}
            {copied === "gen" ? "Copied" : "Copy"}
          </button>
          <button className="flex-1 flex items-center justify-center gap-1.5 rounded-md transition-colors"
            style={{ height: 36, fontSize: 12, fontWeight: 600, background: "transparent", border: `1px solid ${C.hairline}`, color: C.inkMuted }}
            onClick={regen}>
            <RefreshCw size={12} /> Regenerate
          </button>
        </div>
        {showHist && hist.length > 0 && (
          <div className="rounded-md overflow-hidden" style={{ border: `1px solid ${C.hairline}` }}>
            <div className="flex items-center justify-between px-3 py-2" style={{ background: C.surface, fontSize: 11, fontWeight: 600, color: C.inkFaint }}>
              <span>Recent</span>
              <button className="hover:opacity-70" style={{ fontSize: 10, color: C.inkFaint, background: "none", border: "none", cursor: "pointer", padding: 0 }}
                onClick={clearHist}>Clear</button>
            </div>
            {hist.slice(0, 5).map((h, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2" style={{ borderTop: `1px solid ${C.hairline}` }}>
                <span className="flex-1 truncate" style={{ fontSize: 11, fontFamily: "monospace", color: C.inkMuted }}>{h.password}</span>
                <button style={{ color: C.inkFaint }} className="hover:opacity-70" onClick={() => copy(h.password, `h${i}`)}>
                  {copied === `h${i}` ? <Check size={11} style={{ color: C.accent }} /> : <Copy size={11} />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
