import argon2 from "argon2";

export async function deriveKey(
  password: string,
  salt: Buffer,
): Promise<Buffer> {
  try {
    const hash = await argon2.hash(password, {
      raw: true,
      salt: salt,
      type: argon2.argon2id,
    });
    return hash;
  } catch (err) {
    throw new Error("Couldn't generate hash");
  }
}
