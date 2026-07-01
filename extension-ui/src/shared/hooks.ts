import { useState, useRef, useCallback } from "react";
import zxcvbn from "zxcvbn";

const STRENGTH_COLORS = ["#c0392b", "#c0392b", "#c9a84c", "#5a8a5e", "#2d7a3a"];
const STRENGTH_LABELS = ["Very Weak", "Weak", "Fair", "Strong", "Very Strong"];

export function strengthOf(pw: string) {
  if (!pw) return { score: 0, label: "", color: "#c0392b" };
  const result = zxcvbn(pw);
  return {
    score: result.score + 1,
    label: STRENGTH_LABELS[result.score],
    color: STRENGTH_COLORS[result.score],
  };
}

export function useCopy(clearMs?: number) {
  const [copied, setCopied] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copy = useCallback((text: string, key: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(key);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(null), 2000);
    if (clearMs && clearMs > 0) {
      if (clearTimer.current) clearTimeout(clearTimer.current);
      clearTimer.current = setTimeout(() => {
        navigator.clipboard?.writeText("").catch(() => {});
      }, clearMs);
    }
  }, [clearMs]);
  return { copied, copy };
}
