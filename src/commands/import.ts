import { loadConfig } from "../config/config.js";
import { connectDB, disconnectDB } from "../db/connect.js";
import { entry } from "../db/models/entry.js";
import { encrypt } from "../crypto/aes.js";
import { fetchKey } from "../utils/key.js";
import { parse } from "csv-parse/sync";
import fs from "node:fs";

export async function importCommand(input: string, options: {
  format?: string;
}) {
  const cfg = loadConfig();
  await connectDB(cfg.mongodb_uri);
  try {
    const key = await fetchKey(cfg);

    const fileContent = fs.readFileSync(input, "utf-8");
    const format = options.format || (input.endsWith(".csv") ? "csv" : "json");

    let importEntries: Array<Record<string, unknown>>;

    if (format === "csv") {
      const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true,
        relax_column_count: true,
      });
      importEntries = records.map((row: unknown) => {
        const r = row as Record<string, string>;
        const obj: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(r)) {
          obj[k.toLowerCase()] = v;
        }
        return obj;
      });
    } else {
      const parsed = JSON.parse(fileContent);
      importEntries = parsed.entries || parsed;
      if (!Array.isArray(importEntries)) {
        console.log("Invalid JSON format");
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
          customFields: (item.customFields as unknown[]) || [],
        };
        if (url) createData.url = url;
        if (folder) createData.folder = folder;

        const totpSecret = (item.totp as string) || (item.TOTP as string) || null;
        if (totpSecret) {
          const totpEncrypted = encrypt(totpSecret, key);
          createData.totp = totpEncrypted.ciphertext;
          createData.totp_iv = totpEncrypted.iv;
          createData.totp_auth_tag = totpEncrypted.authTag;
        }

        await entry.create(createData);
        created++;
      } catch (err: any) {
        if (err?.code === 11000) skipped++;
        else console.error(`Failed to import entry:`, err.message);
      }
    }

    console.log(`Import complete: ${created} created, ${skipped} skipped`);
  } catch (error) {
    console.error("Import failed:", error);
  } finally {
    await disconnectDB();
  }
}
