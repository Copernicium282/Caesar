import express from "express";
import https from "node:https";
import crypto from "node:crypto";
import path from "node:path";
import os from "node:os";
import { loadConfig, saveConfig } from "../config/config.js";
import { deriveKey } from "../crypto/argon2.js";
import {
  createSessionData,
  decryptSessionKey,
  isExpired,
  SESSION_FILE_PATH,
} from "../session/session.js";
import fs from "node:fs";
import fsp from "node:fs/promises";
import { entry } from "../db/models/entry.js";
import { folder } from "../db/models/folder.js";
import { decrypt, encrypt } from "../crypto/aes.js";
import { connectDB } from "../db/connect.js";
import { matchEntries } from "../utils/domain-match.js";
import { generatePassword } from "../utils/generate.js";
import * as OTPAuth from "otpauth";
import { ethers } from "ethers";
import { loadCert, certExists } from "../crypto/tls.js";
import { startHelia, stopHelia, addBlob, getBlob } from "../ipfs/helia.js";

const app = express();
const port = 9876;

app.use(express.json({ limit: "16kb" }));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") { res.sendStatus(204); return; }
  next();
});

let cfg = loadConfig();

async function start() {
  await connectDB(cfg.mongodb_uri);
  await startHelia();

  if (!certExists()) {
    console.error("TLS certificate not found. Run 'vaultchain init' first.");
    process.exit(1);
  }

  const { cert, key } = loadCert();
  const server = https.createServer({ cert, key }, app).listen(port, "127.0.0.1", () => {
    console.log("VaultChain server running on https://127.0.0.1:9876");
  });

  const shutdown = async () => {
    server.close();
    await stopHelia();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});

// ── Rate limiter for /unlock ──
const unlockAttempts = new Map<string, { count: number; resetAt: number }>();
function checkUnlockRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = unlockAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    unlockAttempts.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  entry.count++;
  return entry.count <= 5;
}

// ── Unlock ──
app.post("/unlock", async (req, res) => {
  try {
    const ip = req.ip || "unknown";
    if (!checkUnlockRateLimit(ip)) {
      res.status(429).json({ error: "Too many unlock attempts. Try again in 1 minute." });
      return;
    }
    const { MasterPwd } = req.body || {};
    if (!MasterPwd || typeof MasterPwd !== "string") {
      res.status(400).json({ error: "Missing or invalid MasterPwd" });
      return;
    }
    const key = await deriveKey(MasterPwd, Buffer.from(cfg.argon2_salt, "base64"));

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
    await fsp.writeFile(SESSION_FILE_PATH, JSON.stringify(sessionData), { mode: 0o600 });
    res.json({ token, sessionData });
  } catch {
    res.status(500).json({ error: "Unlock failed" });
  }
});

// ── Auth Middleware ──
app.use("/", async (req, res, next) => {
  if (req.method === "POST" && req.path === "/unlock") return next();
  try {
    let data: string;
    try {
      data = await fsp.readFile(SESSION_FILE_PATH, "utf-8");
    } catch {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const sessionData = JSON.parse(data);
    const auth = req.headers.authorization;
    if (auth && auth.startsWith("Bearer ") && !isExpired(sessionData)) {
      const token = auth.slice(7);
      if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }
      const key = decryptSessionKey(token, sessionData);
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
app.post("/lock", async (_req, res) => {
  try {
    await fsp.unlink(SESSION_FILE_PATH);
  } catch {}
  res.json({ ok: true });
});

// ── Helpers ──
const sanitizeEntry = (e: any) => ({
  name: e.name,
  username: e.username,
  url: e.url,
  uris: e.uris || [],
  notes: e.notes || "",
  folder: e.folder || null,
  favorite: e.favorite || false,
  type: e.type || "login",
  customFields: e.customFields || [],
  hasTotp: !!(e.totp && e.totp_iv && e.totp_auth_tag),
  createdAt: e.createdAt,
  updatedAt: e.updatedAt,
});

// ── Entries ──
app.get("/entries", async (req, res) => {
  try {
    const showDeleted = req.query.trash === "true";
    const filter: any = showDeleted
      ? { deletedAt: { $ne: null } }
      : { deletedAt: null };
    const list = await entry.find(filter).lean();
    res.json(list.map(sanitizeEntry));
  } catch {
    res.status(500).json({ error: "Failed to fetch entries" });
  }
});

app.post("/entries", async (req, res) => {
  try {
    const { name, username, password, url, uris, notes, folder, type, customFields } = req.body || {};
    if (!name || !username || !password) {
      res.status(400).json({ error: "Missing required fields: name, username, password" });
      return;
    }
    const encrypted = encrypt(password, (req as any).key);
    await entry.create({
      name, username,
      encrypted_password: encrypted.ciphertext, iv: encrypted.iv, auth_tag: encrypted.authTag,
      url: url || null, uris: uris || [], notes: notes || "",
      folder: folder || null, type: type || "login",
      customFields: customFields || [],
    });
    res.json({ ok: true });
  } catch (err: any) {
    if (err?.code === 11000) res.status(409).json({ error: "An entry with that name already exists" });
    else res.status(500).json({ error: "Failed to create entry" });
  }
});

// ── Update Entry ──
app.put("/entries/:name", async (req, res) => {
  try {
    const name = decodeURIComponent(req.params.name);
    const existing = await entry.findOne({ name, deletedAt: null });
    if (!existing) { res.status(404).json({ error: "Entry not found" }); return; }

    const { name: newName, username, password, url, uris, notes, folder, type, customFields } = req.body || {};

    if (password) {
      const oldEncrypted = {
        ciphertext: existing.encrypted_password,
        iv: existing.iv,
        authTag: existing.auth_tag,
      };
      existing.passwordHistory.push({
        password: oldEncrypted.ciphertext,
        iv: oldEncrypted.iv,
        auth_tag: oldEncrypted.authTag,
        changedAt: new Date(),
      });
      if (existing.passwordHistory.length > 5) {
        existing.passwordHistory = existing.passwordHistory.slice(-5);
      }

      const encrypted = encrypt(password, (req as any).key);
      existing.encrypted_password = encrypted.ciphertext;
      existing.iv = encrypted.iv;
      existing.auth_tag = encrypted.authTag;
    }

    if (newName !== undefined) existing.name = newName;
    if (username !== undefined) existing.username = username;
    if (url !== undefined) existing.url = url;
    if (uris !== undefined) existing.uris = uris;
    if (notes !== undefined) existing.notes = notes;
    if (folder !== undefined) existing.folder = folder;
    if (type !== undefined) existing.type = type;
    if (customFields !== undefined) existing.customFields = customFields;

    await existing.save();
    res.json({ ok: true });
  } catch (err: any) {
    if (err?.code === 11000) res.status(409).json({ error: "An entry with that name already exists" });
    else res.status(500).json({ error: "Failed to update entry" });
  }
});

// ── Delete Entry (soft) ──
app.delete("/entries/:name", async (req, res) => {
  try {
    const name = decodeURIComponent(req.params.name);
    const existing = await entry.findOne({ name, deletedAt: null });
    if (!existing) { res.status(404).json({ error: "Entry not found" }); return; }
    existing.deletedAt = new Date();
    await existing.save();
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to delete entry" });
  }
});

// ── Permanent Delete ──
app.delete("/entries/:name/permanent", async (req, res) => {
  try {
    const name = decodeURIComponent(req.params.name);
    const existing = await entry.findOne({ name });
    if (!existing) { res.status(404).json({ error: "Entry not found" }); return; }
    await entry.deleteOne({ name });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to permanently delete entry" });
  }
});

// ── Restore from Trash ──
app.post("/entries/:name/restore", async (req, res) => {
  try {
    const name = decodeURIComponent(req.params.name);
    const existing = await entry.findOne({ name, deletedAt: { $ne: null } });
    if (!existing) { res.status(404).json({ error: "Entry not found in trash" }); return; }
    existing.deletedAt = undefined as any;
    await existing.save();
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to restore entry" });
  }
});

// ── Toggle Favorite ──
app.put("/entries/:name/favorite", async (req, res) => {
  try {
    const name = decodeURIComponent(req.params.name);
    const existing = await entry.findOne({ name, deletedAt: null });
    if (!existing) { res.status(404).json({ error: "Entry not found" }); return; }
    existing.favorite = !existing.favorite;
    await existing.save();
    res.json({ ok: true, favorite: existing.favorite });
  } catch {
    res.status(500).json({ error: "Failed to toggle favorite" });
  }
});

// ── Password History ──
app.get("/entries/:name/history", async (req, res) => {
  try {
    const name = decodeURIComponent(req.params.name);
    const existing = await entry.findOne({ name, deletedAt: null }).lean();
    if (!existing) { res.status(404).json({ error: "Entry not found" }); return; }

    const history = existing.passwordHistory.map((h) => {
      try {
        const decrypted = decrypt(
          { ciphertext: h.password, iv: h.iv, authTag: h.auth_tag },
          (req as any).key,
        );
        return { password: decrypted, changedAt: h.changedAt };
      } catch {
        return { password: "[decryption failed]", changedAt: h.changedAt };
      }
    });

    res.json(history);
  } catch {
    res.status(500).json({ error: "Failed to fetch password history" });
  }
});

// ── TOTP ──
app.get("/entries/:name/totp", async (req, res) => {
  try {
    const name = decodeURIComponent(req.params.name);
    const existing = await entry.findOne({ name, deletedAt: null }).lean();
    if (!existing) { res.status(404).json({ error: "Entry not found" }); return; }
    if (!existing.totp || !existing.totp_iv || !existing.totp_auth_tag) {
      res.status(404).json({ error: "No TOTP configured" });
      return;
    }

    const secret = decrypt(
      { ciphertext: existing.totp, iv: existing.totp_iv, authTag: existing.totp_auth_tag },
      (req as any).key,
    );

    const totp = new OTPAuth.TOTP({ secret: OTPAuth.Secret.fromBase32(secret) });
    const token = totp.generate();
    const remaining = 30 - (Math.floor(Date.now() / 1000) % 30);

    res.json({ token, remaining });
  } catch {
    res.status(500).json({ error: "Failed to generate TOTP" });
  }
});

app.put("/entries/:name/totp", async (req, res) => {
  try {
    const name = decodeURIComponent(req.params.name);
    const existing = await entry.findOne({ name, deletedAt: null });
    if (!existing) { res.status(404).json({ error: "Entry not found" }); return; }

    const { secret } = req.body || {};
    if (!secret || typeof secret !== "string") {
      res.status(400).json({ error: "Missing TOTP secret" });
      return;
    }

    const encrypted = encrypt(secret, (req as any).key);
    existing.totp = encrypted.ciphertext;
    existing.totp_iv = encrypted.iv;
    existing.totp_auth_tag = encrypted.authTag;
    await existing.save();

    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to save TOTP" });
  }
});

app.delete("/entries/:name/totp", async (req, res) => {
  try {
    const name = decodeURIComponent(req.params.name);
    const existing = await entry.findOne({ name, deletedAt: null });
    if (!existing) { res.status(404).json({ error: "Entry not found" }); return; }

    existing.totp = null as any;
    existing.totp_iv = null as any;
    existing.totp_auth_tag = null as any;
    await existing.save();

    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to remove TOTP" });
  }
});

// ── Match ──
app.get("/entries/match", async (req, res) => {
  try {
    const tabUrl = req.query.url;
    const typeFilter = req.query.type as string | undefined;
    const folderFilter = req.query.folder as string | undefined;
    const favoriteOnly = req.query.favorite === "true";
    const strategy = (req.query.strategy as string) || "base-domain";

    if (typeof tabUrl !== "string" || !tabUrl) {
      res.status(400).json({ error: "Missing url query parameter" });
      return;
    }

    const filter: any = { deletedAt: null };
    if (typeFilter) filter.type = typeFilter;
    if (folderFilter) filter.folder = folderFilter;
    if (favoriteOnly) filter.favorite = true;

    const entries = await entry.find(filter).lean();
    const result = matchEntries(tabUrl, entries.map(sanitizeEntry), strategy as any);
    res.json(result);
  } catch {
    res.status(500).json({ error: "Match failed" });
  }
});

// ── Password decrypt ──
app.get("/entries/:name/password", async (req, res) => {
  try {
    const name = decodeURIComponent(req.params.name);
    const pwd = await entry.findOne({ name, deletedAt: null }).lean();
    if (!pwd) { res.status(404).json({ error: "Entry not found" }); return; }
    const decrypted = decrypt({ ciphertext: pwd.encrypted_password, iv: pwd.iv, authTag: pwd.auth_tag }, (req as any).key);
    res.json({ password: decrypted });
  } catch {
    res.status(500).json({ error: "Failed to decrypt password" });
  }
});

// ── Folders ──
app.get("/folders", async (_req, res) => {
  try {
    const list = await folder.find({}).lean();
    res.json(list.map((f) => ({ id: f._id, name: f.name })));
  } catch {
    res.status(500).json({ error: "Failed to fetch folders" });
  }
});

app.post("/folders", async (req, res) => {
  try {
    const { name } = req.body || {};
    if (!name || typeof name !== "string") {
      res.status(400).json({ error: "Missing folder name" });
      return;
    }
    const created = await folder.create({ name });
    res.json({ ok: true, id: created._id, name: created.name });
  } catch (err: any) {
    if (err?.code === 11000) res.status(409).json({ error: "Folder already exists" });
    else res.status(500).json({ error: "Failed to create folder" });
  }
});

app.put("/folders/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body || {};
    if (!name || typeof name !== "string") {
      res.status(400).json({ error: "Missing folder name" });
      return;
    }
    const old = await folder.findById(id);
    if (!old) { res.status(404).json({ error: "Folder not found" }); return; }

    const oldName = old.name;
    old.name = name;
    await old.save();

    await entry.updateMany({ folder: oldName }, { $set: { folder: name } });
    res.json({ ok: true });
  } catch (err: any) {
    if (err?.code === 11000) res.status(409).json({ error: "Folder name already exists" });
    else res.status(500).json({ error: "Failed to rename folder" });
  }
});

app.delete("/folders/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await folder.findById(id);
    if (!existing) { res.status(404).json({ error: "Folder not found" }); return; }

    await entry.updateMany({ folder: existing.name }, { $set: { folder: null } });
    await folder.deleteOne({ _id: id });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to delete folder" });
  }
});

// ── Trash ──
app.get("/trash", async (_req, res) => {
  try {
    const list = await entry.find({ deletedAt: { $ne: null } }).lean();
    res.json(list.map(sanitizeEntry));
  } catch {
    res.status(500).json({ error: "Failed to fetch trash" });
  }
});

// ── Purge Trash ──
app.post("/trash/purge", async (_req, res) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const result = await entry.deleteMany({ deletedAt: { $ne: null, $lt: thirtyDaysAgo } });
    res.json({ ok: true, deleted: result.deletedCount });
  } catch {
    res.status(500).json({ error: "Failed to purge trash" });
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

// ── Generate History ──
const GENERATION_HISTORY_FILE = path.join(
  os.homedir(),
  "/.vaultchain/generation-history.json",
);

async function loadGenerationHistory(): Promise<Array<{ password: string; iv: string; auth_tag: string; length: number; type: string; createdAt: string }>> {
  try {
    const data = await fsp.readFile(GENERATION_HISTORY_FILE, "utf-8");
    return JSON.parse(data);
  } catch {}
  return [];
}

async function saveGenerationHistory(history: Array<{ password: string; iv: string; auth_tag: string; length: number; type: string; createdAt: string }>) {
  const dir = path.dirname(GENERATION_HISTORY_FILE);
  await fsp.mkdir(dir, { recursive: true });
  await fsp.writeFile(GENERATION_HISTORY_FILE, JSON.stringify(history, null, 2));
}

app.post("/generate/history", async (req, res) => {
  try {
    const { password, type } = req.body || {};
    if (!password || typeof password !== "string") {
      res.status(400).json({ error: "Missing password" });
      return;
    }
    const encrypted = encrypt(password, (req as any).key);
    const history = await loadGenerationHistory();
    history.push({
      password: encrypted.ciphertext,
      iv: encrypted.iv,
      auth_tag: encrypted.authTag,
      length: password.length,
      type: type || "password",
      createdAt: new Date().toISOString(),
    });
    if (history.length > 20) history.splice(0, history.length - 20);
    await saveGenerationHistory(history);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to save to history" });
  }
});

app.get("/generate/history", async (req, res) => {
  try {
    const history = await loadGenerationHistory();
    const decrypted = history.map((h) => {
      try {
        const pw = decrypt(
          { ciphertext: h.password, iv: h.iv, authTag: h.auth_tag },
          (req as any).key,
        );
        return { password: pw, length: h.length, type: h.type, createdAt: h.createdAt };
      } catch {
        return { password: "[decryption failed]", length: h.length, type: h.type, createdAt: h.createdAt };
      }
    });
    res.json(decrypted);
  } catch {
    res.status(500).json({ error: "Failed to load history" });
  }
});

app.delete("/generate/history", async (_req, res) => {
  try {
    await fsp.unlink(GENERATION_HISTORY_FILE).catch(() => {});
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to clear history" });
  }
});

// ── Generate Passphrase ──
const EFF_WORDLIST = [
  "abacus","abandon","ability","able","about","above","absent","absorb","abstract","absurd",
  "abuse","access","accident","account","accuse","achieve","acid","acoustic","acquire","across",
  "act","action","actor","actress","actual","adapt","add","addict","address","adjust",
  "admit","adult","advance","advice","aerobic","affair","afford","afraid","again","age",
  "agent","agree","ahead","aim","air","airport","aisle","alarm","album","alcohol",
  "alert","alien","all","alley","allow","almost","alone","alpha","already","also",
  "alter","always","amateur","amazing","among","amount","amused","analyst","anchor","ancient",
  "anger","angle","angry","animal","ankle","announce","annual","another","answer","antenna",
  "antique","anxiety","any","apart","apology","appear","apple","approve","april","arch",
  "arctic","area","arena","argue","arm","armed","armor","army","around","arrange",
  "arrest","arrive","arrow","art","artefact","artist","artwork","ask","aspect","assault",
  "asset","assist","assume","asthma","athlete","atom","attack","attend","attitude","attract",
  "auction","audit","august","aunt","author","auto","autumn","average","avocado","avoid",
  "awake","aware","awesome","awful","awkward","axis","baby","bachelor","bacon","badge",
  "bag","balance","balcony","ball","bamboo","banana","banner","bar","barely","bargain",
  "barrel","base","basic","basket","battle","beach","bean","beauty","because","become",
  "beef","before","begin","behave","behind","believe","below","belt","bench","benefit",
  "best","betray","better","between","beyond","bicycle","bid","bike","bind","biology",
  "bird","birth","bitter","black","blade","blame","blanket","blast","bleak","bless",
  "blind","blood","blossom","blow","blue","blur","blush","board","boat","body",
  "boil","bomb","bone","bonus","book","boost","border","boring","borrow","boss",
  "bottom","bounce","box","boy","bracket","brain","brand","brass","brave","bread",
  "breeze","brick","bridge","brief","bright","bring","brisk","broccoli","broken","bronze",
  "broom","brother","brown","brush","bubble","buddy","budget","buffalo","build","bulb",
  "bulk","bullet","bundle","bunny","burden","burger","burst","bus","business","busy",
  "butter","buyer","buzz","cabbage","cabin","cable","cactus","cage","cake","call",
  "calm","camera","camp","can","canal","cancel","candy","cannon","canoe","canvas",
  "canyon","capable","capital","captain","car","carbon","card","cargo","carpet","carry",
  "cart","case","cash","casino","castle","casual","cat","catalog","catch","category",
  "cattle","caught","cause","caution","cave","ceiling","celery","cement","census","century",
  "cereal","certain","chair","chalk","champion","change","chaos","chapter","charge","chase",
  "cheap","check","cheese","chef","cherry","chest","chicken","chief","child","chimney",
  "choice","choose","chronic","chuckle","chunk","churn","citizen","city","civil","claim",
  "clap","clarify","claw","clay","clean","clerk","clever","click","client","cliff",
  "climb","clinic","clip","clock","clog","close","cloth","cloud","clown","club",
  "clump","cluster","clutch","coach","coast","coconut","code","coffee","coil","coin",
  "collect","color","column","combine","come","comfort","comic","common","company","concert",
  "conduct","confirm","congress","connect","consider","control","convince","cook","cool","copper",
  "copy","coral","core","corn","correct","cost","cotton","couch","country","couple",
  "course","cousin","cover","coyote","crack","cradle","craft","cram","crane","crash",
  "crater","crawl","crazy","cream","credit","creek","crew","cricket","crime","crisp",
  "critic","crop","cross","crouch","crowd","crucial","cruel","cruise","crumble","crush",
  "cry","crystal","cube","culture","cup","cupboard","curious","current","curtain","curve",
  "cushion","custom","cute","cycle","dad","damage","damp","dance","danger","daring",
  "dash","daughter","dawn","day","deal","debate","debris","decade","december","decide",
  "decline","decorate","decrease","deer","defense","define","defy","degree","delay","deliver",
  "demand","demise","denial","dentist","deny","depart","depend","deposit","depth","deputy",
  "derive","describe","desert","design","desk","despair","destroy","detail","detect","develop",
  "device","devote","diagram","dial","diamond","diary","dice","diesel","diet","differ",
  "digital","dignity","dilemma","dinner","dinosaur","direct","dirt","disagree","discover","disease",
  "dish","dismiss","disorder","display","distance","divert","divide","divorce","dizzy","doctor",
  "document","dog","doll","dolphin","domain","donate","donkey","donor","door","dose",
  "double","dove","draft","dragon","drama","drastic","draw","dream","dress","drift",
  "drill","drink","drip","drive","drop","drum","dry","duck","dumb","dune",
  "during","dust","dutch","duty","dwarf","dynamic","eager","eagle","early","earn",
  "earth","easily","east","easy","echo","ecology","economy","edge","edit","educate",
  "effort","egg","eight","either","elbow","elder","electric","elegant","element","elephant",
  "elevator","elite","else","embark","embody","embrace","emerge","emotion","employ","empower",
  "empty","enable","enact","end","endless","endorse","enemy","energy","enforce","engage",
  "engine","enhance","enjoy","enlist","enough","enrich","enroll","ensure","enter","entire",
  "entry","envelope","episode","equal","equip","era","erase","erode","erosion","error",
  "erupt","escape","essay","essence","estate","eternal","ethics","evidence","evil","evoke",
  "evolve","exact","example","excess","exchange","excite","exclude","excuse","execute","exercise",
  "exhaust","exhibit","exile","exist","exit","exotic","expand","expect","expire","explain",
  "expose","express","extend","extra","eye","eyebrow","fabric","face","faculty","fade",
  "faint","faith","fall","false","fame","family","famous","fan","fancy","fantasy",
  "farm","fashion","fat","fatal","father","fatigue","fault","favorite","feature","february",
  "federal","fee","feed","feel","female","fence","festival","fetch","fever","few",
  "fiber","fiction","field","figure","file","film","filter","final","find","fine",
  "finger","finish","fire","firm","fiscal","fish","fit","fitness","fix","flag",
  "flame","flash","flat","flavor","flee","flight","flip","float","flock","floor",
  "flower","fluid","flush","fly","foam","focus","fog","foil","fold","follow",
  "food","foot","force","forest","forget","fork","fortune","forum","forward","fossil",
  "foster","found","fox","fragile","frame","frequent","fresh","friend","fringe","frog",
  "front","frost","frown","frozen","fruit","fuel","fun","funny","furnace","fury",
  "future","gadget","gain","galaxy","gallery","game","gap","garage","garbage","garden",
  "garlic","garment","gas","gasp","gate","gather","gauge","gaze","general","genius",
  "genre","gentle","genuine","gesture","ghost","giant","gift","giggle","ginger","giraffe",
  "girl","give","glad","glance","glare","glass","glide","glimpse","globe","gloom",
  "glory","glove","glow","glue","goat","goddess","gold","good","goose","gorilla",
  "gospel","gossip","govern","gown","grab","grace","grain","grant","grape","grass",
  "gravity","great","green","grid","grief","grit","grocery","group","grow","grunt",
  "guard","guess","guide","guilt","guitar","gun","gym","habit","hair","half",
  "hammer","hamster","hand","happy","harbor","hard","harsh","harvest","hat","have",
  "hawk","hazard","head","health","heart","heavy","hedgehog","height","hello","helmet",
  "help","hen","hero","hip","hire","history","hobby","hockey","hold","hole",
  "holiday","hollow","home","honey","hood","hope","horn","horror","horse","hospital",
  "host","hotel","hour","hover","hub","huge","human","humble","humor","hundred",
  "hungry","hunt","hurdle","hurry","hurt","husband","hybrid","ice","icon","idea",
  "identify","idle","ignore","ill","illegal","illness","image","imitate","immense","immune",
  "impact","impose","improve","impulse","inch","include","income","increase","index","indicate",
  "indoor","industry","infant","inflict","inform","initial","inject","inmate","inner","innocent",
  "input","inquiry","insane","insect","inside","inspire","install","intact","interest","into",
  "invest","invite","involve","iron","island","isolate","issue","item","ivory","jacket",
  "jaguar","jar","jazz","jealous","jeans","jelly","jewel","job","join","joke",
  "journey","joy","judge","juice","jump","jungle","junior","junk","just","kangaroo",
  "keen","keep","ketchup","key","kick","kid","kidney","kind","kingdom","kiss",
  "kit","kitchen","kite","kitten","kiwi","knee","knife","knock","know","lab",
  "label","labor","ladder","lady","lake","lamp","language","laptop","large","later",
  "latin","laugh","laundry","lava","law","lawn","lawsuit","layer","lazy","leader",
  "leaf","learn","leave","lecture","left","leg","legal","legend","leisure","lemon",
  "lend","length","lens","leopard","lesson","letter","level","liberty","library","license",
  "life","lift","light","like","limb","limit","link","lion","liquid","list",
  "little","live","lizard","load","loan","lobster","local","lock","logic","lonely",
  "long","loop","lottery","loud","lounge","love","loyal","lucky","luggage","lumber",
  "lunar","lunch","luxury","lyrics","machine","mad","magic","magnet","maid","mail",
  "main","major","make","mammal","man","manage","mandate","mango","mansion","manual",
  "maple","marble","march","margin","marine","market","marriage","mask","mass","master",
  "match","material","math","matrix","matter","maximum","maze","meadow","mean","measure",
  "meat","mechanic","medal","media","melody","melt","member","memory","mention","menu",
  "mercy","merge","merit","merry","mesh","message","metal","method","middle","midnight",
  "milk","million","mimic","mind","minimum","minor","minute","miracle","mirror","misery",
  "miss","mistake","mix","mixed","mixture","mobile","model","modify","mom","moment",
  "monitor","monkey","monster","month","moon","moral","more","morning","mosquito","mother",
  "motion","motor","mountain","mouse","move","movie","much","muffin","mule","multiply",
  "muscle","museum","mushroom","music","must","mutual","myself","mystery","myth","naive",
  "name","napkin","narrow","nasty","nation","nature","near","neck","need","negative",
  "neglect","neither","nephew","nerve","nest","net","network","neutral","never","news",
  "next","nice","night","noble","noise","nominee","noodle","normal","north","nose",
  "notable","nothing","notice","novel","now","nuclear","number","nurse","nut","oak",
  "obey","object","oblige","obscure","observe","obtain","obvious","occur","ocean","october",
  "odor","off","offer","office","often","oil","okay","old","olive","olympic",
  "omit","once","one","onion","online","only","open","opera","opinion","oppose",
  "option","orange","orbit","orchard","order","ordinary","organ","orient","original","orphan",
  "ostrich","other","outdoor","outer","output","outside","oval","oven","over","own",
  "owner","oxygen","oyster","ozone","pact","paddle","page","pair","palace","palm",
  "panda","panel","panic","panther","paper","parade","parent","park","parrot","party",
  "pass","patch","path","patient","patrol","pattern","pause","pave","payment","peace",
  "peanut","pear","peasant","pelican","pen","penalty","pencil","people","pepper","perfect",
  "permit","person","pet","phone","photo","phrase","physical","piano","picnic","picture",
  "piece","pig","pigeon","pill","pilot","pink","pioneer","pipe","pistol","pitch",
  "pizza","place","planet","plastic","plate","play","please","pledge","pluck","plug",
  "plunge","poem","poet","point","polar","pole","police","pond","pony","pool",
  "popular","portion","position","possible","post","potato","pottery","poverty","powder","power",
  "practice","praise","predict","prefer","prepare","present","pretty","prevent","price","pride",
  "primary","print","priority","prison","private","prize","problem","process","produce","profit",
  "program","project","promote","proof","property","prosper","protect","proud","provide","public",
  "pudding","pull","pulp","pulse","pumpkin","punch","pupil","puppy","purchase","purity",
  "purpose","purse","push","put","puzzle","pyramid","quality","quantum","quarter","question",
  "quick","quit","quiz","quote","rabbit","raccoon","race","rack","radar","radio",
  "rage","rail","rain","raise","rally","ramp","ranch","random","range","rapid",
  "rare","rate","rather","raven","raw","razor","ready","real","reason","rebel",
  "rebuild","recall","receive","recipe","record","recycle","reduce","reflect","reform","region",
  "regret","regular","reject","relax","release","relief","rely","remain","remember","remind",
  "remove","render","renew","rent","reopen","repair","repeat","replace","report","require",
  "rescue","resemble","resist","resource","response","result","retire","retreat","return","reunion",
  "reveal","review","reward","rhythm","rib","ribbon","rice","rich","ride","ridge",
  "rifle","right","rigid","ring","riot","ripple","risk","ritual","rival","river",
  "road","roast","robot","robust","rocket","romance","roof","rookie","room","rose",
  "rotate","rough","round","route","royal","rubber","rude","rug","rule","run",
  "runway","rural","sad","saddle","sadness","safe","sail","salad","salmon","salon",
  "salt","salute","same","sample","sand","satisfy","satoshi","sauce","sausage","save",
  "say","scale","scan","scare","scatter","scene","scheme","school","science","scissors",
  "scorpion","scout","scrap","screen","script","scrub","sea","search","season","seat",
  "second","secret","section","security","seed","seek","segment","select","sell","seminar",
  "senior","sense","sentence","series","service","session","settle","setup","seven","shadow",
  "shaft","shallow","share","shed","shell","sheriff","shield","shift","shine","ship",
  "shiver","shock","shoe","shoot","shop","short","shoulder","shove","shrimp","shrug",
  "shuffle","shy","sibling","sick","side","siege","sight","sign","silent","silk",
  "silly","silver","similar","simple","since","sing","siren","sister","situate","six",
  "size","skate","sketch","ski","skill","skin","skirt","skull","slab","slam",
  "sleep","slender","slice","slide","slight","slim","slogan","slot","slow","slush",
  "small","smart","smile","smoke","smooth","snack","snake","snap","sniff","snow",
  "soap","soccer","social","sock","soda","soft","solar","soldier","solid","solution",
  "solve","someone","song","soon","sorry","sort","soul","sound","soup","source",
  "south","space","spare","spatial","spawn","speak","special","speed","spell","spend",
  "sphere","spice","spider","spike","spin","spirit","split","sponsor","spoon","sport",
  "spot","spray","spread","spring","spy","square","squeeze","squirrel","stable","stadium",
  "staff","stage","stairs","stamp","stand","start","state","stay","steak","steel",
  "stem","step","stereo","stick","still","sting","stock","stomach","stone","stool",
  "story","stove","strategy","street","strike","strong","struggle","student","stuff","stumble",
  "style","subject","submit","subway","success","such","sudden","suffer","sugar","suggest",
  "suit","summer","sun","sunny","sunset","super","supply","supreme","sure","surface",
  "surge","surprise","surround","survey","suspect","sustain","swallow","swamp","swap","swarm",
  "swear","sweet","swim","swing","switch","sword","symbol","symptom","syrup","system",
  "table","tackle","tag","tail","talent","talk","tank","tape","target","task",
  "taste","tattoo","taxi","teach","team","tell","ten","tenant","tennis","tent",
  "term","test","text","thank","that","theme","then","theory","there","they",
  "thing","this","thought","three","thrive","throw","thumb","thunder","ticket","tide",
  "tiger","tilt","timber","time","tiny","tip","tired","tissue","title","toast",
  "tobacco","today","toddler","toe","together","toilet","token","tomato","tomorrow","tone",
  "tongue","tonight","tool","tooth","top","topic","topple","torch","tornado","tortoise",
  "toss","total","tourist","toward","tower","town","toy","track","trade","traffic",
  "tragic","train","transfer","trap","trash","travel","tray","treat","tree","trend",
  "trial","tribe","trick","trigger","trim","trip","trophy","trouble","truck","true",
  "truly","trumpet","trust","truth","try","tube","tuna","tunnel","turkey","turn",
  "turtle","twelve","twenty","twice","twin","twist","two","type","typical","ugly",
  "umbrella","unable","unaware","uncle","uncover","under","undo","unfair","unfold","unhappy",
  "uniform","union","unique","unit","universe","unknown","unlock","until","unusual","unveil",
  "update","upgrade","uphold","upon","upper","upset","urban","usage","use","used",
  "useful","useless","usual","utility","vacant","vacuum","vague","valid","valley","valve",
  "van","vanish","vapor","various","vast","vault","vehicle","velvet","vendor","venture",
  "venue","verb","verify","version","very","vessel","veteran","viable","vibrant","vicious",
  "victory","video","view","village","vintage","violin","virtual","virus","visa","visit",
  "visual","vital","vivid","vocal","voice","void","volcano","volume","vote","voyage",
  "wage","wagon","wait","walk","wall","walnut","want","warfare","warm","warrior",
  "wash","wasp","waste","water","wave","way","wealth","weapon","wear","weasel",
  "weather","web","wedding","weekend","weird","welcome","well","west","wet","whale",
  "what","wheat","wheel","when","where","whip","whisper","wide","width","wife",
  "wild","will","win","window","wine","wing","wink","winner","winter","wire",
  "wisdom","wise","wish","witness","wolf","woman","wonder","wood","wool","word",
  "work","world","worry","worth","wrap","wreck","wrestle","wrist","write","wrong",
  "yard","year","yellow","you","young","youth","zebra","zero","zone","zoo",
];

app.get("/generate/passphrase", async (req, res) => {
  try {
    const words = Math.min(Math.max(Number(req.query.words) || 4, 2), 10);
    const separator = (req.query.separator as string) || "-";
    const capitalize = req.query.capitalize !== "false";

    const selected: string[] = [];
    for (let i = 0; i < words; i++) {
      const idx = crypto.randomInt(0, EFF_WORDLIST.length);
      let word = EFF_WORDLIST[idx]!;
      if (capitalize) word = word[0]!.toUpperCase() + word.slice(1);
      selected.push(word);
    }

    res.json({ passphrase: selected.join(separator) });
  } catch {
    res.status(500).json({ error: "Passphrase generation failed" });
  }
});

// ── Change Password ──
app.post("/change-password", async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body || {};
    if (!oldPassword || !newPassword) {
      res.status(400).json({ error: "Missing oldPassword or newPassword" });
      return;
    }
    if (newPassword.length < 8) {
      res.status(400).json({ error: "New password must be at least 8 characters" });
      return;
    }

    const oldKey = await deriveKey(oldPassword, Buffer.from(cfg.argon2_salt, "base64"));

    const sample = await entry.findOne({}).lean();
    if (sample) {
      try {
        decrypt({ ciphertext: sample.encrypted_password, iv: sample.iv, authTag: sample.auth_tag }, oldKey);
      } catch {
        res.status(401).json({ error: "Invalid current password" });
        return;
      }
    }

    const newSalt = crypto.randomBytes(32).toString("base64");
    const newKey = await deriveKey(newPassword, Buffer.from(newSalt, "base64"));

    const allEntries = await entry.find({}).lean();
    const decrypted: Array<{ _id: any; plaintext: string; totp: string | undefined }> = [];

    for (const e of allEntries) {
      const pw = decrypt({ ciphertext: e.encrypted_password, iv: e.iv, authTag: e.auth_tag }, oldKey);
      let totp: string | undefined;
      if (e.totp && e.totp_iv && e.totp_auth_tag) {
        totp = decrypt({ ciphertext: e.totp, iv: e.totp_iv, authTag: e.totp_auth_tag }, oldKey);
      }
      decrypted.push({ _id: e._id, plaintext: pw, totp });
    }

    const updated: typeof allEntries = [];
    try {
      for (const d of decrypted) {
        const reEncrypted = encrypt(d.plaintext, newKey);
        const update: any = {
          encrypted_password: reEncrypted.ciphertext,
          iv: reEncrypted.iv,
          auth_tag: reEncrypted.authTag,
        };
        if (d.totp) {
          const totpReEncrypted = encrypt(d.totp, newKey);
          update.totp = totpReEncrypted.ciphertext;
          update.totp_iv = totpReEncrypted.iv;
          update.totp_auth_tag = totpReEncrypted.authTag;
        }
        await entry.updateOne({ _id: d._id }, { $set: update });
        const orig = allEntries.find(e => e._id === d._id);
        if (orig) updated.push(orig);
      }
    } catch (writeErr) {
      for (const d of decrypted) {
        if (updated.some(u => u._id === d._id)) {
          const rollback = encrypt(d.plaintext, oldKey);
          await entry.updateOne({ _id: d._id }, { $set: {
            encrypted_password: rollback.ciphertext, iv: rollback.iv, auth_tag: rollback.authTag,
          }});
        }
      }
      throw writeErr;
    }

    saveConfig(
      newSalt,
      cfg.mongodb_uri,
      cfg.anvil_rpc_url,
      cfg.vault_registry_address,
      cfg.sepolia_rpc_url,
      cfg.sepolia_vault_registry_address,
      cfg.sepolia_enabled,
    );
    cfg.argon2_salt = newSalt;

    await fsp.unlink(SESSION_FILE_PATH).catch(() => {});

    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to change password" });
  }
});

// ── Vault Health ──
app.get("/vault-health", async (_req, res) => {
  try {
    const allEntries = await entry.find({ deletedAt: null }).lean();
    const key = (_req as any).key as Buffer;

    const weak: Array<{ name: string; username: string; url: string }> = [];
    const reused: Array<{ password: string; entries: Array<{ name: string; username: string; url: string }> }> = [];

    const passwordMap = new Map<string, Array<{ name: string; username: string; url: string }>>();

    for (const e of allEntries) {
      if (e.type !== "login") continue;
      try {
        const pw = decrypt(
          { ciphertext: e.encrypted_password, iv: e.iv, authTag: e.auth_tag },
          key,
        );

        if (pw.length < 12) {
          weak.push({ name: e.name, username: e.username, url: e.url });
        }

        const existing = passwordMap.get(pw) || [];
        existing.push({ name: e.name, username: e.username, url: e.url });
        passwordMap.set(pw, existing);
      } catch {}
    }

    for (const [pw, entries] of passwordMap) {
      if (entries.length > 1) {
        reused.push({ password: "••••••••", entries });
      }
    }

    res.json({ weak, reused });
  } catch {
    res.status(500).json({ error: "Failed to check vault health" });
  }
});

// ── Snapshot Status ──
app.get("/snapshot/status", async (_req, res) => {
  try {
    const allEntries = await entry.find({ deletedAt: null }).sort("name").lean();
    const formatted = allEntries.map(e => ({
      name: e.name, username: e.username, url: e.url, notes: e.notes,
      encrypted_password: e.encrypted_password, iv: e.iv, auth_tag: e.auth_tag,
    }));
    const snapshotHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(formatted)));
    res.json({ hash: snapshotHash, entryCount: formatted.length, timestamp: new Date().toISOString() });
  } catch {
    res.status(500).json({ error: "Failed to get snapshot status" });
  }
});

// ── Snapshot Commit ──
app.post("/snapshot", async (_req, res) => {
  try {
    const allEntries = await entry.find({ deletedAt: null }).sort("name").lean();
    const formatted = allEntries.map(e => ({
      name: e.name, username: e.username, url: e.url, notes: e.notes,
      encrypted_password: e.encrypted_password, iv: e.iv, auth_tag: e.auth_tag,
    }));
    const snapshotHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(formatted)));
    res.json({ hash: snapshotHash, entryCount: formatted.length, timestamp: new Date().toISOString(), committed: false });
  } catch {
    res.status(500).json({ error: "Failed to commit snapshot" });
  }
});

// ── Snapshot Verify ──
app.post("/verify", async (req, res) => {
  try {
    const { hash } = req.body || {};
    if (!hash) return res.status(400).json({ error: "hash is required" });
    const allEntries = await entry.find({ deletedAt: null }).sort("name").lean();
    const formatted = allEntries.map(e => ({
      name: e.name, username: e.username, url: e.url, notes: e.notes,
      encrypted_password: e.encrypted_password, iv: e.iv, auth_tag: e.auth_tag,
    }));
    const currentHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(formatted)));
    res.json({ valid: currentHash === hash, currentHash, submittedHash: hash });
  } catch {
    res.status(500).json({ error: "Failed to verify snapshot" });
  }
});

// ── Sync ──
app.post("/sync", async (_req, res) => {
  try {
    const key = (_req as any).key as Buffer;

    const allEntries = await entry.find({ deletedAt: null }).sort("name").lean();
    const formatted = allEntries.map(e => ({
      name: e.name, username: e.username, url: e.url, notes: e.notes,
      encrypted_password: e.encrypted_password, iv: e.iv, auth_tag: e.auth_tag,
    }));
    const localHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(formatted)));

    const jsonStr = JSON.stringify(formatted);
    const encrypted = encrypt(jsonStr, key);
    const blob = Buffer.from(JSON.stringify(encrypted));
    const cid = await addBlob(blob);

    res.json({ cid, hash: localHash, entryCount: formatted.length, timestamp: new Date().toISOString() });
  } catch {
    res.status(500).json({ error: "Sync failed" });
  }
});

// ── Export Vault ──
app.post("/export", async (req, res) => {
  try {
    const { format } = req.body || {};
    const key = (req as any).key as Buffer;
    const allEntries = await entry.find({ deletedAt: null }).lean();

    if (format === "csv") {
      const header = "name,username,password,url,uris,notes,folder,type";
      const rows = allEntries.map((e) => {
        const pw = decrypt(
          { ciphertext: e.encrypted_password, iv: e.iv, authTag: e.auth_tag },
          key,
        );
        const esc = (s: string) => `"${(s || "").replace(/"/g, '""')}"`;
        return [
          esc(e.name),
          esc(e.username),
          esc(pw),
          esc(e.url || ""),
          esc((e.uris || []).join(";")),
          esc(e.notes || ""),
          esc(e.folder || ""),
          esc(e.type || "login"),
        ].join(",");
      });
      res.setHeader("Content-Type", "text/csv");
      res.send([header, ...rows].join("\n"));
    } else {
      const exportData = allEntries.map((e) => {
        const pw = decrypt(
          { ciphertext: e.encrypted_password, iv: e.iv, authTag: e.auth_tag },
          key,
        );
        return {
          name: e.name,
          username: e.username,
          password: pw,
          url: e.url || "",
          uris: e.uris || [],
          notes: e.notes || "",
          folder: e.folder || null,
          type: e.type || "login",
          customFields: e.customFields || [],
          favorite: e.favorite || false,
          createdAt: e.createdAt,
          updatedAt: e.updatedAt,
        };
      });
      res.json({ entries: exportData, exportedAt: new Date().toISOString() });
    }
  } catch {
    res.status(500).json({ error: "Export failed" });
  }
});

// ── Import Vault ──
app.post("/import", async (req, res) => {
  try {
    const { entries: importEntries, format } = req.body || {};
    const key = (req as any).key as Buffer;

    if (!importEntries || !Array.isArray(importEntries)) {
      res.status(400).json({ error: "Missing entries array" });
      return;
    }
    if (importEntries.length > 10000) {
      res.status(400).json({ error: "Too many entries (max 10,000)" });
      return;
    }

    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const item of importEntries) {
      try {
        const name = item.name || item.Name || "";
        const username = item.username || item.Username || "";
        const password = item.password || item.Password || "";
        const url = item.url || item.URL || "";
        const notes = item.notes || item.Notes || "";
        const uris = item.uris || [];
        const folder = item.folder || item.Folder || null;
        const type = item.type || "login";

        if (!name || !password) {
          skipped++;
          continue;
        }

        const existing = await entry.findOne({ name, deletedAt: null });
        if (existing) {
          skipped++;
          continue;
        }

        const encrypted = encrypt(password, key);
        await entry.create({
          name,
          username,
          encrypted_password: encrypted.ciphertext,
          iv: encrypted.iv,
          auth_tag: encrypted.authTag,
          url: url || null,
          uris,
          notes,
          folder,
          type,
        });
        created++;
      } catch (err: any) {
        if (err?.code === 11000) skipped++;
        else errors.push(err?.message || "Unknown error");
      }
    }

    res.json({ ok: true, created, skipped, errors });
  } catch {
    res.status(500).json({ error: "Import failed" });
  }
});

// ── CLI Export ──
app.get("/export/cli", async (req, res) => {
  try {
    const format = (req.query.format as string) || "json";
    const key = (req as any).key as Buffer;
    const allEntries = await entry.find({ deletedAt: null }).lean();

    if (format === "csv") {
      const header = "name,username,password,url,uris,notes,folder,type";
      const rows = allEntries.map((e) => {
        const pw = decrypt(
          { ciphertext: e.encrypted_password, iv: e.iv, authTag: e.auth_tag },
          key,
        );
        const esc = (s: string) => `"${(s || "").replace(/"/g, '""')}"`;
        return [
          esc(e.name),
          esc(e.username),
          esc(pw),
          esc(e.url || ""),
          esc((e.uris || []).join(";")),
          esc(e.notes || ""),
          esc(e.folder || ""),
          esc(e.type || "login"),
        ].join(",");
      });
      res.setHeader("Content-Type", "text/csv");
      res.send([header, ...rows].join("\n"));
    } else {
      const exportData = allEntries.map((e) => {
        const pw = decrypt(
          { ciphertext: e.encrypted_password, iv: e.iv, authTag: e.auth_tag },
          key,
        );
        return {
          name: e.name,
          username: e.username,
          password: pw,
          url: e.url || "",
          uris: e.uris || [],
          notes: e.notes || "",
          folder: e.folder || null,
          type: e.type || "login",
          customFields: e.customFields || [],
          favorite: e.favorite || false,
          createdAt: e.createdAt,
          updatedAt: e.updatedAt,
        };
      });
      res.json({ entries: exportData, exportedAt: new Date().toISOString() });
    }
  } catch {
    res.status(500).json({ error: "Export failed" });
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
