import { describe, it, expect } from "vitest";
import { generatePassword } from "../utils/generate.js";

describe("generatePassword", () => {
  it("returns a string of requested length", async () => {
    const pw = await generatePassword(24);
    expect(pw).toHaveLength(24);
  });

  it("defaults to 20 characters", async () => {
    const pw = await generatePassword();
    expect(pw).toHaveLength(20);
  });

  it("contains only valid characters", async () => {
    const validChars = /^[A-Za-z0-9!@#$%^&*()_+\-=[\]{}|;:,.<>?]+$/;
    const pw = await generatePassword(64);
    expect(pw).toMatch(validChars);
  });

  it("produces different passwords each call", async () => {
    const a = await generatePassword(32);
    const b = await generatePassword(32);
    expect(a).not.toBe(b);
  });

  it("handles minimum length of 1", async () => {
    const pw = await generatePassword(1);
    expect(pw).toHaveLength(1);
  });

  it("handles large lengths", async () => {
    const pw = await generatePassword(256);
    expect(pw).toHaveLength(256);
  });
});
