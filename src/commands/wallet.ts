import { loadConfig } from "../config/config.js";
import { encrypt } from "../crypto/aes.js";
import { fetchKey } from "../utils/key.js";
import { ethers } from "ethers";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const WALLET_FILE_PATH = path.join(
  os.homedir(),
  "/.vaultchain/wallet.json",
);

export async function walletGenerate() {
  const cfg = loadConfig();
  const key = await fetchKey(cfg);

  const wallet = ethers.Wallet.createRandom();
  const encryptedKey = encrypt(wallet.privateKey, key);

  fs.writeFileSync(
    WALLET_FILE_PATH,
    JSON.stringify({
      encrypted_private_key: encryptedKey.ciphertext,
      iv: encryptedKey.iv,
      authTag: encryptedKey.authTag,
      address: wallet.address,
    }),
    { mode: 0o600 },
  );

  console.log(`VaultChain Wallet Address: ${wallet.address}`);
}

export async function walletAddress() {
  const wallet = fs.readFileSync(WALLET_FILE_PATH, "utf-8");
  console.log(JSON.parse(wallet).address);
}
