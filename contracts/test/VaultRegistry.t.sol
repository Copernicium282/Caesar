// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/VaultRegistry.sol";

contract VaultRegistryTest is Test {
    VaultRegistry registry;

    function setUp() public {
        registry = new VaultRegistry();
    }

    function test_commitAndReadSnapshot() public {
        bytes32 hash = keccak256(abi.encodePacked("vault-snapshot-v1"));
        uint256 entryCount = 42;
        string memory cid = "QmTest123";

        registry.commitSnapshot(hash, entryCount, cid);

        VaultRegistry.Snapshot memory snap = registry.latestSnapshot(address(this));
        assertEq(snap.snapshotHash, hash);
        assertEq(snap.entryCount, entryCount);
        assertEq(snap.ipfsCid, cid);
        assertGt(snap.timestamp, 0);
    }

    function test_snapshotCount() public {
        assertEq(registry.snapshotCount(address(this)), 0);

        bytes32 hash = keccak256(abi.encodePacked("snap1"));
        registry.commitSnapshot(hash, 10, "QmCid1");
        assertEq(registry.snapshotCount(address(this)), 1);

        hash = keccak256(abi.encodePacked("snap2"));
        registry.commitSnapshot(hash, 20, "QmCid2");
        assertEq(registry.snapshotCount(address(this)), 2);
    }

    function test_latestSnapshot_revertsWhenEmpty() public {
        vm.expectRevert("No snapshots found for this owner");
        registry.latestSnapshot(address(this));
    }

    function test_multipleUsers() public {
        bytes32 hash = keccak256(abi.encodePacked("user-snap"));
        registry.commitSnapshot(hash, 5, "QmUser");

        address other = makeAddr("other");
        vm.prank(other);
        bytes32 otherHash = keccak256(abi.encodePacked("other-snap"));
        registry.commitSnapshot(otherHash, 10, "QmOther");

        VaultRegistry.Snapshot memory mySnap = registry.latestSnapshot(address(this));
        assertEq(mySnap.entryCount, 5);

        VaultRegistry.Snapshot memory otherSnap = registry.latestSnapshot(other);
        assertEq(otherSnap.entryCount, 10);
    }
}
