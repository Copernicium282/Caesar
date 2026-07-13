import crypto from "node:crypto";
import fs from "node:fs";
import { deriveKey } from "../crypto/argon2.js";
import { configPath, saveConfig } from "../config/config.js";
import { promptMasterPassword } from "../utils/prompt.js";
import { certExists, generateCert } from "../crypto/tls.js";
import { encrypt } from "../crypto/aes.js";

export async function initCommand() {
  if (fs.existsSync(configPath)) {
    console.log("Vault already initialized. Use --reset to start over.");
    process.exit(0);
  }

  console.log();

  const pwd = await promptMasterPassword(true);
  const salt = crypto.randomBytes(32);
  let derivedKey;
  try {
    derivedKey = await deriveKey(pwd, salt);
  } catch (error: unknown) {
    console.error("Key derivation failed:", error);
    process.exit(1);
  }
  const mongoDBUri = "mongodb://localhost:27017/caesar";

  // Create a verification blob so the server can validate the password even with an empty vault
  const verification = encrypt("caesar-vault-verification", derivedKey);

  saveConfig(salt.toString("base64"), mongoDBUri);
  // Write verification_blob into config
  const cfg = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  cfg.verification_blob = JSON.stringify(verification);
  fs.writeFileSync(configPath, JSON.stringify(cfg), { mode: 0o600 });

  console.log("\nVault initialized.");
  console.log(
    "Your salt is stored at ~/.caesar/config.json. If you delete this file your vault will be permanently inaccessible. Back it up somewhere safe.",
  );

  if (!certExists()) {
    await generateCert();
    console.log("TLS certificate generated at ~/.caesar/cert.pem");
  }
}
