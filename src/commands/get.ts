import { loadConfig } from "../config/config.js";
import { decrypt } from "../crypto/aes.js";
import { connectDB, disconnectDB } from "../db/connect.js";
import clipboard from "clipboardy";
import { entry } from "../db/models/entry.js";
import { fetchKey } from "../utils/key.js";

const FIELD_WHITELIST = new Set([
  "name",
  "username",
  "url",
  "notes",
  "createdAt",
  "updatedAt",
]);

export async function getCommand(
  name: string,
  options: { show?: boolean; field?: string },
) {
  try {
    let cfg = loadConfig();
    if (options.field) {
      const field = options.field;
      if (!FIELD_WHITELIST.has(field)) {
        console.error(
          `Unknown field: ${options.field}\nAllowed fields are name, username, url, notes, createdAt, updatedAt`,
        );
        return;
      }

      await connectDB(cfg.mongodb_uri);

      const pwdObj = await entry.findOne({ name: name, deletedAt: null }).lean();
      if (pwdObj === null) {
        console.log(`Entry not found: ${name}`);
        return;
      }

      console.log(pwdObj[field as keyof typeof pwdObj]);
    } else {
      await connectDB(cfg.mongodb_uri);
      const key = await fetchKey(cfg);

      const pwdObj = await entry.findOne({ name: name, deletedAt: null }).lean();
      if (pwdObj === null) {
        console.log(`Entry not found: ${name}`);
        return;
      }

      let decryptedPwd = decrypt(
        {
          ciphertext: pwdObj.encrypted_password,
          iv: pwdObj.iv,
          authTag: pwdObj.auth_tag,
        },
        key,
      );

      if (options.show === true) {
        console.log(decryptedPwd);
      } else {
        clipboard.writeSync(decryptedPwd);
        console.log("Password copied to clipboard (clears in 30s)");
        setTimeout(() => { clipboard.writeSync(""); }, 30000).unref();
      }
    }
  } catch (error: unknown) {
    console.error(error);
  } finally {
    await disconnectDB();
  }
}
