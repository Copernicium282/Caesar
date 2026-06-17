import { getProvider, getWallet } from "../chain/provider.js";
import { getRegistryContract } from "../chain/registry.js";
import { generateSnapshotHash } from "../chain/snapshot.js";
import { loadConfig } from "../config/config.js";
import { decrypt } from "../crypto/aes.js";
import { fetchKey } from "../utils/key.js";
import { WALLET_FILE_PATH } from "./wallet.js";
import fs from "node:fs";

export async function verifyCommand(options: { remote?: boolean }) {
  const cfg = loadConfig();
  const key = await fetchKey(cfg);

  const { snapshotHash, entryCount } = await generateSnapshotHash();

  const data = JSON.parse(fs.readFileSync(WALLET_FILE_PATH, "utf-8"));
  const privateKey = decrypt(
    {
      ciphertext: data.encrypted_private_key,
      iv: data.iv,
      authTag: data.authTag,
    },
    key,
  );

  if (options.remote) {
    if (!cfg.linea_enabled) {
      console.error("Linea Sepolia Sync is not enabled in Config.");
      process.exit(1);
    }
    const provider = getProvider(cfg.linea_rpc_url);
    const wallet = getWallet(privateKey, provider);
    const contract = getRegistryContract(
      wallet,
      cfg.linea_vault_registry_address,
    );
    const onChainSnapshot = await contract.latestSnapshot!(wallet.address);
    if (onChainSnapshot.snapshotHash === snapshotHash) {
      console.log(
        `Linea Sepolia Vault matches last committed snapshot (${entryCount} entries, committed at ${onChainSnapshot.timestamp})`,
      );
    } else {
      console.warn(
        `Linea Sepolia Vault has changed since last snapshot. ${entryCount} entries now vs ${onChainSnapshot.entryCount} at last commit. Run 'vaultchain snapshot' to commit.`,
      );
    }
    return;
  }

  const provider = getProvider(cfg.anvil_rpc_url);
  const wallet = getWallet(privateKey, provider);
  const contract = getRegistryContract(wallet, cfg.vault_registry_address);
  const onChainSnapshot = await contract.latestSnapshot!(wallet.address);
  if (onChainSnapshot.snapshotHash === snapshotHash) {
    console.log(
      `Vault matches last committed snapshot (${entryCount} entries, committed at ${onChainSnapshot.timestamp})`,
    );
  } else {
    console.warn(
      `Vault has changed since last snapshot. ${entryCount} entries now vs ${onChainSnapshot.entryCount} at last commit. Run 'vaultchain snapshot' to commit.`,
    );
  }
}
