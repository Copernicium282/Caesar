import crypto from "node:crypto";

type EncryptedPayload = {
  ciphertext: string;
  iv: string;
  authTag: string;
};

export function encrypt(plaintext: string, key: Buffer): EncryptedPayload {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = `${cipher.update(plaintext, "utf-8", "base64")}${cipher.final("base64")}`;
  const authTag = cipher.getAuthTag().toString("base64");
  return {
    ciphertext: ciphertext,
    iv: iv.toString("base64"),
    authTag: authTag,
  };
}

export function decrypt(payload: EncryptedPayload, key: Buffer) {
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(payload.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(payload.authTag, "base64"));
  const decipheredtext = `${decipher.update(payload.ciphertext, "base64", "utf-8")}${decipher.final("utf-8")}`;
  return decipheredtext;
}
