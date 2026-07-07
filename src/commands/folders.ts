import { loadConfig } from "../config/config.js";
import { connectDB, disconnectDB } from "../db/connect.js";
import { folder } from "../db/models/folder.js";

export async function folderListCommand() {
  try {
    const cfg = loadConfig();
    await connectDB(cfg.mongodb_uri);

    const folders = await folder.find({}).lean();
    if (folders.length === 0) {
      console.log("No folders.");
      return;
    }

    console.table(folders.map(f => ({ Name: f.name, Created: f.createdAt })));
  } catch (error: unknown) {
    console.error(error);
  } finally {
    await disconnectDB();
  }
}

export async function folderCreateCommand(name: string) {
  try {
    const cfg = loadConfig();
    await connectDB(cfg.mongodb_uri);

    const existing = await folder.findOne({ name });
    if (existing) {
      console.log(`Folder already exists: ${name}`);
      return;
    }

    await folder.create({ name });
    console.log(`Folder created: ${name}`);
  } catch (error: unknown) {
    console.error(error);
  } finally {
    await disconnectDB();
  }
}

export async function folderDeleteCommand(name: string) {
  try {
    const cfg = loadConfig();
    await connectDB(cfg.mongodb_uri);

    const existing = await folder.findOne({ name });
    if (!existing) {
      console.log(`Folder not found: ${name}`);
      return;
    }

    const { entry } = await import("../db/models/entry.js");
    await entry.updateMany({ folder: name }, { $set: { folder: null } });
    await folder.deleteOne({ name });
    console.log(`Folder deleted: ${name}`);
  } catch (error: unknown) {
    console.error(error);
  } finally {
    await disconnectDB();
  }
}
