import { loadConfig } from "../config/config.js";
import { connectDB, disconnectDB } from "../db/connect.js";
import { entry } from "../db/models/entry.js";
import { decrypt } from "../crypto/aes.js";
import { fetchKey } from "../utils/key.js";

export async function historyCommand(name: string) {
  try {
    const cfg = loadConfig();
    await connectDB(cfg.mongodb_uri);
    const key = await fetchKey(cfg);

    const existing = await entry.findOne({ name, deletedAt: null }).lean();
    if (!existing) {
      console.log(`Entry not found: ${name}`);
      return;
    }

    if (!existing.passwordHistory || existing.passwordHistory.length === 0) {
      console.log(`No password history for ${name}`);
      return;
    }

    console.log(`Password history for ${name}:`);
    for (const h of existing.passwordHistory) {
      const decrypted = decrypt({ ciphertext: h.password, iv: h.iv, authTag: h.auth_tag }, key);
      const date = h.changedAt instanceof Date ? h.changedAt.toLocaleDateString() : String(h.changedAt);
      console.log(`  ${date}  ${decrypted}`);
    }
  } catch (error: unknown) {
    console.error(error);
  } finally {
    await disconnectDB();
  }
}
