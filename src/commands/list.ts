import { loadConfig } from "../config/config.js";
import { connectDB, disconnectDB } from "../db/connect.js";
import { entry } from "../db/models/entry.js";

export async function listCommand() {
  try {
    const cfg = loadConfig();
    await connectDB(cfg.mongodb_uri);

    const list = await entry.find({}).lean();
    if (list.length === 0) {
      console.log("No entries found.");
      process.exit(1);
    }

    console.table(
      list.map((e) => ({
        Name: e.name,
        Username: e.username,
        URL: e.url,
        Created: e.createdAt,
        Last_Updated: e.updatedAt,
      })),
    );

    await disconnectDB();
  } catch (error: unknown) {
    console.log(error);
  }
}
