import * as child_process from "node:child_process";

function findChanges() {
  const lastTag = child_process.execSync("git describe --tags --abbrev=0", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  console.log(lastTag);
  return lastTag;
}

function createChangeset() {
  findChanges();
}

createChangeset();
