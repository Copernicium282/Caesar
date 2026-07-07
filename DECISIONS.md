# Design Decisions

## Why blockchain?

The blockchain (Ethereum Sepolia) serves two purposes:
1. **Sync coordination**: Device A pushes a vault snapshot to IPFS, commits the CID on-chain. Device B reads the CID from the chain, pulls from IPFS. The chain is the rendezvous point.
2. **Append-only audit log**: Every snapshot commit is permanently recorded. You can verify that no snapshot was tampered with by comparing the on-chain hash against the IPFS blob.

The chain is NOT a security primitive. The vault is encrypted with AES-256-GCM using a key derived from your master password via Argon2id. Even if the chain were compromised, the encrypted blob is useless without your password.

## Why ZK was considered and dropped

We initially considered ZK proofs (Noir circuits) to prove vault ownership without revealing the master password. This was dropped because:
- The server is local (127.0.0.1), so the prover and verifier are the same machine
- The wallet signature already proves ownership for a single-user threat model
- ZK adds significant complexity with no practical security benefit in this context

## Why Helia over Hypercore

- **Helia**: Protocol Labs backed, large community, stable API, IPFS ecosystem compatibility
- **Hypercore**: One-company ecosystem (Hyperspace), breaking changes between wire protocol versions, smaller community

Helia is the standard for embedded IPFS in JavaScript. It stores blocks on the local filesystem and can optionally participate in the IPFS DHT for content discovery.

## Why Ethereum Sepolia over Linea Sepolia

- **Faucet diversity**: Ethereum Sepolia has Chainlink, Alchemy, QuickNode faucets. Linea Sepolia has fewer options.
- **Tooling**: Better ethers.js support, more documentation, wider community
- **Ecosystem**: Ethereum Sepolia is the standard testnet for Ethereum L1

## TOTP colocation tradeoff

Caesar stores TOTP secrets alongside passwords. This is a deliberate tradeoff:
- **Convenience**: One tool for both passwords and 2FA codes
- **Risk**: If the device is compromised, both factors are exposed
- **Mitigation**: For high-security accounts (email, banking), use a dedicated authenticator app (Aegis, Authy) instead

This tradeoff is disclosed during `caesar init`.
