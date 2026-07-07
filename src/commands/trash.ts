import { loadConfig } from "../config/config.js";
import { connectDB, disconnectDB } from "../db/connect.js";
import { entry } from "../db/models/entry.js";

export async function trashCommand() {
  try {
    const cfg = loadConfig();
    await connectDB(cfg.mongodb_uri);

    const trashed = await entry.find({ deletedAt: { $ne: null } }).lean();
    if (trashed.length === 0) {
      console.log("Trash is empty.");
      return;
    }

    console.table(trashed.map(e => ({
      Name: e.name,
      Username: e.username,
      Deleted: e.deletedAt,
    })));
  } catch (error: unknown) {
    console.error(error);
  } finally {
    await disconnectDB();
  }
}
