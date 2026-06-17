import { generateSnapshotHash } from "../chain/snapshot.js";
import { loadConfig } from "../config/config.js";
import { decrypt } from "../crypto/aes.js";
import { fetchKey } from "../utils/key.js";
import fs from "node:fs";
import { WALLET_FILE_PATH } from "./wallet.js";
import { getProvider, getWallet } from "../chain/provider.js";
import { getRegistryContract } from "../chain/registry.js";
import { ethers } from "ethers";

export async function snapshotCommand(options: { remote?: boolean }) {
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

    console.warn(
      "Your wallet address and snapshot hashes will be public on Linea Sepolia.",
    );
    const tx = await contract.commitSnapshot!(snapshotHash, entryCount, {
      maxPriorityFeePerGas: ethers.parseUnits("1", "gwei"),
      maxFeePerGas: ethers.parseUnits("10", "gwei"),
    });
    await tx.wait();
    console.log(
      `Snapshot committed to Linea Sepolia\ntx: ${tx.hash}, entries: ${entryCount}`,
    );
  }

  const provider = getProvider(cfg.anvil_rpc_url);
  const wallet = getWallet(privateKey, provider);
  const contract = getRegistryContract(wallet, cfg.vault_registry_address);
  const tx = await contract.commitSnapshot!(snapshotHash, entryCount);
  await tx.wait();
  console.log(
    `Snapshot committed to local Anvil Chain\ntx: ${tx.hash}, entries: ${entryCount}`,
  );
}
