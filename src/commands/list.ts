import { loadConfig } from "../config/config.js";
import { connectDB, disconnectDB } from "../db/connect.js";
import { entry } from "../db/models/entry.js";

export async function listCommand(options: { json?: boolean }) {
  const cfg = loadConfig();
  await connectDB(cfg.mongodb_uri);
  try {
    const list = await entry.find({ deletedAt: null }).lean();
    if (list.length === 0) {
      console.log("No entries found.");
      process.exit(0);
    }

    if (options.json === true) {
      const sanitized = list.map((e: any) => ({
        name: e.name,
        username: e.username,
        url: e.url,
        uris: e.uris || [],
        notes: e.notes || '',
        folder: e.folder || null,
        favorite: e.favorite || false,
        type: e.type || 'login',
        customFields: e.customFields || [],
        hasTotp: !!(e.totp && e.totp_iv && e.totp_auth_tag),
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
      }));
      console.log(JSON.stringify(sanitized, null, 2));
    } else {
      console.table(
        list.map((e) => ({
          Name: e.name,
          Username: e.username,
          URL: e.url,
          Created: e.createdAt,
          Last_Updated: e.updatedAt,
        })),
      );
    }
  } catch (error: unknown) {
    console.log(error);
  } finally {
    await disconnectDB();
  }
}
