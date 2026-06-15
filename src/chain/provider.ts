import { ethers } from "ethers";

export function getProvider(rpcUrl?: string): ethers.JsonRpcApiProvider {
  if (rpcUrl === undefined) rpcUrl = "http://127.0.0.1:8545";
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  return provider;
}

export function getWallet(
  privateKey: string,
  provider: ethers.Provider,
): ethers.Wallet {
  const wallet = new ethers.Wallet(privateKey, provider);
  return wallet;
}
