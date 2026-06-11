import crypto from "node:crypto";
import { deriveKey } from "../crypto/argon2.js";
import { loadConfig, saveConfig } from "../config/config.js";
import { promptMasterPassword } from "../utils/prompt.js";
import { connectDB, disconnectDB } from "../db/connect.js";

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
  try {
    await deriveKey(pwd, salt);
  } catch (error: unknown) {
    console.log(error);
  }
  const mongoDBUri = "mongodb://localhost:27017/vaultchain";

  saveConfig(salt.toString("base64"), mongoDBUri);
  console.log(
    "Your salt is stored at ~/.vaultchain/config.json. If you delete this file your vault will be permanently inaccessible. Back it up somewhere safe.",
  );

  try {
    await connectDB(mongoDBUri);
    await disconnectDB();
  } catch (error: unknown) {
    console.log(error);
  }
}
