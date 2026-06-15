// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract VaultRegistry {
    struct Snapshot {
        bytes32 snapshotHash;
        uint256 timestamp;
        uint256 entryCount;
    }

    // Maps a user's address to an array of their historic snapshots
    mapping(address => Snapshot[]) private snaps;

    event SnapshotCommitted(bytes32 indexed snapshotHash, uint256 timestamp, uint256 entryCount);

    /**
     * @notice Pushes a new Snapshot to the caller's array and emits a SnapshotCommitted event
     * @param _snapshotHash The cryptographic hash representing the snapshot state
     * @param _entryCount The total number of entries recorded in this snapshot
     */
    function commitSnapshot(bytes32 _snapshotHash, uint256 _entryCount) external {
        // Create the snapshot struct and cleanly push it into the array
        snaps[msg.sender].push(Snapshot({
            snapshotHash: _snapshotHash,
            timestamp: block.timestamp,
            entryCount: _entryCount
        }));
        emit SnapshotCommitted(_snapshotHash, block.timestamp, _entryCount);
    }

    /**
     * @notice Returns the last entry in the owner's history.
     * @dev Reverts with a custom message if no snapshots have been recorded yet
     * @param _owner The wallet address to query
     */
    function latestSnapshot(address _owner) external view returns (Snapshot memory) {
        uint256 count = snaps[_owner].length;
        require(count > 0, "No snapshots found for this owner");
        
        // Returns the latest snapshot
        return snaps[_owner][count - 1];
    }

    /**
     * @notice Returns the total number of historic snapshots for an address
     * @param _owner The wallet address to query
     */
    function snapshotCount(address _owner) external view returns (uint256) {
        return snaps[_owner].length;
    }
}