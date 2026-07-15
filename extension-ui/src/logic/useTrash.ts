import { useState, useEffect } from "react";
import { getTrash, purgeTrash } from "../api";
import { type Entry } from "../shared/types";

export function useTrashLogic(token: string) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTrash(token).then(list => { setEntries(list); setLoading(false); }).catch(() => setLoading(false));
  }, [token]);

  const handlePurge = async () => {
    try {
      await purgeTrash(token);
      setEntries([]);
    } catch (e) {
      console.error("Purge failed:", e);
    }
  };

  return { entries, loading, handlePurge };
}
