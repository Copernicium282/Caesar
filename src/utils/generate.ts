import crypto from "node:crypto";

export async function generatePassword(length?: number) {
  const len = length ?? 20;
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?";
  const charsLength = chars.length;
  const limit = 256 - (256 % charsLength);
  let result = "";

  while (result.length < len) {
    let neededBytes = len - result.length;
    let rbytes = crypto.randomBytes(neededBytes);

    for (let i = 0; i < neededBytes; i++) {
      let byte = rbytes[i];
      if (byte === undefined) continue;
      if (byte < limit) {
        result += chars[byte % charsLength];
        if (result.length === len) break;
      }
    }
  }

  return result;
}
