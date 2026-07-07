import { loadConfig } from "../config/config.js";
import { connectDB, disconnectDB } from "../db/connect.js";
import { entry } from "../db/models/entry.js";
import { decrypt } from "../crypto/aes.js";
import { fetchKey } from "../utils/key.js";
import * as OTPAuth from "otpauth";

export async function totpCommand(name: string) {
  try {
    const cfg = loadConfig();
    await connectDB(cfg.mongodb_uri);
    const key = await fetchKey(cfg);

    const existing = await entry.findOne({ name, deletedAt: null }).lean();
    if (!existing) {
      console.log(`Entry not found: ${name}`);
      return;
    }

    if (!existing.totp || !existing.totp_iv || !existing.totp_auth_tag) {
      console.log(`No TOTP configured for ${name}`);
      return;
    }

    const secret = decrypt(
      { ciphertext: existing.totp, iv: existing.totp_iv, authTag: existing.totp_auth_tag },
      key,
    );

    const totp = new OTPAuth.TOTP({ secret: OTPAuth.Secret.fromBase32(secret) });
    const token = totp.generate();
    console.log(`TOTP for ${name}: ${token}`);
  } catch (error: unknown) {
    console.error(error);
  } finally {
    await disconnectDB();
  }
}
