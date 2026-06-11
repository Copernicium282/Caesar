import { promptMasterPassword } from "../utils/prompt.js";
import { loadConfig } from "../config/config.js";
import { connectDB, disconnectDB } from "../db/connect.js";
import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";
import { deriveKey } from "../crypto/argon2.js";
import { readPassword } from "../utils/prompt.js";
import { entry } from "../db/models/entry.js";
import { encrypt } from "../crypto/aes.js";

export async function addCommand() {
  const Masterpwd = await promptMasterPassword();
  const cfg = loadConfig();
  try {
    await connectDB(cfg.mongodb_uri);
    const key = await deriveKey(
      Masterpwd,
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
    let plainPwd = await readPassword(`Enter Password: `);
    let encryptedPwd = encrypt(plainPwd, key);
    pwd.encrypted_password = encryptedPwd.ciphertext;
    pwd.iv = encryptedPwd.iv;
    pwd.auth_tag = encryptedPwd.authTag;
    pwd.url = await rl.question(`Enter URL: `);
    pwd.notes = await rl.question(`Enter Notes: `);
    await pwd.save();

    await disconnectDB();
    console.log(`Entry saved: ${pwdName}`);
  } catch (err) {
    console.log(err);
  }
}
