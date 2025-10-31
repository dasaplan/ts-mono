import { Command } from "commander";
import { appLog } from "./logger.js";
import { bundleOpenapi, RedoclyDecorators } from "./bundle.js";
import { createSpecProcessor } from "./post-process/index.js";

function parseFilterOption(value: string, prev: undefined | { type: string; values: Array<string> }) {
  switch (value) {
    case "tags":
      return { type: value, values: [] };
    case "operationId":
      return { type: value, values: [] };
  }

  if (!prev) {
    throw new Error("Invalid arguments provided for --filter - ensure usage e.g. --filter tags value1 value2");
  }

  return { type: prev.type, values: [...prev.values, value] };
}

export function createCommandBundle(program: Command) {
  program
    .command("bundle")
    .description("Bundle Openapi specified files into a single file")
    .argument("<openapi-spec>", "Absolut or Relative filepath from the cwd to the OpenApi root document file")
    .option("-o, --outputFile [outputFile]", "Absolut or relative filepath to cwd of the resulting bundled file")
    .option("--forceMergeAllOf", "If set, allOf arrays will be entirely merged. Discriminator may be overridden.", false)
    .option("--disableMergeAllOf", "If set, allOf arrays will be left as is after bundling", false)
    .option("--disableEnsureDiscriminatorValues", "If set, discriminator values won't be ensured on every subType", false)
    .option("--disableXOmit", "If set, x-omit keyword won't be processed", false)
    .option("--disableXPick", "If set, x-pick keyword won't be processed", false)
    .option("--filterIn <field> <values...>", "filter-in by 'tag' or 'operationId' followed by one or more values", parseFilterOption)
    .option("--filterOut <field> <values...>", "filter-out by 'tag' or 'operationId' followed by one or more values", parseFilterOption)
    .action(
      async (
        spec: string,
        options: {
          outputFile?: string;
          disableMergeAllOf: boolean;
          disableEnsureDiscriminatorValues: boolean;
          disableXOmit: boolean;
          disableXPick: boolean;
          forceMergeAllOf: boolean;
          verbose: boolean;
          filterIn?: { type: "tags" | "operationId"; values: Array<string> };
          filterOut?: { type: "tags" | "operationId"; values: Array<string> };
        },
      ) => {
        if (options.verbose) {
          appLog.setLogLevel("debug");
        }

        const filter: RedoclyDecorators | undefined = options.filterIn || options.filterOut ? {} : undefined;
        if (filter && options.filterIn) {
          filter["filter-in"] = { property: options.filterIn.type, value: options.filterIn.values, matchStrategy: "any" };
        }
        if (filter && options.filterOut) {
          filter["filter-out"] = { property: options.filterOut.type, value: options.filterOut.values, matchStrategy: "any" };
        }

        if (filter) {
          appLog.log.info(`provided fiter: ${JSON.stringify(filter)}`);
        }

        const postProcessor = createSpecProcessor({
          mergeAllOf: !options.disableMergeAllOf,
          ensureDiscriminatorValues: !options.disableEnsureDiscriminatorValues,
          xOmit: !options.disableXOmit,
          xPick: !options.disableXPick,
          processorOptions: { forceMerge: options.forceMergeAllOf },
        });

        const result = await withPerformance(() => bundleOpenapi(spec, { postProcessor, outFile: options.outputFile, filter }));
        appLog.log.info(`finished bundling in ${(result.duration / 1000).toFixed(3)} s`, { outFile: result.ret.outFile });
      },
    );
}

async function withPerformance<T>(fun: () => Promise<T>) {
  const start = performance.now();
  const ret = await fun();
  const end = performance.now();
  return { duration: end - start, ret };
}
