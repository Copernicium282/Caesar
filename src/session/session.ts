import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { decrypt, encrypt } from "../crypto/aes.js";

export interface SessionData {
  encrypted_key: string; // base64
  iv: string; // base64
  authTag: string; // base64
  expires_at: string; // ISO 8601 timestamp
}

const SESSION_FILE_PATH = path.join(os.homedir(), "/.vaultchain/session.json");

export function createSessionData(derivedKey: Buffer): {
  token: string;
  sessionData: SessionData;
} {
  const token = crypto.randomBytes(32);
  const payload = encrypt(derivedKey.toHex(), token);
  const expires_at = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  const sessionData = {
    encrypted_key: payload.ciphertext,
    iv: payload.iv,
    authTag: payload.authTag,
    expires_at: expires_at,
  };
  return { token: token.toHex(), sessionData: sessionData };
}

export function decryptSessionKey(
  token: string,
  sessionData: SessionData,
): Buffer {
  const decipheredtext = decrypt(
    {
      ciphertext: sessionData.encrypted_key,
      authTag: sessionData.authTag,
      iv: sessionData.iv,
    },
    Buffer.from(token, "hex"),
  );

  return Buffer.from(decipheredtext, "hex");
}

export function isExpired(sessionData: SessionData): boolean {
  return Date.now() >= new Date(sessionData.expires_at).getTime();
}
