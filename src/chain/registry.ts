import { ethers } from "ethers";

export function getRegistryContract(
  provider: ethers.Provider,
  address: string,
): ethers.Contract {
  const REGISTRY_ABI = [
    "function commitSnapshot(bytes32 snapshotHash, uint256 entryCount) external",
    "function latestSnapshot(address owner) external view returns (tuple(bytes32 snapshotHash, uint256 timestamp, uint256 entryCount))",
    "function snapshotCount(address owner) external view returns (uint256)",
    "event SnapshotCommitted(bytes32 indexed snapshotHash, uint256 timestamp, uint256 entryCount)",
  ];

  return new ethers.Contract(address, REGISTRY_ABI, provider);
}
