import { promptMasterPassword } from "../utils/prompt.js";
import { loadConfig } from "../config/config.js";
import { connectDB, disconnectDB } from "../db/connect.js";
import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";
import { deriveKey } from "../crypto/argon2.js";
import { readPassword } from "../utils/prompt.js";
import { entry } from "../db/models/entry.js";
import { encrypt } from "../crypto/aes.js";
import { generatePassword } from "../utils/generate.js";

export async function addCommand(options: { generate?: string | boolean }) {
  const MasterPwd = await promptMasterPassword();
  const cfg = loadConfig();
  try {
    await connectDB(cfg.mongodb_uri);
    const key = await deriveKey(
      MasterPwd,
      Buffer.from(cfg.argon2_salt, "base64"),
    );
    const rl = createInterface(stdin, stdout);
    const pwd = await entry.create({
      name: "",
      username: "",
      encrypted_password: "",
      iv: "",
      auth_tag: "",
      url: "",
      notes: "",
    });

    pwd.name = await rl.question("Enter Name: ");
    let pwdName = pwd.name;
    pwd.username = await rl.question("Enter Username: ");

    let len: number | undefined = undefined;
    if (options.generate === true) {
      len = undefined;
    } else if (typeof options.generate === "string") {
      len = Number(options.generate);
    }
    if (options.generate) {
      const plainPwd = await generatePassword(len);
      let encryptedPwd = encrypt(plainPwd, key);
      pwd.encrypted_password = encryptedPwd.ciphertext;
      pwd.iv = encryptedPwd.iv;
      pwd.auth_tag = encryptedPwd.authTag;
    } else {
      const plainPwd = await readPassword(`Enter Password: `);
      let encryptedPwd = encrypt(plainPwd, key);
      pwd.encrypted_password = encryptedPwd.ciphertext;
      pwd.iv = encryptedPwd.iv;
      pwd.auth_tag = encryptedPwd.authTag;
    }

    pwd.url = await rl.question(`Enter URL: `);
    pwd.notes = await rl.question(`Enter Notes: `);
    await pwd.save();

    await disconnectDB();
    console.log(`Entry saved: ${pwdName}`);
  } catch (error: unknown) {
    console.log(error);
  }
}
