import * as child_process from "node:child_process";
import * as console from "node:console";
import path from "node:path";
import fs from "node:fs";
import { createRequire } from "module";

function changedPackages() {
  const lastTag = child_process.execSync("git describe --tags --abbrev=0", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  console.log({ lastTag });
  const changedFiles = child_process.execSync(`git log ${lastTag}..HEAD --name-only --oneline`, {
    encoding: "utf8",
  });

  if (changedFiles.length <= 0) {
    console.log("no changes found");
    return;
  }

  const changes = changedFiles
    .split("\n")
    ?.filter((line) => line.startsWith("packages"))
    .map((line) => line.split("/").at(1));
  const uniqueChanges = Array.from(new Set(changes));

  const changedPackages = uniqueChanges.flatMap((pkg) => {
    if (!pkg) {
      return [];
    }
    const packageJson = path.resolve("packages", pkg ?? "", "package.json");
    if (!fs.existsSync(packageJson)) {
      return [];
    }
    const require = createRequire(import.meta.url);
    const data = require(packageJson);
    return [data.name];
  });
  console.log({ changedPackages });
  return changedPackages;
}

function createChangeset() {
  changedPackages();
}

createChangeset();
