import { connectDB, disconnectDB } from "./db/connect.js";
import { entry } from "./db/models/entry.js";
import { loadConfig } from "./config/config.js";

async function migrate() {
  const cfg = loadConfig();
  await connectDB(cfg.mongodb_uri);

  const result = await entry.updateMany(
    { folder: { $exists: false } },
    {
      $set: {
        folder: null,
        favorite: false,
        type: "login",
        customFields: [],
        passwordHistory: [],
        deletedAt: null,
      },
    },
  );

  console.log(`Migrated ${result.modifiedCount} entries`);
  await disconnectDB();
}

migrate().catch(console.error);
