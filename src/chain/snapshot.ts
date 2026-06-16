import { ethers } from "ethers";
import { loadConfig } from "../config/config.js";
import { connectDB, disconnectDB } from "../db/connect.js";
import { entry } from "../db/models/entry.js";

export interface SnapshotResult {
  snapshotHash: string;
  entryCount: number;
}

export async function generateSnapshotHash() {
  const cfg = loadConfig();
  await connectDB(cfg.mongodb_uri);

  const list = await entry.find({}).sort("name").lean();

  const formattedEntries = list.map((item) => ({
    name: item.name,
    username: item.username,
    url: item.url,
    notes: item.notes,
    encrypted_password: item.encrypted_password,
    iv: item.iv,
    auth_tag: item.auth_tag,
  }));

  const jsonString = JSON.stringify(formattedEntries);
  const snapshotHash = ethers.keccak256(ethers.toUtf8Bytes(jsonString));

  await disconnectDB();
  return {
    snapshotHash,
    entryCount: formattedEntries.length,
  };
}
