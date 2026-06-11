import { loadConfig } from "../config/config.js";
import { decrypt } from "../crypto/aes.js";
import { deriveKey } from "../crypto/argon2.js";
import { connectDB, disconnectDB } from "../db/connect.js";
import clipboard from "clipboardy";
import { entry } from "../db/models/entry.js";
import { promptMasterPassword } from "../utils/prompt.js";

export async function getCommand(name: string) {
  try {
    let MasterPwd = await promptMasterPassword();
    let cfg = loadConfig();
    await connectDB(cfg.mongodb_uri);
    let key = await deriveKey(
      MasterPwd,
      Buffer.from(cfg.argon2_salt, "base64"),
    );

    const pwdObj = await entry.findOne({ name: name }).lean();
    if (pwdObj === null) {
      console.log(`Entry not found: ${name}`);
      process.exit(1);
    }
    let decryptedPwd = decrypt(
      {
        ciphertext: pwdObj.encrypted_password,
        iv: pwdObj.iv,
        authTag: pwdObj.auth_tag,
      },
      key,
    );
    clipboard.writeSync(decryptedPwd);
    console.log("Password copied to clipboard (clears in 30s)");

    // clear in 30s
    setTimeout(() => {
      clipboard.writeSync("");
    }, 30000);

    await disconnectDB();
  } catch (err) {
    console.log(err);
  }
}
