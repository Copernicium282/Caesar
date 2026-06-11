import { stdin, stdout } from "node:process";

function cleanup() {
  stdin.setRawMode(false);
  stdin.pause();
}

function readPassword(promptText: string): Promise<string> {
  return new Promise((resolve) => {
    stdout.write(promptText);
    let inputBuffer = "";
    const onData = (key: string) => {
      const char = key.toString();
      // handle ctrl+c
      if (char === "\u0003") {
        cleanup();
        process.exit(0);
      }
      // handle enter
      if (char === "\r" || char === "\n") {
        stdin.removeListener("data", onData);
        resolve(inputBuffer);
        return;
      }
      // handle backspace
      if (char === "\u0008" || char === "\u007f") {
        if (inputBuffer.length > 0) {
          inputBuffer = inputBuffer.slice(0, -1);
          stdout.write("\b \b");
        }
        return;
      }
      // handle other char
      if (char.length > 1 || char < " ") return;
      inputBuffer += char;
      stdout.write("*");
    };
    stdin.on("data", onData);
  });
}

export async function promptMasterPassword(confirm?: boolean): Promise<string> {
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding("utf-8");

  const password = await readPassword("Enter master password: ");
  if (confirm) {
    const confirmPassword = await readPassword("Confirm master password: ");
    stdin.pause();
    if (password !== confirmPassword) {
      throw new Error("Passwords do not match");
    }
  }
  stdin.pause();
  return password;
}
