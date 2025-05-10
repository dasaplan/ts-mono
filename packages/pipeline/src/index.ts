import { ApplicationError } from "@dasaplan/ts-sdk";
import { execaCommandSync } from "execa";

export namespace Pipeline {
  /** run a script / command on all changed packages since a change on master */
  export function onChangedSinceMain(cmd: string) {
    return `pnpm --filter "...[origin/main]" ${cmd}`;
  }

  export function onChangedSinceLastCommit(cmd: string) {
    const lastCommitHash = execaCommandSync("git r-rse HEAD~1", { encoding: "utf8" });
    if (lastCommitHash.stderr && lastCommitHash.stderr !== "")
      throw ApplicationError.create("failed fetching last commit hash").chainUnknown(lastCommitHash.stderr);
    return `pnpm --filter "...[${lastCommitHash.stdout}]" ${cmd}`;
  }
}
