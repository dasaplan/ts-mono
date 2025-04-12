import * as child_process from "node:child_process";
import * as console from "node:console";
import path from "node:path";
import fs from "node:fs";
import { createRequire } from "module";
import * as os from "node:os";

function inferReleaseKindFromCommit(packagePath: string, lastTag: string) {
  const commitMessages = child_process.execSync(`git log ${lastTag}..HEAD --oneline --pretty=format:%s -- "${packagePath}"`, {
    encoding: "utf8",
  });
  const res = commitMessages.split("\n").map((c) => {
    const severity = c.split(":").at(0);
    switch (severity) {
      case "chore":
      case "fix":
        return "PATCH";
      case "feat":
      case "feat!":
      case "!feat":
        return severity;
      default:
        return undefined;
    }
  });
  console.log({ commitMessages: res });
}

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

  const changedPackages = uniqueChanges.flatMap((dirName) => {
    if (!dirName) {
      return [];
    }
    const packagePath = path.resolve("packages", dirName ?? "");
    const packageJson = path.resolve(packagePath, "package.json");
    if (!fs.existsSync(packageJson)) {
      return [];
    }
    const require = createRequire(import.meta.url);
    const data = require(packageJson);
    const packageName = data.name;
    const inferReleaseKind = inferReleaseKindFromCommit(packagePath, lastTag);
    return [packageName];
  });
  console.log({ changedPackages });
  return changedPackages;
}

function createChangeset() {
  changedPackages();
}

createChangeset();
