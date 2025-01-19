import { Command } from "commander";
import { appLog } from "./logger.js";
import { formatSpec } from "./format.js";
import { File, Folder } from "@dasaplan/ts-sdk";
import * as process from "node:process";

export function createCommandFormat(program: Command) {
  program
    .command("format")
    .description("Format Openapi specified files into a single file")
    .argument("<openapi-spec>", "Absolut or Relative filepath from the cwd to the OpenApi root document file")
    .option("-o, --outputFolder [outputFolder]", "Absolut or relative filepath to the folder where all files will be written to")
    .option("-v, --verbose", "Enable verbose logging")
    .action(
      async (
        spec: string,
        options: {
          outputFolder?: string;
          verbose: boolean;
        }
      ) => {
        if (options.verbose) {
          appLog.setLogLevel("debug");
        }
        const specFile = File.of(spec);
        if (!specFile.exists()) {
          appLog.log.error(`could not find specFile: ${specFile.absolutePath}`);
          process.exit(1);
        }

        const outFolder = options.outputFolder ? Folder.of(options.outputFolder) : specFile.folder;
        const result = await withPerformance(() => formatSpec(specFile, outFolder));
        appLog.log.info(`finished bundling in ${(result.duration / 1000).toFixed(3)} s`, { outFile: result.ret.outFile });
      }
    );
}

async function withPerformance<T>(fun: () => Promise<T>) {
  const start = performance.now();
  const ret = await fun();
  const end = performance.now();
  return { duration: end - start, ret };
}
