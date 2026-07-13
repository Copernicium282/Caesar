import { describe, it, expect } from "vitest";
import { encrypt, decrypt } from "../crypto/aes.js";

describe("AES-256-GCM encrypt/decrypt", () => {
  const key = Buffer.alloc(32, 0x42);

  it("encrypts and decrypts a string round-trip", () => {
    const plaintext = "hello caesar";
    const encrypted = encrypt(plaintext, key);
    expect(encrypted.ciphertext).toBeTruthy();
    expect(encrypted.iv).toBeTruthy();
    expect(encrypted.authTag).toBeTruthy();
    const decrypted = decrypt(encrypted, key);
    expect(decrypted).toBe(plaintext);
  });

  it("produces different ciphertexts for the same input (random IV)", () => {
    const a = encrypt("test", key);
    const b = encrypt("test", key);
    expect(a.ciphertext).not.toBe(b.ciphertext);
    expect(a.iv).not.toBe(b.iv);
  });

  it("decrypts with wrong key throws", () => {
    const encrypted = encrypt("secret", key);
    const wrongKey = Buffer.alloc(32, 0xff);
    expect(() => decrypt(encrypted, wrongKey)).toThrow();
  });

  it("handles empty string", () => {
    const encrypted = encrypt("", key);
    const decrypted = decrypt(encrypted, key);
    expect(decrypted).toBe("");
  });

  it("handles unicode content", () => {
    const plaintext = "café résumé emoji 🔐";
    const encrypted = encrypt(plaintext, key);
    const decrypted = decrypt(encrypted, key);
    expect(decrypted).toBe(plaintext);
  });

  it("handles long content", () => {
    const plaintext = "x".repeat(10000);
    const encrypted = encrypt(plaintext, key);
    const decrypted = decrypt(encrypted, key);
    expect(decrypted).toBe(plaintext);
  });
});
