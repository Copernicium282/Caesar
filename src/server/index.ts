import express from "express";
import { loadConfig } from "../config/config.js";
import { deriveKey } from "../crypto/argon2.js";
import {
  createSessionData,
  decryptSessionKey,
  isExpired,
  SESSION_FILE_PATH,
} from "../session/session.js";
import fs from "node:fs";
import { entry } from "../db/models/entry.js";
import { decrypt, encrypt } from "../crypto/aes.js";
import { connectDB } from "../db/connect.js";
import { matchEntries } from "../utils/domain-match.js";
import { generatePassword } from "../utils/generate.js";

const app = express();
const port = 9876;

app.use(express.json());

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") { res.sendStatus(204); return; }
  next();
});

const cfg = loadConfig();
await connectDB(cfg.mongodb_uri);

app.listen(port, "127.0.0.1", () => {
  console.log("VaultChain server running on http://127.0.0.1:9876");
});

// ── Unlock ──
app.post("/unlock", async (req, res) => {
  try {
    const { MasterPwd } = req.body || {};
    if (!MasterPwd || typeof MasterPwd !== "string") {
      res.status(400).json({ error: "Missing or invalid MasterPwd" });
      return;
    }
    const key = await deriveKey(MasterPwd, Buffer.from(cfg.argon2_salt, "base64"));

    // Validate by trial-decrypting a sample entry
    const sample = await entry.findOne({}).lean();
    if (sample) {
      try {
        decrypt({ ciphertext: sample.encrypted_password, iv: sample.iv, authTag: sample.auth_tag }, key);
      } catch {
        res.status(401).json({ error: "Invalid master password" });
        return;
      }
    }

    const { token, sessionData } = createSessionData(key);
    fs.writeFileSync(SESSION_FILE_PATH, JSON.stringify(sessionData));
    res.json({ token, sessionData });
  } catch {
    res.status(500).json({ error: "Unlock failed" });
  }
});

// ── Auth Middleware ──
app.use("/", (req, res, next) => {
  try {
    if (!fs.existsSync(SESSION_FILE_PATH)) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const data = fs.readFileSync(SESSION_FILE_PATH, "utf-8");
    const sessionData = JSON.parse(data);
    if (req.headers.authorization && !isExpired(sessionData)) {
      const key = decryptSessionKey(req.headers.authorization.split("Bearer ")[1] || "", sessionData);
      (req as any).key = key;
      next();
    } else {
      res.status(401).json({ error: "Unauthorized" });
    }
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
});

// ── Lock ──
app.post("/lock", (_req, res) => {
  try {
    if (fs.existsSync(SESSION_FILE_PATH)) fs.unlinkSync(SESSION_FILE_PATH);
  } catch {}
  res.json({ ok: true });
});

// ── Entries ──
const sanitizeEntry = (e: any) => ({ name: e.name, username: e.username, url: e.url, uris: e.uris || [] });

app.get("/entries", async (_req, res) => {
  try {
    const list = await entry.find({}).lean();
    res.json(list.map(sanitizeEntry));
  } catch {
    res.status(500).json({ error: "Failed to fetch entries" });
  }
});

app.post("/entries", async (req, res) => {
  try {
    const { name, username, password, url, uris } = req.body || {};
    if (!name || !username || !password) {
      res.status(400).json({ error: "Missing required fields: name, username, password" });
      return;
    }
    const encrypted = encrypt(password, (req as any).key);
    await entry.create({
      name, username,
      encrypted_password: encrypted.ciphertext, iv: encrypted.iv, auth_tag: encrypted.authTag,
      url: url || null, uris: uris || [],
    });
    res.json({ ok: true });
  } catch (err: any) {
    if (err?.code === 11000) res.status(409).json({ error: "An entry with that name already exists" });
    else res.status(500).json({ error: "Failed to create entry" });
  }
});

// ── Match ──
app.get("/entries/match", async (req, res) => {
  try {
    const tabUrl = req.query.url;
    if (typeof tabUrl !== "string" || !tabUrl) {
      res.status(400).json({ error: "Missing url query parameter" });
      return;
    }
    const entries = await entry.find({}).lean();
    const result = matchEntries(tabUrl, entries.map(sanitizeEntry));
    res.json(result);
  } catch {
    res.status(500).json({ error: "Match failed" });
  }
});

// ── Password decrypt ──
app.get("/entries/:name/password", async (req, res) => {
  try {
    const name = decodeURIComponent(req.params.name);
    const pwd = await entry.findOne({ name }).lean();
    if (!pwd) { res.status(404).json({ error: "Entry not found" }); return; }
    const decrypted = decrypt({ ciphertext: pwd.encrypted_password, iv: pwd.iv, authTag: pwd.auth_tag }, (req as any).key);
    res.json({ password: decrypted });
  } catch {
    res.status(500).json({ error: "Failed to decrypt password" });
  }
});

// ── Generate ──
app.get("/generate", async (req, res) => {
  try {
    const raw = req.query.length;
    const length = raw ? Number(raw) : undefined;
    if (raw !== undefined && (isNaN(length!) || length! < 1 || length! > 256)) {
      res.status(400).json({ error: "Length must be between 1 and 256" });
      return;
    }
    const password = await generatePassword(length);
    res.json({ password });
  } catch {
    res.status(500).json({ error: "Generation failed" });
  }
});

// ── Error handler (must be last) ──
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err.type === "entity.parse.failed") {
    res.status(400).json({ error: "Invalid JSON" });
    return;
  }
  res.status(500).json({ error: "Internal server error" });
});
