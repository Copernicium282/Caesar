import { program } from "commander";
import { initCommand } from "./commands/init.js";
import { addCommand } from "./commands/add.js";
import { getCommand } from "./commands/get.js";

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
  .description("Add a new entry")
  .action(addCommand);

const get = program
  .command("get")
  .argument("<name>", `Search name: `)
  .description("Retrieve a password")
  .action(getCommand);

await program.parseAsync();
