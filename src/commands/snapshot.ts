import { generateSnapshotHash } from "../chain/snapshot.js";
import { loadConfig } from "../config/config.js";
import { decrypt, encrypt } from "../crypto/aes.js";
import { fetchKey } from "../utils/key.js";
import fs from "node:fs";
import { WALLET_FILE_PATH } from "./wallet.js";
import { getProvider, getWallet } from "../chain/provider.js";
import { getRegistryContract } from "../chain/registry.js";
import { ethers } from "ethers";
import { startHelia, stopHelia, addBlob } from "../ipfs/helia.js";
import { connectDB, disconnectDB } from "../db/connect.js";
import { entry } from "../db/models/entry.js";

export async function snapshotCommand(options: { remote?: boolean }) {
  const cfg = loadConfig();
  const key = await fetchKey(cfg);

  const { snapshotHash, entryCount } = await generateSnapshotHash();

  function getPrivateKey() {
    const data = JSON.parse(fs.readFileSync(WALLET_FILE_PATH, "utf-8"));
    return decrypt({ ciphertext: data.encrypted_private_key, iv: data.iv, authTag: data.authTag }, key);
  }

  let cid = "";

  if (options.remote && cfg.sepolia_enabled) {
    await startHelia();
    try {
      await connectDB(cfg.mongodb_uri);
      const allEntries = await entry.find({ deletedAt: null }).sort("name").lean();
      const formatted = allEntries.map(e => ({
        name: e.name, username: e.username, url: e.url, notes: e.notes,
        encrypted_password: e.encrypted_password, iv: e.iv, auth_tag: e.auth_tag,
      }));
      await disconnectDB();

      const jsonStr = JSON.stringify(formatted);
      const encrypted = encrypt(jsonStr, key);
      const blob = Buffer.from(JSON.stringify(encrypted));
      cid = await addBlob(blob);
    } finally {
      await stopHelia();
    }

    const privateKey = getPrivateKey();
    const provider = getProvider(cfg.sepolia_rpc_url);
    const wallet = getWallet(privateKey, provider);
    const contract = getRegistryContract(wallet, cfg.sepolia_vault_registry_address);

    console.warn("Your wallet address and snapshot hashes will be public on Ethereum Sepolia.");
    const tx = await contract.commitSnapshot!(snapshotHash, entryCount, cid, {
      maxPriorityFeePerGas: ethers.parseUnits("1", "gwei"),
      maxFeePerGas: ethers.parseUnits("10", "gwei"),
    });
    await tx.wait();
    console.log(`Snapshot committed to Ethereum Sepolia\ntx: ${tx.hash}, entries: ${entryCount}, CID: ${cid}`);
  }

  try {
    const privateKey = getPrivateKey();
    const provider = getProvider(cfg.anvil_rpc_url);
    const wallet = getWallet(privateKey, provider);
    const contract = getRegistryContract(wallet, cfg.vault_registry_address);
    const tx = await contract.commitSnapshot!(snapshotHash, entryCount, cid);
    await tx.wait();
    console.log(`Snapshot committed to local Anvil Chain\ntx: ${tx.hash}, entries: ${entryCount}`);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`Local Anvil commit skipped: ${msg}`);
  }
}
