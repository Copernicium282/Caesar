import { loadConfig } from "../config/config.js";
import { connectDB, disconnectDB } from "../db/connect.js";
import { entry } from "../db/models/entry.js";
import { decrypt } from "../crypto/aes.js";
import { fetchKey } from "../utils/key.js";
import fs from "node:fs";

export async function exportCommand(options: {
  format?: string;
  output?: string;
}) {
  const cfg = loadConfig();
  await connectDB(cfg.mongodb_uri);
  try {
    const key = await fetchKey(cfg);

    const format = options.format || "json";
    const allEntries = await entry.find({ deletedAt: null }).lean();

    let data: string;
    if (format === "csv") {
      const header = "name,username,password,url,uris,notes,folder,type";
      const rows = allEntries.map((e) => {
        const pw = decrypt(
          { ciphertext: e.encrypted_password, iv: e.iv, authTag: e.auth_tag },
          key,
        );
        const esc = (s: string) => `"${(s || "").replace(/"/g, '""')}"`;
        return [
          esc(e.name),
          esc(e.username),
          esc(pw),
          esc(e.url || ""),
          esc((e.uris || []).join(";")),
          esc(e.notes || ""),
          esc(e.folder || ""),
          esc(e.type || "login"),
        ].join(",");
      });
      data = [header, ...rows].join("\n");
    } else {
      const exportData = allEntries.map((e) => {
        const pw = decrypt(
          { ciphertext: e.encrypted_password, iv: e.iv, authTag: e.auth_tag },
          key,
        );
        return {
          name: e.name,
          username: e.username,
          password: pw,
          url: e.url || "",
          uris: e.uris || [],
          notes: e.notes || "",
          folder: e.folder || null,
          type: e.type || "login",
          customFields: e.customFields || [],
          favorite: e.favorite || false,
          createdAt: e.createdAt,
          updatedAt: e.updatedAt,
        };
      });
      data = JSON.stringify({ entries: exportData, exportedAt: new Date().toISOString() }, null, 2);
    }

    const outputPath = options.output || `caesar-export.${format}`;
    fs.writeFileSync(outputPath, data);
    console.log(`Exported ${allEntries.length} entries to ${outputPath}`);
  } catch (error) {
    console.error("Export failed:", error);
  } finally {
    await disconnectDB();
  }
}
