import { useState, useEffect } from "react";
import { getSnapshotStatus, commitSnapshot, verifySnapshot } from "../api";

export function useSnapshotLogic(token: string) {
  const [status, setStatus] = useState<{ hash: string; entryCount: number; timestamp: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [committing, setCommitting] = useState(false);
  const [verifyHash, setVerifyHash] = useState("");
  const [verifyResult, setVerifyResult] = useState<{ valid: boolean; currentHash: string } | null>(null);
  const [verifying, setVerifying] = useState(false);

  const loadStatus = () => {
    setLoading(true);
    getSnapshotStatus(token).then(setStatus).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { loadStatus(); }, [token]);

  const handleCommit = async () => {
    setCommitting(true);
    try {
      const result = await commitSnapshot(token);
      setStatus(result);
    } catch {}
    setCommitting(false);
  };

  const handleVerify = async () => {
    if (!verifyHash.trim()) return;
    setVerifying(true);
    setVerifyResult(null);
    try {
      const result = await verifySnapshot(verifyHash.trim(), token);
      setVerifyResult(result);
    } catch {}
    setVerifying(false);
  };

  return {
    status, loading, committing, verifyHash, setVerifyHash,
    verifyResult, verifying, handleCommit, handleVerify,
  };
}
