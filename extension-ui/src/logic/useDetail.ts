import { useState, useEffect } from "react";
import {
  getPassword, getTotp, getPasswordHistory, toggleFavorite,
} from "../api";
import { type Entry, type PasswordHistoryEntry } from "../shared/types";

export function useDetailLogic(entry: Entry, token: string) {
  const [showPw, setShowPw] = useState(false);
  const [password, setPassword] = useState("");
  const [histOpen, setHistOpen] = useState(false);
  const [fav, setFav] = useState(entry.favorite || false);
  const [totp, setTotp] = useState<{ token: string; remaining: number } | null>(null);
  const [history, setHistory] = useState<PasswordHistoryEntry[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    getPassword(entry.name, token).then(d => setPassword(d.password)).catch(() => {});
    if (entry.hasTotp) getTotp(entry.name, token).then(setTotp).catch(() => {});
    getPasswordHistory(entry.name, token).then(setHistory).catch(() => {});
  }, [entry.name, token, entry.hasTotp]);

  useEffect(() => {
    if (!entry.hasTotp || !totp) return;
    const iv = setInterval(() => { getTotp(entry.name, token).then(setTotp).catch(() => {}); }, (totp.remaining > 1 ? totp.remaining - 1 : 30) * 1000);
    return () => clearInterval(iv);
  }, [entry.hasTotp, totp, entry.name, token]);

  const toggleFav = () => {
    toggleFavorite(entry.name, token).then(d => setFav(d.favorite));
  };

  return {
    showPw, setShowPw, password, histOpen, setHistOpen,
    fav, toggleFav, totp, history, confirmDelete, setConfirmDelete,
  };
}
