import { loadConfig } from "../config/config.js";
import { connectDB, disconnectDB } from "../db/connect.js";
import { entry } from "../db/models/entry.js";

export async function favoriteCommand(name: string) {
  try {
    const cfg = loadConfig();
    await connectDB(cfg.mongodb_uri);

    const existing = await entry.findOne({ name, deletedAt: null });
    if (!existing) {
      console.log(`Entry not found: ${name}`);
      return;
    }

    existing.favorite = !existing.favorite;
    await existing.save();
    console.log(`${name} ${existing.favorite ? "added to" : "removed from"} favorites`);
  } catch (error: unknown) {
    console.error(error);
  } finally {
    await disconnectDB();
  }
}
