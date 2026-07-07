import { loadConfig } from "../config/config.js";
import { connectDB, disconnectDB } from "../db/connect.js";
import { entry } from "../db/models/entry.js";

export async function restoreCommand(name: string) {
  try {
    const cfg = loadConfig();
    await connectDB(cfg.mongodb_uri);

    const existing = await entry.findOne({ name, deletedAt: { $ne: null } });
    if (!existing) {
      console.log(`Entry not found in trash: ${name}`);
      return;
    }

    existing.deletedAt = undefined as any;
    await existing.save();
    console.log(`Entry restored: ${name}`);
  } catch (error: unknown) {
    console.error(error);
  } finally {
    await disconnectDB();
  }
}
