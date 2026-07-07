import { ethers } from "ethers";

export function getRegistryContract(
  wallet: ethers.Wallet,
  address: string,
): ethers.Contract {
  const REGISTRY_ABI = [
    "function commitSnapshot(bytes32 snapshotHash, uint256 entryCount, string ipfsCid) external",
    "function latestSnapshot(address owner) external view returns (tuple(bytes32 snapshotHash, uint256 timestamp, uint256 entryCount, string ipfsCid))",
    "function snapshotCount(address owner) external view returns (uint256)",
    "event SnapshotCommitted(bytes32 indexed snapshotHash, uint256 timestamp, uint256 entryCount, string ipfsCid)",
  ];

  return new ethers.Contract(address, REGISTRY_ABI, wallet);
}
