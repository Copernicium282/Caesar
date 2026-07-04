import { loadConfig } from "../config/config.js";
import { connectDB, disconnectDB } from "../db/connect.js";
import { entry } from "../db/models/entry.js";

export async function searchCommand(query: string) {
  try {
    const cfg = loadConfig();
    await connectDB(cfg.mongodb_uri);

    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const result = await entry
      .find({
        deletedAt: null,
        $or: [
          { name: { $regex: escaped, $options: "i" } },
          { username: { $regex: escaped, $options: "i" } },
          { url: { $regex: escaped, $options: "i" } },
          { notes: { $regex: escaped, $options: "i" } },
        ],
      })
      .lean();
    if (result.length === 0) {
      console.log(`No entries found matching: ${query}`);
      process.exit(0);
    }
    console.table(
      result.map((e) => ({
        Name: e.name,
        Username: e.username,
        URL: e.url,
        Notes: e.notes,
      })),
    );

    await disconnectDB();
  } catch (error: unknown) {
    console.error(error);
  }
}
