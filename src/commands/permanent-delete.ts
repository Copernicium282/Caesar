import { loadConfig } from "../config/config.js";
import { connectDB, disconnectDB } from "../db/connect.js";
import { entry } from "../db/models/entry.js";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

export async function permanentDeleteCommand(name: string) {
  try {
    const cfg = loadConfig();
    await connectDB(cfg.mongodb_uri);

    const existing = await entry.findOne({ name });
    if (!existing) {
      console.log(`Entry not found: ${name}`);
      return;
    }

    const rl = createInterface(stdin, stdout);
    const choice = await rl.question(`Permanently delete "${name}"? This cannot be undone. (y/N): `);
    rl.close();

    if (choice === "y" || choice === "Y") {
      await entry.deleteOne({ name });
      console.log(`Entry permanently deleted: ${name}`);
    } else {
      console.log("Cancelled");
    }
  } catch (error: unknown) {
    console.error(error);
  } finally {
    await disconnectDB();
  }
}
