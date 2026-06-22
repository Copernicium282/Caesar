import { Copy, Check, Shield } from "lucide-react";
import { C } from "../shared/palette";
import { useCopy } from "../shared/hooks";
import { TopBar } from "./shared";
import { useSnapshotLogic } from "../logic/useSnapshot";

export default function SnapshotView({ onBack, token }: { onBack: () => void; token: string }) {
  const { copied, copy } = useCopy();
  const {
    status, loading, committing, verifyHash, setVerifyHash,
    verifyResult, verifying, handleCommit, handleVerify,
  } = useSnapshotLogic(token);

  return (
    <div className="view-fade flex flex-col" style={{ height: "100%" }}>
      <TopBar title="Snapshot" showBack onBack={onBack} />
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3" style={{ scrollbarWidth: "none" }}>
        <div className="rounded-md p-3" style={{ background: C.surface, border: `1px solid ${C.hairline}` }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: C.inkFaint, marginBottom: 8 }}>Vault Integrity</div>
          {loading ? (
            <div className="skeleton rounded" style={{ height: 60 }} />
          ) : status ? (
            <div className="space-y-2">
              <div className="flex justify-between">
                <span style={{ fontSize: 11, color: C.inkMuted }}>Entries</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: C.ink }}>{status.entryCount}</span>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <span style={{ fontSize: 11, color: C.inkMuted }}>Hash</span>
                  <button className="hover:opacity-70" style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: C.inkFaint }}
                    onClick={() => copy(status.hash, "hash")}>
                    {copied === "hash" ? <Check size={11} style={{ color: C.accent }} /> : <Copy size={11} />}
                  </button>
                </div>
                <div className="mt-1 p-2 rounded" style={{ background: C.bg, fontSize: 10, fontFamily: "monospace", color: C.accent, wordBreak: "break-all" }}>
                  {status.hash}
                </div>
              </div>
              <div className="flex justify-between">
                <span style={{ fontSize: 11, color: C.inkMuted }}>Generated</span>
                <span style={{ fontSize: 11, color: C.inkMuted }}>{new Date(status.timestamp).toLocaleString()}</span>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: C.inkFaint }}>Failed to load</div>
          )}
        </div>

        <button className="w-full rounded-md flex items-center justify-center gap-1.5 transition-colors"
          style={{ height: 36, fontSize: 12, fontWeight: 600, background: committing ? C.accentPressed : C.accent, color: C.accentTextOn, border: "none", cursor: committing ? "wait" : "pointer", opacity: committing ? 0.7 : 1 }}
          onClick={handleCommit} disabled={committing}>
          <Shield size={13} /> {committing ? "Committing..." : "Commit Snapshot"}
        </button>

        <div className="rounded-md p-3" style={{ background: C.surface, border: `1px solid ${C.hairline}` }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: C.inkFaint, marginBottom: 8 }}>Verify Hash</div>
          <input type="text" placeholder="Paste a snapshot hash to verify..." value={verifyHash} onChange={e => setVerifyHash(e.target.value)}
            className="w-full rounded-md outline-none transition-colors"
            style={{ background: C.bg, border: `1px solid ${C.hairline}`, color: C.ink, caretColor: C.accent, padding: "7px 10px", height: 34, fontSize: 12, fontFamily: "monospace" }} />
          <button className="w-full rounded-md flex items-center justify-center gap-1.5 mt-2 transition-colors"
            style={{ height: 32, fontSize: 12, fontWeight: 600, background: "transparent", border: `1px solid ${C.accent}`, color: C.accent, cursor: verifying ? "wait" : "pointer", opacity: verifying ? 0.7 : 1 }}
            onClick={handleVerify} disabled={verifying || !verifyHash.trim()}>
            <Check size={12} /> {verifying ? "Verifying..." : "Verify"}
          </button>
          {verifyResult && (
            <div className="mt-2 p-2 rounded" style={{ background: verifyResult.valid ? "#1a2e1a" : "#2e1a1a", border: `1px solid ${verifyResult.valid ? "#5a8a5e" : C.error}` }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: verifyResult.valid ? "#5a8a5e" : C.error }}>
                {verifyResult.valid ? "Valid — hash matches" : "Invalid — hash does not match"}
              </div>
              <div className="mt-1" style={{ fontSize: 10, fontFamily: "monospace", color: C.inkMuted, wordBreak: "break-all" }}>
                Current: {verifyResult.currentHash}
              </div>
            </div>
          )}
        </div>

        <div style={{ fontSize: 11, color: C.inkFaint, lineHeight: 1.5 }}>
          The snapshot hash is a SHA-256 digest of all vault entries. Commit to generate a fresh hash, or verify a previously saved hash to confirm vault integrity.
        </div>
      </div>
    </div>
  );
}
