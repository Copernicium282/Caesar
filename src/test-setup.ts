import { connectDB, disconnectDB } from "./db/connect.js";
import { entry } from "./db/models/entry.js";
import { encrypt } from "./crypto/aes.js";
import crypto from "node:crypto";

const cfg = { mongodb_uri: "mongodb://localhost:27017/caesar" };
await connectDB(cfg.mongodb_uri);

const testKey = crypto.randomBytes(32);
const pw1 = encrypt("correct-horse-battery-staple", testKey);
const pw2 = encrypt("p@ssw0rd123", testKey);

await entry.deleteMany({});
await entry.create({
  name: "GitHub",
  username: "user@github.com",
  encrypted_password: pw1.ciphertext,
  iv: pw1.iv,
  auth_tag: pw1.authTag,
  url: "https://github.com",
  notes: "main account",
});
await entry.create({
  name: "Gmail",
  username: "me@gmail.com",
  encrypted_password: pw2.ciphertext,
  iv: pw2.iv,
  auth_tag: pw2.authTag,
  url: "https://gmail.com",
  notes: "",
});

console.log("Test entries created. Test key (hex):", testKey.toString("hex"));

// Remove leftover wallet if any
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
const walletPath = path.join(os.homedir(), ".caesar", "wallet.json");
if (fs.existsSync(walletPath)) fs.unlinkSync(walletPath);

await disconnectDB();
