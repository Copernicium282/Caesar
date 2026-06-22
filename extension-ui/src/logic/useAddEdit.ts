import { useState } from "react";
import { generatePassword } from "../api";
import { type Entry } from "../shared/types";

export function useAddEditLogic(entry: Entry | null | undefined, token: string) {
  const [form, setForm] = useState<Record<string, unknown>>(entry ? {
    type: entry.type, name: entry.name, username: entry.username, password: "", url: entry.url || "", folder: entry.folder || "", notes: entry.notes || "",
  } : { type: "login", name: "", username: "", password: "", url: "", folder: "", notes: "" });
  const [showPw, setShowPw] = useState(false);

  const upd = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleGenerate = async () => {
    try {
      const d = await generatePassword(20, token);
      upd("password", d.password);
      setShowPw(true);
    } catch {}
  };

  return { form, upd, showPw, setShowPw, handleGenerate };
}
