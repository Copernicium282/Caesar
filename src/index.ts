import { program } from "commander";
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

const VCv1 = program
  .name("vaultchain")
  .description("CLI password manager")
  .version("0.1.0");

const init = program
  .command("init")
  .description("Initialize Vault with a Master Password")
  .action(initCommand);

const add = program
  .command("add")
  .option(
    "-g, --generate [length]",
    "Generate a random password of configurable length",
  )
  .description("Add a new entry")
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
  .description("Unlock the vault and create a session")
  .action(unlockCommand);

const lock = program
  .command("lock")
  .description("Clear the current session")
  .action(lockCommand);

await program.parseAsync();
