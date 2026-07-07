import crypto from "node:crypto";
import { deriveKey } from "../crypto/argon2.js";
import { loadConfig, saveConfig } from "../config/config.js";
import { promptMasterPassword } from "../utils/prompt.js";
import { connectDB, disconnectDB } from "../db/connect.js";
import { certExists, generateCert } from "../crypto/tls.js";

export async function initCommand() {
  try {
    if (loadConfig()) {
      console.log("Vault already initialized. Use --reset to start over.");
      process.exit(0);
    }
  } catch (error: unknown) {
    console.log(error);
  }

  const pwd = await promptMasterPassword(true);
  const salt = crypto.randomBytes(32);
  let derivedKey;
  try {
    derivedKey = await deriveKey(pwd, salt);
  } catch (error: unknown) {
    console.error("Key derivation failed:", error);
    process.exit(1);
  }
  const mongoDBUri = "mongodb://localhost:27017/vaultchain";

  saveConfig(salt.toString("base64"), mongoDBUri);
  console.log(
    "Your salt is stored at ~/.vaultchain/config.json. If you delete this file your vault will be permanently inaccessible. Back it up somewhere safe.",
  );

  if (!certExists()) {
    await generateCert();
    console.log("TLS certificate generated at ~/.vaultchain/cert.pem");
  }

  try {
    await connectDB(mongoDBUri);
    await disconnectDB();
  } catch (error: unknown) {
    console.log(error);
  }
}
