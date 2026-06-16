import { generateSnapshotHash } from "../chain/snapshot.js";
import { loadConfig } from "../config/config.js";
import { decrypt } from "../crypto/aes.js";
import { fetchKey } from "../utils/key.js";
import fs from "node:fs";
import { WALLET_FILE_PATH } from "./wallet.js";
import { getProvider, getWallet } from "../chain/provider.js";
import { getRegistryContract } from "../chain/registry.js";

export async function snapshotCommand() {
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

  const provider = getProvider(cfg.anvil_rpc_url);
  const wallet = getWallet(privateKey, provider);
  const contract = getRegistryContract(wallet, cfg.vault_registry_address);
  const tx = await contract.commitSnapshot(snapshotHash, entryCount);
  await tx.wait();
  console.log(`Snapshot committed — tx: ${tx.hash}, entries: ${entryCount}`);
}
