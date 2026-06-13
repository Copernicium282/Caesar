import { loadConfig } from "../config/config.js";
import fs from "node:fs";

export function backupSalt(path: string) {
  try {
    const cfg = loadConfig();
    const data = {
      argon2_salt: cfg.argon2_salt,
      created_at: new Date().toISOString(),
    };
    fs.writeFileSync(path, JSON.stringify(data), "utf-8");
    console.log(
      "Store this file somewhere safe and separate from this machine — a USB drive, encrypted cloud storage, or printed QR code. This is the only way to recover your vault if this machine is lost.",
    );
  } catch (error: unknown) {
    console.error(error);
  }
}
