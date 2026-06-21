import { loadConfig } from "../config/config.js";
import { connectDB, disconnectDB } from "../db/connect.js";
import { entry } from "../db/models/entry.js";
import { encrypt } from "../crypto/aes.js";
import { fetchKey } from "../utils/key.js";
import fs from "node:fs";

export async function importCommand(options: {
  format?: string;
  input: string;
}) {
  try {
    const cfg = loadConfig();
    await connectDB(cfg.mongodb_uri);
    const key = await fetchKey(cfg);

    const fileContent = fs.readFileSync(options.input, "utf-8");
    const format = options.format || (options.input.endsWith(".csv") ? "csv" : "json");

    let importEntries: Array<Record<string, unknown>>;

    if (format === "csv") {
      const lines = fileContent.split("\n").filter((l) => l.trim());
      if (lines.length < 2) {
        console.log("Empty CSV file");
        await disconnectDB();
        return;
      }
      const header = lines[0]!.split(",").map((h) => h.trim().toLowerCase());
      importEntries = lines.slice(1).map((line) => {
        const values: string[] = [];
        let current = "";
        let inQuotes = false;
        for (const char of line) {
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === "," && !inQuotes) {
            values.push(current);
            current = "";
          } else {
            current += char;
          }
        }
        values.push(current);
        const obj: Record<string, unknown> = {};
        header.forEach((h, i) => {
          obj[h] = values[i] || "";
        });
        return obj;
      });
    } else {
      const parsed = JSON.parse(fileContent);
      importEntries = parsed.entries || parsed;
      if (!Array.isArray(importEntries)) {
        console.log("Invalid JSON format");
        await disconnectDB();
        return;
      }
    }

    let created = 0;
    let skipped = 0;

    for (const item of importEntries) {
      try {
        const name = (item.name as string) || (item.Name as string) || "";
        const username = (item.username as string) || (item.Username as string) || "";
        const password = (item.password as string) || (item.Password as string) || "";
        const url = (item.url as string) || (item.URL as string) || "";
        const notes = (item.notes as string) || (item.Notes as string) || "";
        const uris = (item.uris as string[]) || [];
        const folder = (item.folder as string) || (item.Folder as string) || null;
        const type = ((item.type as string) || "login") as "login" | "note";

        if (!name || !password) {
          skipped++;
          continue;
        }

        const existing = await entry.findOne({ name, deletedAt: null });
        if (existing) {
          skipped++;
          continue;
        }

        const encrypted = encrypt(password, key);
        const createData: Record<string, unknown> = {
          name,
          username,
          encrypted_password: encrypted.ciphertext,
          iv: encrypted.iv,
          auth_tag: encrypted.authTag,
          uris,
          notes,
          type,
        };
        if (url) createData.url = url;
        if (folder) createData.folder = folder;
        await entry.create(createData);
        created++;
      } catch (err: any) {
        if (err?.code === 11000) skipped++;
        else console.error(`Failed to import entry:`, err.message);
      }
    }

    console.log(`Import complete: ${created} created, ${skipped} skipped`);
    await disconnectDB();
  } catch (error) {
    console.error("Import failed:", error);
  }
}
