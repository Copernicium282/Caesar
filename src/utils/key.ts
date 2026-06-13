import fs from "node:fs";
import { deriveKey } from "../crypto/argon2.js";
import {
  decryptSessionKey,
  isExpired,
  SESSION_FILE_PATH,
  type SessionData,
} from "../session/session.js";
import { promptMasterPassword } from "./prompt.js";

export async function fetchKey(cfg: { argon2_salt: any; mongodb_uri: string }) {
  let key;
  if (process.env.VAULTCHAIN_SESSION && fs.existsSync(SESSION_FILE_PATH)) {
    const data = fs.readFileSync(SESSION_FILE_PATH, "utf-8");
    const sessionData: SessionData = JSON.parse(data);
    if (!isExpired(sessionData)) {
      key = decryptSessionKey(process.env.VAULTCHAIN_SESSION, sessionData);
    }
  }
  if (key === undefined) {
    const MasterPwd = await promptMasterPassword();
    key = await deriveKey(MasterPwd, Buffer.from(cfg.argon2_salt, "base64"));
  }
  return key;
}
