import crypto from "node:crypto";
import { loadConfig, saveConfig } from "../config/config.js";
import { connectDB, disconnectDB } from "../db/connect.js";
import { entry } from "../db/models/entry.js";
import { deriveKey } from "../crypto/argon2.js";
import { decrypt, encrypt } from "../crypto/aes.js";
import { readPassword } from "../utils/prompt.js";

export async function changePasswordCommand() {
  try {
    const cfg = loadConfig();
    await connectDB(cfg.mongodb_uri);

    const oldPw = await readPassword("Current master password: ");
    const oldKey = await deriveKey(oldPw, Buffer.from(cfg.argon2_salt, "base64"));

    const sample = await entry.findOne({}).lean();
    if (sample) {
      try {
        decrypt({ ciphertext: sample.encrypted_password, iv: sample.iv, authTag: sample.auth_tag }, oldKey);
      } catch {
        console.error("Invalid current password");
        return;
      }
    }

    const newPw = await readPassword("New master password: ");
    const confirmPw = await readPassword("Confirm new password: ");
    if (newPw !== confirmPw) {
      console.error("Passwords do not match");
      return;
    }
    if (newPw.length < 8) {
      console.error("New password must be at least 8 characters");
      return;
    }

    const newSalt = crypto.randomBytes(32).toString("base64");
    const newKey = await deriveKey(newPw, Buffer.from(newSalt, "base64"));

    const allEntries = await entry.find({}).lean();
    const decrypted: Array<{ _id: any; plaintext: string; totp: string | undefined }> = [];

    for (const e of allEntries) {
      const pw = decrypt({ ciphertext: e.encrypted_password, iv: e.iv, authTag: e.auth_tag }, oldKey);
      let totp: string | undefined;
      if (e.totp && e.totp_iv && e.totp_auth_tag) {
        totp = decrypt({ ciphertext: e.totp, iv: e.totp_iv, authTag: e.totp_auth_tag }, oldKey);
      }
      decrypted.push({ _id: e._id, plaintext: pw, totp });
    }

    const updated: typeof allEntries = [];
    try {
      for (const d of decrypted) {
        const reEncrypted = encrypt(d.plaintext, newKey);
        const update: any = {
          encrypted_password: reEncrypted.ciphertext,
          iv: reEncrypted.iv,
          auth_tag: reEncrypted.authTag,
        };
        if (d.totp) {
          const totpReEncrypted = encrypt(d.totp, newKey);
          update.totp = totpReEncrypted.ciphertext;
          update.totp_iv = totpReEncrypted.iv;
          update.totp_auth_tag = totpReEncrypted.authTag;
        }
        await entry.updateOne({ _id: d._id }, { $set: update });
        const orig = allEntries.find(e => e._id === d._id);
        if (orig) updated.push(orig);
      }
    } catch (writeErr) {
      for (const d of decrypted) {
        if (updated.some(u => u._id === d._id)) {
          const rollback = encrypt(d.plaintext, oldKey);
          await entry.updateOne({ _id: d._id }, { $set: {
            encrypted_password: rollback.ciphertext, iv: rollback.iv, auth_tag: rollback.authTag,
          }});
        }
      }
      throw writeErr;
    }

    saveConfig(newSalt, cfg.mongodb_uri, cfg.anvil_rpc_url, cfg.vault_registry_address, cfg.sepolia_rpc_url, cfg.sepolia_vault_registry_address, cfg.sepolia_enabled);
    console.log("Master password changed successfully. All entries re-encrypted.");
  } catch (error: unknown) {
    console.error(error);
  } finally {
    await disconnectDB();
  }
}
