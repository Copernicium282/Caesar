import { loadConfig } from "../config/config.js";
import { deriveKey } from "../crypto/argon2.js";
import { createSessionData, SESSION_FILE_PATH } from "../session/session.js";
import { promptMasterPassword } from "../utils/prompt.js";
import fs from "node:fs";

export async function unlockCommand() {
  try {
    const MasterPwd = await promptMasterPassword();
    const cfg = loadConfig();
    const derived_key = await deriveKey(
      MasterPwd,
      Buffer.from(cfg.argon2_salt, "base64"),
    );
    const data = createSessionData(derived_key);
    fs.writeFileSync(SESSION_FILE_PATH, JSON.stringify(data.sessionData));

    console.log(
      `Session token: ${data.token}\nExport it in your shell: export VAULTCHAIN_SESSION=${data.token}\nThe session is valid for 15 minutes.`,
    );
  } catch (error: unknown) {
    console.error(error);
  }
}
