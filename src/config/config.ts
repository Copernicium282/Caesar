import os from "node:os";
import path from "node:path";
import fs from "node:fs";

export const configPath = path.join(os.homedir(), "/.vaultchain/config.json");

export function saveConfig(
  salt: string,
  mongodb_uri: string = "mongodb://localhost:27017/vaultchain",
  anvil_rpc_url: string = "http://127.0.0.1:8545",
  vault_registry_address: string = "",
) {
  if (!fs.existsSync(path.dirname(configPath))) {
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
  }
  fs.writeFileSync(
    configPath,
    JSON.stringify({
      argon2_salt: salt,
      mongodb_uri: mongodb_uri,
      anvil_rpc_url: anvil_rpc_url,
      vault_registry_address: vault_registry_address,
    }),
  );
}

export function loadConfig(): {
  argon2_salt: string;
  mongodb_uri: string;
  anvil_rpc_url: string;
  vault_registry_address: string;
} {
  try {
    let cfg = fs.readFileSync(configPath, "utf-8");
    let data = JSON.parse(cfg);
    return {
      argon2_salt: data.argon2_salt,
      mongodb_uri: data.mongodb_uri,
      anvil_rpc_url: data.anvil_rpc_url ?? "http://127.0.0.1:8545",
      vault_registry_address: data.vault_registry_address ?? "",
    };
  } catch (err) {
    throw new Error("Vault not initialized. Run vaultchain init first.");
  }
}
