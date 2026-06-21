import { loadConfig } from "../config/config.js";
import { connectDB, disconnectDB } from "../db/connect.js";
import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";
import { readPassword } from "../utils/prompt.js";
import { entry } from "../db/models/entry.js";
import { encrypt } from "../crypto/aes.js";
import { generatePassword } from "../utils/generate.js";
import { fetchKey } from "../utils/key.js";

export async function addCommand(options: {
  generate?: string | boolean;
  uri?: string[];
}) {
  const cfg = loadConfig();
  await connectDB(cfg.mongodb_uri);
  const key = await fetchKey(cfg);
  const rl = createInterface(stdin, stdout);

  try {
    const name = await rl.question("Enter Name: ");
    const username = await rl.question("Enter Username: ");

    let len: number | undefined = undefined;
    if (options.generate === true) {
      len = undefined;
    } else if (typeof options.generate === "string") {
      len = Number(options.generate);
    }

    let plainPwd: string;
    if (options.generate) {
      plainPwd = await generatePassword(len);
      console.log(`Generated password: ${plainPwd}`);
    } else {
      plainPwd = await readPassword(`Enter Password: `);
    }

    const url = await rl.question(`Enter URL: `);
    const notes = await rl.question(`Enter Notes: `);

    const encrypted = encrypt(plainPwd, key);
    const createData: Record<string, unknown> = {
      name,
      username,
      encrypted_password: encrypted.ciphertext,
      iv: encrypted.iv,
      auth_tag: encrypted.authTag,
      uris: options.uri || [],
    };
    if (url) createData.url = url;
    if (notes) createData.notes = notes;
    await entry.create(createData);

    await disconnectDB();
    console.log(`Entry saved: ${name}`);
  } catch (error: unknown) {
    console.error(error);
  }
}
