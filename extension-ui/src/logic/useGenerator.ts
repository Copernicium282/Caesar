import { useState, useEffect, useCallback } from "react";
import {
  generatePassphrase, getGenerationHistory, saveGenerationHistory,
  clearGenerationHistory,
} from "../api";

export function useGeneratorLogic(token: string) {
  const [mode, setMode] = useState<"password" | "passphrase">("password");
  const [len, setLen] = useState(20);
  const [words, setWords] = useState(4);
  const [sep, setSep] = useState("-");
  const [cap, setCap] = useState(true);
  const [out, setOut] = useState("");
  const [hist, setHist] = useState<Array<{ password: string; type: string; createdAt: string }>>([]);
  const [showHist, setShowHist] = useState(false);

  const loadHist = async () => {
    try { setHist(await getGenerationHistory(token)); } catch {}
  };

  useEffect(() => { loadHist(); }, []);

  const regen = useCallback(async () => {
    if (mode === "password") {
      const pool = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*_+=";
      const arr = new Uint8Array(len);
      crypto.getRandomValues(arr);
      setOut(Array.from(arr, b => pool[b % pool.length]).join(""));
    } else {
      try {
        const d = await generatePassphrase(words, sep, cap, token);
        setOut(d.passphrase);
      } catch {}
    }
  }, [mode, len, words, sep, cap, token]);

  useEffect(() => { regen(); }, []);

  const clearHist = async () => {
    try { await clearGenerationHistory(token); setHist([]); } catch {}
  };

  return {
    mode, setMode, len, setLen, words, setWords,
    sep, setSep, cap, setCap, out, hist, showHist, setShowHist,
    regen, clearHist,
  };
}
