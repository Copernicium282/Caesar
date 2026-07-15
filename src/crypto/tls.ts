import { createCA, createCert } from "mkcert";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execSync } from "node:child_process";

const TLS_DIR = path.join(os.homedir(), ".caesar");
const CERT_PATH = path.join(TLS_DIR, "cert.pem");
const KEY_PATH = path.join(TLS_DIR, "key.pem");
const CA_PATH = path.join(TLS_DIR, "ca.pem");

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
  fs.writeFileSync(CA_PATH, ca.cert, { mode: 0o600 });
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

function collectNSSDirs(): string[] {
  const dirs: string[] = [];
  const home = os.homedir();

  // Shared NSS database
  const sharedNss = path.join(home, ".pki", "nssdb");
  if (fs.existsSync(path.join(sharedNss, "cert9.db"))) {
    dirs.push(sharedNss);
  }

  // Browser profile directories
  const searchPaths = [
    path.join(home, ".mozilla", "firefox"),
    path.join(home, ".config", "mozilla", "firefox"),
    path.join(home, ".zen"),
    path.join(home, ".config", "zen"),
  ];

  for (const baseDir of searchPaths) {
    if (!fs.existsSync(baseDir)) continue;
    try {
      for (const profile of fs.readdirSync(baseDir)) {
        if (fs.existsSync(path.join(baseDir, profile, "cert9.db"))) {
          dirs.push(path.join(baseDir, profile));
        }
      }
    } catch {}
  }
  return dirs;
}

export function trustCAInFirefox(): boolean {
  if (!fs.existsSync(CA_PATH)) return false;
  const caCert = fs.readFileSync(CA_PATH, "utf-8");
  const dirs = collectNSSDirs();
  let installed = false;
  for (const dir of dirs) {
    if (trustCAInNSS(caCert, dir)) installed = true;
  }
  return installed;
}

export function removeCAFromFirefox(): void {
  if (!fs.existsSync(CA_PATH)) return;
  const dirs = collectNSSDirs();
  const tmpCa = path.join(os.tmpdir(), "caesar-ca.pem");
  fs.copyFileSync(CA_PATH, tmpCa);
  try {
    for (const dir of dirs) {
      try {
        execSync(`certutil -d sql:${dir} -D -n "Caesar Vault CA"`, { stdio: "pipe" });
      } catch {}
    }
  } finally {
    try { fs.unlinkSync(tmpCa); } catch {}
  }
}

function trustCAInNSS(caCert: string, nssDir: string): boolean {
  const tmpCa = path.join(os.tmpdir(), "caesar-ca.pem");
  fs.writeFileSync(tmpCa, caCert);
  try {
    execSync(`certutil -d sql:${nssDir} -A -t "C,," -n "Caesar Vault CA" -i "${tmpCa}"`, { stdio: "pipe" });
    fs.unlinkSync(tmpCa);
    return true;
  } catch {
    try { fs.unlinkSync(tmpCa); } catch {}
    return false;
  }
}
