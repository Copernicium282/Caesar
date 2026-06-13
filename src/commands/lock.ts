import fs from "node:fs";
import { SESSION_FILE_PATH } from "../session/session.js";

export function lockCommand() {
  if (fs.existsSync(SESSION_FILE_PATH)) {
    fs.unlinkSync(SESSION_FILE_PATH);
    console.log("Session cleared");
  } else {
    console.log("No active session");
    process.exit(0);
  }
}
