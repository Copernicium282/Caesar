import { loadConfig } from "../config/config.js";
import { connectDB, disconnectDB } from "../db/connect.js";
import { entry } from "../db/models/entry.js";

export async function searchCommand(query: string) {
  try {
    const cfg = loadConfig();
    await connectDB(cfg.mongodb_uri);

    const result = await entry
      .find({
        deletedAt: null,
        $or: [
          { name: { $regex: query, $options: "i" } },
          { username: { $regex: query, $options: "i" } },
          { url: { $regex: query, $options: "i" } },
          { notes: { $regex: query, $options: "i" } },
        ],
      })
      .lean();
    if (result.length === 0) {
      console.log(`No entries found matching: ${query}`);
      process.exit(1);
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
