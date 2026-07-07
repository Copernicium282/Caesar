import { generate } from "selfsigned";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const TLS_DIR = path.join(os.homedir(), "/.vaultchain");
const CERT_PATH = path.join(TLS_DIR, "cert.pem");
const KEY_PATH = path.join(TLS_DIR, "key.pem");

export function certExists(): boolean {
  return fs.existsSync(CERT_PATH) && fs.existsSync(KEY_PATH);
}

export async function generateCert(): Promise<void> {
  if (!fs.existsSync(TLS_DIR)) {
    fs.mkdirSync(TLS_DIR, { recursive: true });
  }
  const attrs = [{ name: "commonName", value: "Caesar Vault" }];
  const notBefore = new Date();
  const notAfter = new Date();
  notAfter.setFullYear(notAfter.getFullYear() + 2);

  const pems = await generate(attrs, {
    notBeforeDate: notBefore,
    notAfterDate: notAfter,
    keySize: 2048,
    algorithm: "sha256",
    extensions: [
      { name: "subjectAltName", altNames: [
        { type: 2, value: "127.0.0.1" },
        { type: 7, ip: "127.0.0.1" },
      ]},
    ],
  });
  fs.writeFileSync(CERT_PATH, pems.cert, { mode: 0o600 });
  fs.writeFileSync(KEY_PATH, pems.private, { mode: 0o600 });
}

export function loadCert(): { cert: string; key: string } {
  if (!certExists()) {
    throw new Error("TLS certificate not found. Run 'vaultchain init' first.");
  }
  return {
    cert: fs.readFileSync(CERT_PATH, "utf-8"),
    key: fs.readFileSync(KEY_PATH, "utf-8"),
  };
}
