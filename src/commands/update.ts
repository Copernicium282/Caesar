import { loadConfig } from "../config/config.js";
import { connectDB, disconnectDB } from "../db/connect.js";
import { readPassword } from "../utils/prompt.js";
import { entry } from "../db/models/entry.js";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { encrypt } from "../crypto/aes.js";
import { fetchKey } from "../utils/key.js";

export async function updateCommand(name: string) {
  try {
    const cfg = loadConfig();
    await connectDB(cfg.mongodb_uri);
    const key = await fetchKey(cfg);

    const pwd = await entry.findOne({ name: name });
    if (pwd === null) {
      console.log(`Entry not found: ${name}`);
      process.exit(1);
    }

    const rl = createInterface(stdin, stdout);

    pwd.name = await rl.question(`Name (${pwd.name}): `);
    let pwdName = pwd.name;
    pwd.username = await rl.question(`Username (${pwd.username}): `);
    let plainPwd = await readPassword(`Password: `);
    if (plainPwd !== "") {
      let encryptedPwd = encrypt(plainPwd, key);
      pwd.encrypted_password = encryptedPwd.ciphertext;
      pwd.iv = encryptedPwd.iv;
      pwd.auth_tag = encryptedPwd.authTag;
    }
    let url = await rl.question(`URL (${pwd.url}): `);
    if (url !== "") pwd.url = url;
    let notes = await rl.question(`Notes (${pwd.notes}): `);
    if (notes !== "") pwd.notes = notes;
    await pwd.save();

    await disconnectDB();
    console.log(`Entry updated: ${pwdName}`);
  } catch (error: unknown) {
    console.log(error);
  }
}
