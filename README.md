# Caesar

A self-sovereign password manager where your encrypted vault never touches a third-party server.

## Requirements

- Node.js 22+
- Docker
- Firefox

## Install

```bash
npm install -g caesar-vault
```

## Quickstart

```bash
caesar init          # Set master password, generate TLS cert, create wallet
caesar start         # Start server via Docker
caesar install-extension  # Build and load Firefox extension
```

## Architecture

```
Extension (Firefox) <--> HTTPS Express <--> MongoDB
                                      <--> Helia IPFS (embedded)
                                      <--> Ethereum Sepolia
```

- **Extension**: React 19 + Vite + Tailwind. Manages entries, autofill, TOTP, password generation.
- **Express**: Local HTTPS server on 127.0.0.1:9876. Self-signed TLS cert.
- **MongoDB**: Encrypted vault storage. Runs in Docker.
- **Helia IPFS**: Embedded IPFS node for multi-device sync. Encrypted vault blobs stored on IPFS.
- **Ethereum Sepolia**: On-chain commitment of vault hash + IPFS CID for integrity verification.

## CLI Reference

| Command | Description |
|---------|-------------|
| `caesar init` | Initialize vault, generate TLS cert, create wallet |
| `caesar start` | Start server via Docker |
| `caesar stop` | Stop server |
| `caesar sync` | Pull latest vault from IPFS and apply locally |
| `caesar install-extension` | Build and load Firefox extension |

## VaultChain CLI

The full CLI is available as `vaultchain` (or `npx tsx src/index.ts`):

| Command | Description |
|---------|-------------|
| `vaultchain init` | Initialize vault |
| `vaultchain add [--generate] [--uri]` | Add entry |
| `vaultchain get <name> [--show] [-f]` | Retrieve password |
| `vaultchain list [--json]` | List entries |
| `vaultchain update <name>` | Update entry |
| `vaultchain delete <name>` | Delete entry |
| `vaultchain search <query>` | Search entries |
| `vaultchain snapshot [--remote]` | Commit vault hash to blockchain |
| `vaultchain verify [--remote]` | Verify vault integrity |
| `vaultchain sync` | Pull vault from IPFS |
| `vaultchain serve` | Start HTTP server |

## Security Model

**What Caesar protects against:**
- Third-party server breaches (vault never leaves your machine unencrypted)
- Password reuse (built-in strength detection)
- Single point of failure (IPFS multi-device sync)

**What Caesar does NOT protect against:**
- Compromised device (if your machine is owned, the vault is too)
- Phishing (Caesar warns about known phishing sites but can't catch all)
- Brute force (rate limiting helps but Argon2id is the real defense)

## License

ISC
