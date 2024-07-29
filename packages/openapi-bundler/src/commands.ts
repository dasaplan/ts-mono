import { Command } from "commander";
import { appLog } from "./logger.js";
import { bundleOpenapi } from "./bundle.js";
import { createSpecProcessor } from "./post-process/index.js";

export function createCommandBundle(program: Command) {
  program
    .command("bundle")
    .description("Bundle Openapi specified files into a single file")
    .argument("<openapi-spec>", "Absolut or Relative filepath from the cwd to the OpenApi root document file")
    .option("-o, --outputFile [outputFile]", "Absolut or relative filepath to cwd of the resulting bundled file")
    .option("--disableMergeAllOf", "If set, allOf arrays will be left as is after bundling", false)
    .option("--disableEnsureDiscriminatorValues", "If set, discriminator values won't be ensured on every subType", false)
    .option("--disableXOmit", "If set, x-omit keyword won't be processed", false)
    .action(
      async (
        spec: string,
        options: {
          outputFile?: string;
          disableMergeAllOf: boolean;
          disableEnsureDiscriminatorValues: boolean;
          disableXOmit: boolean;
          verbose: boolean;
        }
      ) => {
        if (options.verbose) {
          appLog.setLogLevel("debug");
        }

        const postProcessor = createSpecProcessor({
          mergeAllOf: !options.disableMergeAllOf,
          ensureDiscriminatorValues: !options.disableEnsureDiscriminatorValues,
          xOmit: !options.disableXOmit,
        });
        const result = await withPerformance(() => bundleOpenapi(spec, { postProcessor, outFile: options.outputFile }));
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
