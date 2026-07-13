import { createCA, createCert } from "mkcert";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const TLS_DIR = path.join(os.homedir(), ".caesar");
const CERT_PATH = path.join(TLS_DIR, "cert.pem");
const KEY_PATH = path.join(TLS_DIR, "key.pem");

export function certExists(): boolean {
  return fs.existsSync(CERT_PATH) && fs.existsSync(KEY_PATH);
}

export async function generateCert(): Promise<void> {
  if (!fs.existsSync(TLS_DIR)) {
    fs.mkdirSync(TLS_DIR, { recursive: true });
  }

  const ca = await createCA({
    organization: "Caesar Vault",
    countryCode: "US",
    state: "California",
    locality: "San Francisco",
    validity: 730,
  });

  const cert = await createCert({
    ca: { key: ca.key, cert: ca.cert },
    domains: ["127.0.0.1", "localhost"],
    validity: 730,
  });

  fs.writeFileSync(CERT_PATH, cert.cert, { mode: 0o600 });
  fs.writeFileSync(KEY_PATH, cert.key, { mode: 0o600 });
}

export function loadCert(): { cert: string; key: string } {
  if (!certExists()) {
    throw new Error("TLS certificate not found. Run 'caesar init' first.");
  }
  return {
    cert: fs.readFileSync(CERT_PATH, "utf-8"),
    key: fs.readFileSync(KEY_PATH, "utf-8"),
  };
}
