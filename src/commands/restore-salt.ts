import fs from "node:fs";
import { loadConfig, saveConfig } from "../config/config.js";

export function restoreSalt(path: string) {
  try {
    const data = fs.readFileSync(path, "utf-8");
    const argon2_salt = JSON.parse(data).argon2_salt;
    try {
      loadConfig();
      console.error(
        "Config already exists, refusing to overwrite. Delete it manually first if you're sure.",
      );
      process.exit(1);
    } catch {
      saveConfig(argon2_salt, "mongodb://localhost:27017/vaultchain");
    }
  } catch (error: unknown) {
    console.error(error);
  }
}
