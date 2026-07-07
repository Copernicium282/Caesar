#!/usr/bin/env node
import { program } from "commander";
import { execSync } from "node:child_process";
import { initCommand } from "../src/commands/init.js";
import { syncCommand } from "../src/commands/sync.js";
import { certExists } from "../src/crypto/tls.js";
import { loadConfig } from "../src/config/config.js";

const caesar = program
  .name("caesar")
  .description("Caesar - self-sovereign password manager")
  .version("0.1.0");

caesar
  .command("init")
  .description("Initialize vault, generate TLS cert, create wallet")
  .action(async () => {
    await initCommand();
    console.log("\nNext steps:");
    console.log("1. Fund your wallet with Sepolia ETH from one of these faucets:");
    console.log("   - https://faucets.chain.link");
    console.log("   - https://sepoliafaucet.com");
    console.log("   - https://faucet.quicknode.com");
    console.log("2. Run 'caesar start' to start the server");
    console.log("3. Run 'caesar install-extension' to build and load the extension");
    console.log("\nNote: Caesar can store and generate TOTP codes alongside your passwords.");
    console.log("This is convenient but means both factors live on the same device.");
    console.log("For maximum security, use a dedicated authenticator app (Aegis, Authy).");
  });

caesar
  .command("start")
  .description("Start Caesar server via Docker")
  .action(() => {
    try {
      execSync("docker-compose up -d", { stdio: "inherit" });
      console.log("\nCaesar server is running on https://127.0.0.1:9876");
      console.log("Load the extension in Firefox from about:debugging#/runtime/this-firefox");
    } catch {
      console.error("Failed to start Docker services. Is Docker running?");
      process.exit(1);
    }
  });

caesar
  .command("stop")
  .description("Stop Caesar server")
  .action(() => {
    try {
      execSync("docker-compose down", { stdio: "inherit" });
      console.log("Caesar server stopped.");
    } catch {
      console.error("Failed to stop Docker services.");
      process.exit(1);
    }
  });

caesar
  .command("sync")
  .description("Pull latest vault from IPFS and apply locally")
  .action(syncCommand);

caesar
  .command("install-extension")
  .description("Build Firefox extension and print load instructions")
  .action(() => {
    try {
      console.log("Building extension...");
      execSync("cd extension-ui && npm run build", { stdio: "inherit" });
      console.log("\nExtension built: extension-ui/dist/");
      console.log("\nTo load in Firefox:");
      console.log("1. Open about:debugging#/runtime/this-firefox");
      console.log("2. Click 'Load Temporary Add-on'");
      console.log("3. Select extension-ui/dist/manifest.json");
      console.log("\nNote: Visit https://127.0.0.1:9876 in Firefox first to accept the self-signed cert.");
    } catch {
      console.error("Failed to build extension.");
      process.exit(1);
    }
  });

caesar.parse();
