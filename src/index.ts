#!/usr/bin/env node
import { program } from "commander";
import { execSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import { initCommand } from "./commands/init.js";
import { addCommand } from "./commands/add.js";
import { getCommand } from "./commands/get.js";
import { listCommand } from "./commands/list.js";
import { updateCommand } from "./commands/update.js";
import { deleteCommand } from "./commands/delete.js";
import { searchCommand } from "./commands/search.js";
import { backupSalt } from "./commands/backup-salt.js";
import { restoreSalt } from "./commands/restore-salt.js";
import { unlockCommand } from "./commands/unlock.js";
import { lockCommand } from "./commands/lock.js";
import { walletGenerate, walletAddress } from "./commands/wallet.js";
import { snapshotCommand } from "./commands/snapshot.js";
import { verifyCommand } from "./commands/verify.js";
import { serveCommand } from "./commands/serve.js";
import { exportCommand } from "./commands/export.js";
import { importCommand } from "./commands/import.js";
import { syncCommand } from "./commands/sync.js";
import { restoreCommand } from "./commands/restore.js";
import { permanentDeleteCommand } from "./commands/permanent-delete.js";
import { trashCommand } from "./commands/trash.js";
import { purgeTrashCommand } from "./commands/purge-trash.js";
import { favoriteCommand } from "./commands/favorite.js";
import { historyCommand } from "./commands/history.js";
import { totpCommand } from "./commands/totp.js";
import { folderListCommand, folderCreateCommand, folderDeleteCommand } from "./commands/folders.js";
import { changePasswordCommand } from "./commands/change-password.js";

const VCv1 = program
  .name("caesar")
  .description("CLI password manager")
  .version("0.1.0");

function detectBrowser(): string {
  const zenConfigPaths = [
    path.join(process.env.HOME || "", ".zen"),
    path.join(process.env.HOME || "", ".config", "zen"),
  ];
  for (const p of zenConfigPaths) {
    if (fs.existsSync(p)) {
      const zenBin = findZenBinary();
      if (zenBin) return zenBin;
      return "zen";
    }
  }
  return "firefox";
}

function findZenBinary(): string | null {
  const candidates = ["/usr/bin/zen-browser", "/usr/bin/zen", "/usr/local/bin/zen-browser"];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  try {
    return execSync("which zen-browser 2>/dev/null || which zen 2>/dev/null", { encoding: "utf-8" }).trim() || null;
  } catch { return null; }
}

const init = program
  .command("init")
  .description("Initialize Vault with a Master Password and TLS certificate")
  .addHelpText("after", `
Example:
  $ caesar init
  Initializes the vault, generates a TLS certificate, and tests MongoDB connection.`)
  .action(initCommand);

const add = program
  .command("add")
  .option(
    "-g, --generate [length]",
    "Generate a random password of configurable length (default: 20)",
  )
  .option("--uri <uri...>", "Domain URIs for this entry (repeatable)")
  .description("Add a new entry")
  .addHelpText("after", `
Examples:
  $ caesar add --generate --uri github.com
  Add entry with auto-generated password for GitHub.

  $ caesar add -g 32 --uri mail.google.com --uri google.com
  Add entry with 32-char password for multiple Google domains.`)
  .action(addCommand);

const get = program
  .command("get")
  .option("--show", "Print password to stdout instead of clipboard")
  .option(
    "-f, --field <field>",
    "Get a specific field (name, username, url, notes)",
  )
  .argument("<name>", `Search name: `)
  .description("Retrieve a password")
  .action(getCommand);

const list = program
  .command("list")
  .option("--json", "Output as JSON")
  .description("Lists all entries")
  .action(listCommand);

const update = program
  .command("update")
  .argument("<name>", "Entry name")
  .description("Update an entry")
  .action(updateCommand);

const del = program
  .command("delete")
  .argument("<name>", "Entry name")
  .description("Delete an entry")
  .action(deleteCommand);

const search = program
  .command("search")
  .argument("<query>", "Search term")
  .description("Search entries")
  .action(searchCommand);

const backup_salt = program
  .command("backup-salt")
  .argument("<path>", "Path to save Salt Backup at")
  .description("Save a Backup of salt at specified path")
  .action(backupSalt);

const restore_salt = program
  .command("restore-salt")
  .argument("<path>", "Path to Restore Salt Backup from")
  .description("Restore salt from a Salt Backup at specified path")
  .action(restoreSalt);

const unlock = program
  .command("unlock")
  .description("Unlock the vault and create a session (valid for 15 minutes)")
  .addHelpText("after", `
Example:
  $ caesar unlock
  Prompts for master password, prints session token and export command.`)
  .action(unlockCommand);

const lock = program
  .command("lock")
  .description("Clear the current session")
  .action(lockCommand);

const wallet = program
  .command("wallet")
  .description("Manage Caesar Ethereum wallet");

wallet
  .command("generate")
  .description("Generate a new wallet")
  .action(walletGenerate);

wallet
  .command("address")
  .description("Show wallet address")
  .action(walletAddress);

const snapshot = program
  .command("snapshot")
  .option("--remote", "Also commit to Ethereum Sepolia")
  .description("Commit a snapshot of the vault to the blockchain")
  .action(snapshotCommand);

const verify = program
  .command("verify")
  .option("--remote", "Verify against Ethereum Sepolia instead of local")
  .description("Verify vault integrity against last committed snapshot")
  .action(verifyCommand);

const sync = program
  .command("sync")
  .description("Pull latest vault snapshot from IPFS and apply locally")
  .addHelpText("after", `
Example:
  $ caesar sync
  Fetches the latest vault blob from IPFS, decrypts it, shows a diff, and applies changes after confirmation.`)
  .action(syncCommand);

const serve = program
  .command("serve")
  .description("Start the HTTPS server for the Firefox extension (requires TLS cert)")
  .addHelpText("after", `
Example:
  $ caesar serve
  Starts Express on https://127.0.0.1:9876. Requires a TLS certificate (generated by 'caesar init').`)
  .action(serveCommand);

const exportCmd = program
  .command("export")
  .option("-f, --format <format>", "Export format (json or csv)", "json")
  .option("-o, --output <path>", "Output file path")
  .description("Export vault to JSON or CSV")
  .action(exportCommand);

const importCmd = program
  .command("import")
  .option("-f, --format <format>", "Import format (json or csv)")
  .argument("<input>", "Input file path")
  .description("Import vault from JSON or CSV")
  .action(importCommand);

program
  .command("restore")
  .argument("<name>", "Entry name")
  .description("Restore an entry from trash")
  .action(restoreCommand);

program
  .command("permanent-delete")
  .argument("<name>", "Entry name")
  .description("Permanently delete an entry")
  .action(permanentDeleteCommand);

program
  .command("trash")
  .description("List entries in trash")
  .action(trashCommand);

program
  .command("purge-trash")
  .description("Delete entries in trash older than 30 days")
  .action(purgeTrashCommand);

program
  .command("favorite")
  .argument("<name>", "Entry name")
  .description("Toggle favorite status")
  .action(favoriteCommand);

program
  .command("history")
  .argument("<name>", "Entry name")
  .description("Show password history")
  .action(historyCommand);

program
  .command("totp")
  .argument("<name>", "Entry name")
  .description("Show current TOTP code")
  .action(totpCommand);

const folderCmd = program
  .command("folder")
  .description("Manage folders");

folderCmd
  .command("list")
  .description("List all folders")
  .action(folderListCommand);

folderCmd
  .command("create")
  .argument("<name>", "Folder name")
  .description("Create a folder")
  .action(folderCreateCommand);

folderCmd
  .command("delete")
  .argument("<name>", "Folder name")
  .description("Delete a folder")
  .action(folderDeleteCommand);

program
  .command("change-password")
  .description("Change master password")
  .action(changePasswordCommand);

program
  .command("start")
  .description("Start Caesar server via Docker")
  .action(() => {
    try {
      execSync("docker compose up -d", { stdio: "inherit" });
      console.log("\nCaesar server is running on https://127.0.0.1:9876");
      console.log("Load the extension in Firefox from about:debugging#/runtime/this-firefox");
    } catch {
      console.error("Failed to start Docker services. Is Docker running?");
      process.exit(1);
    }
  });

program
  .command("stop")
  .description("Stop Caesar server")
  .action(() => {
    try {
      execSync("docker compose down", { stdio: "inherit" });
      console.log("Caesar server stopped.");
    } catch {
      console.error("Failed to stop Docker services.");
      process.exit(1);
    }
  });

program
  .command("install-extension")
  .description("Build Firefox extension and print load instructions")
  .action(() => {
    try {
      console.log("Building extension...");
      execSync("cd extension-ui && npm run build", { stdio: "inherit" });
      console.log("\nExtension built: extension-ui/dist/");
      try {
        execSync("cd extension-ui && npx web-ext build -s dist -a artifacts --overwrite-dest", { stdio: "inherit" });
        console.log("Packaged: extension-ui/artifacts/");
      } catch {
        console.log("(web-ext packaging skipped)");
      }
      console.log("\nTo load in Firefox:");
      console.log("1. Open about:debugging#/runtime/this-firefox");
      console.log("2. Click 'Load Temporary Add-on'");
      console.log("3. Select extension-ui/dist/manifest.json");
    } catch {
      console.error("Failed to build extension.");
      process.exit(1);
    }
  });

program
  .command("launch")
  .description("Open Firefox/Zen with the extension auto-loaded (requires web-ext)")
  .option("-b, --browser <browser>", "Browser to launch (firefox or zen)", detectBrowser())
  .action((opts) => {
    const composeFile = path.resolve(process.cwd(), "docker-compose.yml");
    try {
      execSync("docker compose up -d", { stdio: "inherit", cwd: path.dirname(composeFile) });
    } catch {
      console.error("Failed to start Docker services. Is Docker running?");
      process.exit(1);
    }
    console.log("Server starting...\n");
    try {
      execSync(`cd extension-ui && npx web-ext run -s dist --firefox=${opts.browser}`, { stdio: "inherit" });
    } catch {
      console.error(`\nFailed to launch ${opts.browser}. Install web-ext: cd extension-ui && npm install`);
      process.exit(1);
    }
  });

await program.parseAsync();
