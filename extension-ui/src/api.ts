const API_BASE = "http://127.0.0.1:9876";

export interface Entry { name: string; username: string; url: string; uris?: string[]; }
export interface MatchResult { matched: Entry[]; unmatched: Entry[]; }

async function apiPost(path: string, body: Record<string, unknown>, token?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { method: "POST", headers, body: JSON.stringify(body) });
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || `Request failed (${res.status})`); }
  return res.json();
}

async function apiGet(path: string, token: string) {
  const res = await fetch(`${API_BASE}${path}`, { method: "GET", headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || `Request failed (${res.status})`); }
  return res.json();
}

export const unlock = (pw: string) => apiPost("/unlock", { MasterPwd: pw });
export const lock = (t: string) => apiPost("/lock", {}, t);
export const getMatchedEntries = (url: string, t: string): Promise<MatchResult> => apiGet(`/entries/match?url=${encodeURIComponent(url)}`, t);
export const getPassword = (name: string, t: string): Promise<{ password: string }> => apiGet(`/entries/${encodeURIComponent(name)}/password`, t);
export const generatePassword = (length: number | undefined, t: string): Promise<{ password: string }> => apiGet(`/generate${length ? `?length=${length}` : ""}`, t);
export const addEntry = (data: { name: string; username: string; password: string; uris?: string[] }, t: string): Promise<{ ok: boolean }> => apiPost("/entries", data, t);
