import { createHelia } from "helia";
import { unixfs } from "@helia/unixfs";
import { FsBlockstore } from "blockstore-fs";
import { FsDatastore } from "datastore-fs";
import path from "node:path";
import os from "node:os";

const IPFS_DIR = path.join(os.homedir(), ".caesar", "ipfs");

let helia: Awaited<ReturnType<typeof createHelia>> | null = null;
let fs: ReturnType<typeof unixfs> | null = null;

export async function startHelia(): Promise<void> {
  const blockstore = new FsBlockstore(path.join(IPFS_DIR, "blocks"));
  const datastore = new FsDatastore(path.join(IPFS_DIR, "datastore"));

  helia = await createHelia({ blockstore, datastore });
  fs = unixfs(helia);
}

export async function stopHelia(): Promise<void> {
  if (helia) {
    await helia.stop();
    helia = null;
    fs = null;
  }
}

export async function addBlob(data: Uint8Array): Promise<string> {
  if (!fs) throw new Error("Helia not started");
  const cid = await fs.addBytes(data);
  return cid.toString();
}

export async function getBlob(cidString: string): Promise<Uint8Array> {
  if (!fs) throw new Error("Helia not started");
  const { CID } = await import("multiformats/cid");
  const cid = CID.parse(cidString);
  const chunks: Uint8Array[] = [];
  for await (const chunk of fs.cat(cid)) {
    chunks.push(chunk);
  }
  const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}
