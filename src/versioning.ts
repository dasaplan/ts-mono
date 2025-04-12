import * as child_process from "node:child_process";
import * as console from "node:console";
import path from "node:path";
import fs from "node:fs";
import { createRequire } from "module";
import * as os from "node:os";
import { a } from "vitest/dist/chunks/suite.d.FvehnV49.js";

function changedPackages(): Array<{ packageName: string | undefined; bump: "minor" | "major" | "patch" | undefined }> | undefined {
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

  return uniqueChanges.flatMap((dirName) => {
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
    const packageName: string | undefined = data.name;
    const inferReleaseKind = inferBumpTypeFromCommit(packagePath, lastTag);
    return [{ packageName, bump: inferReleaseKind }];
  });
}

function inferBumpTypeFromCommit(packagePath: string, lastTag: string) {
  const commitMessages = child_process.execSync(`git log ${lastTag}..HEAD --oneline --pretty=format:%s -- "${packagePath}"`, {
    encoding: "utf8",
  });
  const bumpTypes = {
    patch: 0,
    minor: 1,
    major: 2,
  } as const;

  const candidates = commitMessages.split("\n").map((c) => {
    // fix: message | fix(foo): message => fix
    const severity = c
      .split(":")
      .at(0)
      ?.replace(/\(.*\)/gu, "")
      ?.trim();
    // fix => patch
    switch (severity) {
      case "chore":
      case "fix":
        return "patch";
      case "feat":
        return "minor";
      case "feat!":
      case "!feat":
        return "major";
      default:
        return undefined;
    }
  });

  let bumpType: (typeof candidates)[number] = undefined;
  for (const nextCandidate of candidates) {
    if (bumpType === "major") {
      break;
    }
    if (!bumpType && !nextCandidate) {
      continue;
    }
    if (!bumpType || !nextCandidate) {
      bumpType = nextCandidate ?? bumpType;
      continue;
    }
    const [severityAcc, severityCurr]: [number, number] = [bumpTypes[bumpType], bumpTypes[nextCandidate]];
    bumpType = severityAcc < severityCurr ? nextCandidate : bumpType;
  }

  return bumpType;
}

function createChangeset() {
  const packages = changedPackages();
  console.log({ packages });
  const markdown = `
---
${packages
  ?.filter((p) => p.bump)
  .map((pkg) => `"${pkg.packageName}": ${pkg.bump}`)
  .join("\n")}
---
  
Generated changeset from CI
  `.trim();
  fs.writeFileSync(path.resolve(".changeset", "release-changeset.md"), markdown);
}

createChangeset();
