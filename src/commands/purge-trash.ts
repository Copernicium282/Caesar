import { loadConfig } from "../config/config.js";
import { connectDB, disconnectDB } from "../db/connect.js";
import { entry } from "../db/models/entry.js";

export async function purgeTrashCommand() {
  try {
    const cfg = loadConfig();
    await connectDB(cfg.mongodb_uri);

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const result = await entry.deleteMany({ deletedAt: { $ne: null, $lt: thirtyDaysAgo } });
    console.log(`Purged ${result.deletedCount} entries older than 30 days.`);
  } catch (error: unknown) {
    console.error(error);
  } finally {
    await disconnectDB();
  }
}
