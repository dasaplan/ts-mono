import { spawn as spwn } from "child_process";

export namespace CommandLine {
  /** https://stackoverflow.com/a/72863312/18155601 */
  export function spawn(cmd: string, args: ReadonlyArray<string>): Promise<string> {
    return new Promise((resolve, reject) => {
      const cp = spwn(cmd, args, { shell: true });
      const error: string[] = [];
      const stdout: string[] = [];
      cp.stdout.on("data", (data) => {
        stdout.push(data.toString());
      });

      cp.on("error", (e) => {
        error.push(e.toString());
      });

      cp.on("close", () => {
        if (error.length) reject(error.join(""));
        else resolve(stdout.join(""));
      });
    });
  }
}
