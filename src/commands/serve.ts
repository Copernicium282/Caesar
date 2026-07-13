import { fileURLToPath } from "node:url";

export async function serveCommand() {
  await import("../server/index.js");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  serveCommand().catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
  });
}
