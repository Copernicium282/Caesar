// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract VaultRegistry {
    struct Snapshot {
        bytes32 snapshotHash;
        uint256 timestamp;
        uint256 entryCount;
        string ipfsCid;
    }

    mapping(address => Snapshot[]) private snaps;

    event SnapshotCommitted(bytes32 indexed snapshotHash, uint256 timestamp, uint256 entryCount, string ipfsCid);

    function commitSnapshot(bytes32 _snapshotHash, uint256 _entryCount, string calldata _ipfsCid) external {
        snaps[msg.sender].push(Snapshot({
            snapshotHash: _snapshotHash,
            timestamp: block.timestamp,
            entryCount: _entryCount,
            ipfsCid: _ipfsCid
        }));
        emit SnapshotCommitted(_snapshotHash, block.timestamp, _entryCount, _ipfsCid);
    }

    function latestSnapshot(address _owner) external view returns (Snapshot memory) {
        uint256 count = snaps[_owner].length;
        require(count > 0, "No snapshots found for this owner");
        return snaps[_owner][count - 1];
    }

    function snapshotCount(address _owner) external view returns (uint256) {
        return snaps[_owner].length;
    }
}
