import { loadConfig } from "../config/config.js";
import fs from "node:fs";

export function backupSalt(path: string) {
  try {
    const cfg = loadConfig();
    const data = {
      argon2_salt: cfg.argon2_salt,
      created_at: new Date().toISOString(),
    };
    fs.writeFileSync(path, JSON.stringify(data), { mode: 0o600 });
    console.log(
      "Store this file somewhere safe, separate from this machine (USB drive, encrypted cloud, or printed QR). This is the only way to recover your vault if this machine is lost.",
    );
  } catch (error: unknown) {
    console.error(error);
  }
}
