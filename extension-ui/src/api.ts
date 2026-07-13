const API_BASE = "https://127.0.0.1:9876";

export interface CustomField {
  name: string;
  value: string;
  type: "text" | "password" | "boolean" | "number";
}

export interface Entry {
  name: string;
  username: string;
  url: string;
  uris?: string[];
  notes?: string;
  folder?: string | null;
  favorite?: boolean;
  type?: "login" | "note";
  customFields?: CustomField[];
  hasTotp?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface MatchResult {
  matched: Entry[];
  unmatched: Entry[];
}

export interface Folder {
  id: string;
  name: string;
}

export interface PasswordHistoryEntry {
  password: string;
  changedAt: string;
}

export interface HealthReport {
  weak: Array<{ name: string; username: string; url: string }>;
  reused: Array<{ password: string; entries: Array<{ name: string; username: string; url: string }> }>;
}

export interface GeneratedPassword {
  password: string;
  length: number;
  type: string;
  createdAt: string;
}

async function apiPost(
  path: string,
  body: Record<string, unknown>,
  token?: string,
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  headers["X-Caesar-Client"] = "1";
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error("SESSION_EXPIRED");
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Request failed (${res.status})`);
  }
  return res.json();
}

async function apiPut(
  path: string,
  body: Record<string, unknown>,
  token: string,
) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "X-Caesar-Client": "1",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error("SESSION_EXPIRED");
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Request failed (${res.status})`);
  }
  return res.json();
}

async function apiDelete(path: string, token: string) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}`, "X-Caesar-Client": "1" },
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error("SESSION_EXPIRED");
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Request failed (${res.status})`);
  }
  return res.json();
}

async function apiGet(path: string, token: string) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}`, "X-Caesar-Client": "1" },
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error("SESSION_EXPIRED");
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Request failed (${res.status})`);
  }
  return res.json();
}

// Auth
export const unlock = (pw: string) =>
  apiPost("/unlock", { MasterPwd: pw });
export const lock = (t: string) => apiPost("/lock", {}, t);

// Entries
export const getEntries = (t: string): Promise<Entry[]> =>
  apiGet("/entries", t);
export const getTrashedEntries = (t: string): Promise<Entry[]> =>
  apiGet("/entries?trash=true", t);
export const getMatchedEntries = (
  url: string,
  t: string,
): Promise<MatchResult> =>
  apiGet(`/entries/match?url=${encodeURIComponent(url)}`, t);
export const getMatchedEntriesFiltered = (
  url: string,
  t: string,
  filters: { type?: string; folder?: string; favorite?: boolean },
): Promise<MatchResult> => {
  const params = new URLSearchParams({ url });
  if (filters.type) params.set("type", filters.type);
  if (filters.folder) params.set("folder", filters.folder);
  if (filters.favorite) params.set("favorite", "true");
  return apiGet(`/entries/match?${params.toString()}`, t);
};
export const getPassword = (
  name: string,
  t: string,
): Promise<{ password: string }> =>
  apiGet(`/entries/${encodeURIComponent(name)}/password`, t);
export const addEntry = (
  data: {
    name: string;
    username: string;
    password: string;
    url?: string;
    uris?: string[];
    notes?: string;
    folder?: string;
    type?: string;
    customFields?: CustomField[];
  },
  t: string,
): Promise<{ ok: boolean }> => apiPost("/entries", data, t);
export const updateEntry = (
  name: string,
  data: Record<string, unknown>,
  t: string,
): Promise<{ ok: boolean }> =>
  apiPut(`/entries/${encodeURIComponent(name)}`, data, t);
export const deleteEntry = (
  name: string,
  t: string,
): Promise<{ ok: boolean }> =>
  apiDelete(`/entries/${encodeURIComponent(name)}`, t);
export const permanentDeleteEntry = (
  name: string,
  t: string,
): Promise<{ ok: boolean }> =>
  apiDelete(`/entries/${encodeURIComponent(name)}/permanent`, t);
export const restoreEntry = (
  name: string,
  t: string,
): Promise<{ ok: boolean }> =>
  apiPost(`/entries/${encodeURIComponent(name)}/restore`, {}, t);
export const toggleFavorite = (
  name: string,
  t: string,
): Promise<{ ok: boolean; favorite: boolean }> =>
  apiPut(`/entries/${encodeURIComponent(name)}/favorite`, {}, t);
export const getPasswordHistory = (
  name: string,
  t: string,
): Promise<PasswordHistoryEntry[]> =>
  apiGet(`/entries/${encodeURIComponent(name)}/history`, t);

// TOTP
export const getTotp = (
  name: string,
  t: string,
): Promise<{ token: string; remaining: number }> =>
  apiGet(`/entries/${encodeURIComponent(name)}/totp`, t);
export const setTotp = (
  name: string,
  secret: string,
  t: string,
): Promise<{ ok: boolean }> =>
  apiPut(`/entries/${encodeURIComponent(name)}/totp`, { secret }, t);
export const removeTotp = (
  name: string,
  t: string,
): Promise<{ ok: boolean }> =>
  apiDelete(`/entries/${encodeURIComponent(name)}/totp`, t);

// Folders
export const getFolders = (t: string): Promise<Folder[]> =>
  apiGet("/folders", t);
export const createFolder = (
  name: string,
  t: string,
): Promise<{ ok: boolean; id: string; name: string }> =>
  apiPost("/folders", { name }, t);
export const renameFolder = (
  id: string,
  name: string,
  t: string,
): Promise<{ ok: boolean }> =>
  apiPut(`/folders/${id}`, { name }, t);
export const deleteFolder = (
  id: string,
  t: string,
): Promise<{ ok: boolean }> => apiDelete(`/folders/${id}`, t);

// Trash
export const getTrash = (t: string): Promise<Entry[]> =>
  apiGet("/trash", t);
export const purgeTrash = (
  t: string,
): Promise<{ ok: boolean; deleted: number }> =>
  apiPost("/trash/purge", {}, t);

// Generator
export const generatePassword = (
  length: number | undefined,
  t: string,
): Promise<{ password: string }> =>
  apiGet(`/generate${length ? `?length=${length}` : ""}`, t);
export const generatePassphrase = (
  words: number,
  separator: string,
  capitalize: boolean,
  t: string,
): Promise<{ passphrase: string }> =>
  apiGet(
    `/generate/passphrase?words=${words}&separator=${encodeURIComponent(separator)}&capitalize=${capitalize}`,
    t,
  );
export const getGenerationHistory = (
  t: string,
): Promise<GeneratedPassword[]> =>
  apiGet("/generate/history", t);
export const saveGenerationHistory = (
  password: string,
  type: string,
  t: string,
): Promise<{ ok: boolean }> =>
  apiPost("/generate/history", { password, type }, t);
export const clearGenerationHistory = (
  t: string,
): Promise<{ ok: boolean }> => apiDelete("/generate/history", t);

// Change password
export const changePassword = (
  oldPassword: string,
  newPassword: string,
  t: string,
): Promise<{ ok: boolean }> =>
  apiPost("/change-password", { oldPassword, newPassword }, t);

// Vault health
export const getVaultHealth = (t: string): Promise<HealthReport> =>
  apiGet("/vault-health", t);

// Import/Export
export const exportVault = (
  format: "json" | "csv",
  t: string,
): Promise<{ entries: Array<Record<string, unknown>>; exportedAt: string }> =>
  apiPost("/export", { format }, t);
export const importVault = (
  entries: Array<Record<string, unknown>>,
  t: string,
): Promise<{ ok: boolean; created: number; skipped: number; errors: string[] }> =>
  apiPost("/import", { entries }, t);

// Snapshot
export const getSnapshotStatus = (
  t: string,
): Promise<{ hash: string; entryCount: number; timestamp: string }> =>
  apiGet("/snapshot/status", t);

export const commitSnapshot = (
  t: string,
): Promise<{ hash: string; entryCount: number; timestamp: string }> =>
  apiPost("/snapshot", {}, t);

export const verifySnapshot = (
  hash: string,
  t: string,
): Promise<{ valid: boolean; currentHash: string; submittedHash: string }> =>
  apiPost("/verify", { hash }, t);

export const triggerSync = (
  t: string,
): Promise<{ cid: string; hash: string; entryCount: number; timestamp: string }> =>
  apiPost("/sync", {}, t);

export const searchEntries = (
  query: string,
  t: string,
): Promise<Entry[]> =>
  apiGet(`/entries/search?q=${encodeURIComponent(query)}`, t);
