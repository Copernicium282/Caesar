import { useState, useEffect } from "react";
import { getVaultHealth } from "../api";
import { type HealthReport } from "../shared/types";

export function useHealthLogic(token: string) {
  const [health, setHealth] = useState<HealthReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getVaultHealth(token).then(setHealth).catch(() => {}).finally(() => setLoading(false));
  }, [token]);

  return { health, loading };
}
