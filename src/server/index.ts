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
import { decrypt } from "../crypto/aes.js";

const app = express();
const port = 9876;

app.use(express.json());
// Only listen on 127.0.0.1 — never 0.0.0.0
app.listen(port, "127.0.0.1", () => {
  console.log("VaultChain server running on http://127.0.0.1:9876");
});

app.post("/unlock", async (req, res) => {
  const { MasterPwd } = req.body;
  const cfg = loadConfig();
  const key = await deriveKey(
    MasterPwd,
    Buffer.from(cfg.argon2_salt, "base64"),
  );
  const { token, sessionData } = createSessionData(key);
  res.send(JSON.stringify({ token: token, sessionData: sessionData }));
});

// Auth Middleware
app.use("/", (req, res, next) => {
  const data = fs.readFileSync(SESSION_FILE_PATH, "utf-8");
  const sessionData = JSON.parse(data);
  let key;
  if (req.headers.authorization && !isExpired(sessionData)) {
    try {
      key = decryptSessionKey(
        req.headers.authorization!.split("Bearer ")[1]!,
        sessionData,
      );
      (req as any).key = key;
      next();
    } catch (error: unknown) {
      res.status(401).json({ error: "Unauthorized" });
    }
  } else {
    res.status(401).json({ error: "Unauthorized" });
  }
});

app.post("/lock", (req, res) => {
  if (fs.existsSync(SESSION_FILE_PATH)) {
    fs.unlinkSync(SESSION_FILE_PATH);
    res.send(JSON.stringify({ ok: true }));
  }
});

app.get("/entries", async (req, res) => {
  const list = await entry.find({}).lean();
  const entries = list.map((e) => ({
    name: e.name,
    username: e.username,
    url: e.url,
  }));
  res.json(entries);
});

app.get("/entries/:name/password", async (req, res) => {
  const pwd = await entry.findOne({ name: req.params.name }).lean();
  if (pwd !== null) {
    const decrypted = decrypt(
      { ciphertext: pwd.encrypted_password, iv: pwd.iv, authTag: pwd.auth_tag },
      (req as any).key,
    );
    res.send(JSON.stringify({ password: decrypted }));
  } else {
    res.status(401).json({ error: "No such Password found." });
  }
});
