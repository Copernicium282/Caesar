import { createInterface } from "node:readline/promises";
import { loadConfig } from "../config/config.js";
import { connectDB, disconnectDB } from "../db/connect.js";
import { entry } from "../db/models/entry.js";
import { stdin, stdout } from "node:process";

export async function deleteCommand(name: string) {
  try {
    let cfg = loadConfig();
    await connectDB(cfg.mongodb_uri);

    const pwd = await entry.findOne({ name: name });
    if (pwd === null) {
      console.log(`Entry not found: ${name}`);
      process.exit(1);
    }

    const rl = createInterface(stdin, stdout);
    console.log(`Password name: ${pwd.name}`);
    let choice = await rl.question(
      "Are you sure you want to delete this entry? (y/N):",
    );
    if (choice === "y" || choice === "Y") {
      await entry.deleteOne({ name: name });
    } else {
      console.log("Cancelled");
      process.exit(1);
    }

    await disconnectDB();
    console.log(`Entry deleted: ${name}`);
  } catch (error: unknown) {
    console.error(error);
  }
}
