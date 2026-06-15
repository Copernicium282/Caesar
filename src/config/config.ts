import os from "node:os";
import path from "node:path";
import fs from "node:fs";

export const configPath = path.join(os.homedir(), "/.vaultchain/config.json");

export function saveConfig(
  salt: string,
  mongodb_uri: string = "mongodb://localhost:27017/vaultchain",
) {
  if (!fs.existsSync(path.dirname(configPath))) {
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
  }
  fs.writeFileSync(
    configPath,
    JSON.stringify({
      argon2_salt: salt,
      mongodb_uri: mongodb_uri,
    }),
  );
}

export function loadConfig() {
  try {
    let cfg = fs.readFileSync(configPath, "utf-8");
    let data = JSON.parse(cfg);
    return { argon2_salt: data.argon2_salt, mongodb_uri: data.mongodb_uri };
  } catch (err) {
    throw new Error("Vault not initialized. Run vaultchain init first.");
  }
}
