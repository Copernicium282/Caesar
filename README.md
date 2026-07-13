# Caesar

A self-sovereign password manager where your encrypted vault never touches a third-party server.

## Requirements

- Node.js 22+
- Docker
- Firefox

## Install

```bash
git clone <repo-url> && cd VaultChain
./scripts/install.sh
```

The installer checks dependencies, builds and installs Caesar globally, initializes your vault, starts the server, and builds the Firefox extension — all in one command.

### Uninstall

```bash
./scripts/uninstall.sh
```

## Quickstart

```bash
caesar init                # Set master password, generate TLS cert, create wallet
caesar start               # Start server via Docker
caesar install-extension   # Build and load Firefox extension
```

## Architecture

```
Extension (Firefox) <--> HTTPS Express <--> MongoDB
                                       <--> Helia IPFS (embedded)
                                       <--> Ethereum Sepolia
```

- **Extension**: React 19 + Vite + Tailwind. Manages entries, autofill, TOTP, password generation.
- **Express**: Local HTTPS server on 127.0.0.1:9876. Self-signed TLS cert via mkcert.
- **MongoDB**: Encrypted vault storage. Runs in Docker.
- **Helia IPFS**: Embedded IPFS node for multi-device sync. Encrypted vault blobs stored on IPFS.
- **Ethereum Sepolia**: On-chain commitment of vault hash + IPFS CID for integrity verification.

## TLS / Certificates

Caesar uses `mkcert` to generate a CA-signed certificate during `caesar init`. This means no manual browser exception is needed — Firefox trusts the cert natively. If mkcert fails, falls back to `selfsigned` (requires manual exception).

## CLI Reference (30 commands)

### Vault Management

| Command | Description |
|---------|-------------|
| `caesar init` | Initialize vault, generate TLS cert, create wallet |
| `caesar unlock` | Unlock vault and create a 15-minute session |
| `caesar lock` | Clear the current session |
| `caesar change-password` | Change master password |

### Entries

| Command | Description |
|---------|-------------|
| `caesar add [--generate] [--uri]` | Add a new entry |
| `caesar get <name> [--show] [-f]` | Retrieve a password or field |
| `caesar list [--json]` | List all entries |
| `caesar update <name>` | Update entry fields |
| `caesar search <query>` | Search entries by name/username/url/notes |
| `caesar favorite <name>` | Toggle favorite status |
| `caesar history <name>` | Show password history |
| `caesar totp <name>` | Show current TOTP code |

### Trash

| Command | Description |
|---------|-------------|
| `caesar delete <name>` | Soft delete entry (moves to trash) |
| `caesar restore <name>` | Restore entry from trash |
| `caesar permanent-delete <name>` | Permanently delete entry |
| `caesar trash` | List entries in trash |
| `caesar purge-trash` | Delete entries in trash older than 30 days |

### Folders

| Command | Description |
|---------|-------------|
| `caesar folder list` | List all folders |
| `caesar folder create <name>` | Create a folder |
| `caesar folder delete <name>` | Delete a folder |

### Import / Export

| Command | Description |
|---------|-------------|
| `caesar export [-f json\|csv] [-o]` | Export vault |
| `caesar import [-f json\|csv] <file>` | Import vault (max 10k entries) |

### Blockchain & Sync

| Command | Description |
|---------|-------------|
| `caesar snapshot [--remote]` | Commit vault hash + IPFS blob to blockchain |
| `caesar verify [--remote]` | Verify vault integrity |
| `caesar sync` | Pull vault from IPFS and apply locally |

### Wallet

| Command | Description |
|---------|-------------|
| `caesar wallet generate` | Generate Ethereum wallet |
| `caesar wallet address` | Show wallet address |

### Backup & Utilities

| Command | Description |
|---------|-------------|
| `caesar backup-salt <path>` | Backup Argon2 salt |
| `caesar restore-salt <path>` | Restore Argon2 salt |
| `caesar serve` | Start HTTPS server |

### Docker

| Command | Description |
|---------|-------------|
| `caesar start` | Start server via Docker |
| `caesar stop` | Stop server |
| `caesar install-extension` | Build Firefox extension and print load instructions |

## Security Model

**What Caesar protects against:**
- Third-party server breaches (vault never leaves your machine unencrypted)
- Password reuse (built-in zxcvbn strength detection)
- Single point of failure (IPFS multi-device sync)
- CSRF from web pages (X-Caesar-Client header requirement)
- Empty vault brute force (verification blob validates password even with no entries)

**What Caesar does NOT protect against:**
- Compromised device (if your machine is owned, the vault is too)
- Phishing (Caesar warns about known phishing sites but can't catch all)
- Brute force (rate limiting helps but Argon2id is the real defense)

## Server Endpoints (37)

All authenticated endpoints require `Authorization: Bearer <token>` and `X-Caesar-Client: cli` headers.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/unlock` | Authenticate, create session (rate limited) |
| POST | `/lock` | Clear session |
| GET | `/entries` | List non-deleted entries |
| POST | `/entries` | Create entry |
| PUT | `/entries/:name` | Update entry |
| DELETE | `/entries/:name` | Soft delete entry |
| DELETE | `/entries/:name/permanent` | Hard delete entry |
| POST | `/entries/:name/restore` | Restore from trash |
| PUT | `/entries/:name/favorite` | Toggle favorite |
| GET | `/entries/:name/history` | Password history |
| GET | `/entries/:name/totp` | Get TOTP code |
| PUT | `/entries/:name/totp` | Save TOTP secret |
| DELETE | `/entries/:name/totp` | Remove TOTP |
| GET | `/entries/:name/password` | Decrypt password |
| GET | `/entries/match?url=<url>` | Match URL to entries |
| GET | `/entries/search?q=<query>` | Search entries |
| GET | `/folders` | List folders |
| POST | `/folders` | Create folder |
| PUT | `/folders/:id` | Rename folder |
| DELETE | `/folders/:id` | Delete folder |
| GET | `/trash` | List deleted entries |
| POST | `/trash/purge` | Purge old trash |
| GET | `/generate?length=N` | Generate password |
| GET | `/generate/passphrase` | Generate passphrase |
| POST | `/generate/history` | Save generation history |
| GET | `/generate/history` | Get generation history |
| DELETE | `/generate/history` | Clear generation history |
| POST | `/change-password` | Change master password |
| GET | `/vault-health` | Check weak/reused passwords |
| GET | `/snapshot/status` | Get vault hash |
| POST | `/snapshot` | Compute vault hash |
| POST | `/verify` | Verify vault integrity |
| POST | `/sync` | Push encrypted vault to IPFS |
| POST | `/export` | Export vault (JSON/CSV) |
| POST | `/import` | Import vault |
| GET | `/export/cli` | CLI export endpoint |

## License

ISC
