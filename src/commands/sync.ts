import { loadConfig } from "../config/config.js";
import { decrypt, encrypt } from "../crypto/aes.js";
import { fetchKey } from "../utils/key.js";
import { getProvider, getWallet } from "../chain/provider.js";
import { getRegistryContract } from "../chain/registry.js";
import { startHelia, stopHelia, getBlob } from "../ipfs/helia.js";
import { connectDB, disconnectDB } from "../db/connect.js";
import { entry } from "../db/models/entry.js";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import fs from "node:fs";
import { WALLET_FILE_PATH } from "./wallet.js";
import { ethers } from "ethers";

interface SyncEntry {
  name: string;
  username: string;
  url: string;
  notes?: string;
  encrypted_password: string;
  iv: string;
  auth_tag: string;
}

export async function syncCommand() {
  const cfg = loadConfig();
  const key = await fetchKey(cfg);

  const data = JSON.parse(fs.readFileSync(WALLET_FILE_PATH, "utf-8"));
  const privateKey = decrypt({ ciphertext: data.encrypted_private_key, iv: data.iv, authTag: data.authTag }, key);

  const provider = getProvider(cfg.sepolia_rpc_url);
  const wallet = getWallet(privateKey, provider);
  const contract = getRegistryContract(wallet, cfg.sepolia_vault_registry_address);

  const onChain = await contract.latestSnapshot!(wallet.address);
  const remoteCid = onChain.ipfsCid;

  if (!remoteCid) {
    console.log("No IPFS snapshot found. Run 'caesar snapshot --remote' on your primary device first.");
    return;
  }

  console.log(`Remote snapshot: ${onChain.entryCount} entries, CID: ${remoteCid}`);

  await startHelia();
  let remoteEntries: SyncEntry[];
  try {
    const encryptedBuf = await getBlob(remoteCid);
    const encrypted = JSON.parse(encryptedBuf.toString());
    const jsonStr = decrypt(encrypted, key);
    remoteEntries = JSON.parse(jsonStr);
  } finally {
    await stopHelia();
  }

  await connectDB(cfg.mongodb_uri);
  const localEntries = await entry.find({}).lean();

  const localMap = new Map(localEntries.map(e => [e.name, e]));
  const remoteMap = new Map(remoteEntries.map(e => [e.name, e]));

  const added = remoteEntries.filter(e => !localMap.has(e.name));
  const modified = remoteEntries.filter(e => {
    const local = localMap.get(e.name);
    return local && local.encrypted_password !== e.encrypted_password;
  });
  const deleted = localEntries.filter(e => {
    return !remoteMap.has(e.name) && !e.deletedAt;
  });

  console.log(`\nDiff summary:`);
  console.log(`  Added: ${added.length} entries`);
  console.log(`  Modified: ${modified.length} entries`);
  console.log(`  Deleted: ${deleted.length} entries`);

  if (added.length === 0 && modified.length === 0 && deleted.length === 0) {
    console.log("\nVault is already in sync.");
    await disconnectDB();
    return;
  }

  const rl = createInterface(stdin, stdout);
  const choice = await rl.question("\nApply sync? (y/N): ");
  rl.close();

  if (choice !== "y" && choice !== "Y") {
    console.log("Sync cancelled.");
    await disconnectDB();
    return;
  }

  for (const e of added) {
    const doc: Record<string, unknown> = {
      name: e.name, username: e.username, url: e.url,
      encrypted_password: e.encrypted_password, iv: e.iv, auth_tag: e.auth_tag,
      favorite: false, type: "login", customFields: [], passwordHistory: [],
    };
    if (e.notes) doc.notes = e.notes;
    await entry.create(doc);
  }

  for (const e of modified) {
    await entry.updateOne({ name: e.name }, { $set: {
      encrypted_password: e.encrypted_password, iv: e.iv, auth_tag: e.auth_tag,
    }});
  }

  for (const e of deleted) {
    await entry.updateOne({ name: e.name }, { $set: { deletedAt: new Date() } });
  }

  console.log(`\nSync applied: ${added.length} added, ${modified.length} modified, ${deleted.length} deleted`);

  const { snapshotHash } = await generateLocalHash();
  if (snapshotHash === onChain.snapshotHash) {
    console.log("Sync verified — local hash matches on-chain hash.");
  } else {
    console.warn("Hash mismatch after sync — investigate before continuing.");
  }

  await disconnectDB();
}

async function generateLocalHash(): Promise<{ snapshotHash: string }> {
  const { ethers: e } = await import("ethers");
  const list = await entry.find({ deletedAt: null }).sort("name").lean();
  const formatted = list.map(item => ({
    name: item.name, username: item.username, url: item.url, notes: item.notes,
    encrypted_password: item.encrypted_password, iv: item.iv, auth_tag: item.auth_tag,
  }));
  return { snapshotHash: e.keccak256(e.toUtf8Bytes(JSON.stringify(formatted))) };
}
