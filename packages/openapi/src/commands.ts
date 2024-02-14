import { Command } from "commander";
import { bundle, generateOpenapi, generateTsAxios, generateZod } from "./generate.js";
import { log } from "./logger.js";
import { bundleOpenapi } from "./bundle.js";
import { createSpecProcessor } from "./post-process/index.js";

export function createCommandGenerate(program: Command) {
  program
    .command("generate")
    .description("Generate Typescript and Zod files from an Openapi specified file")
    .argument("<openapi-spec>", "Relative filepath from the current cwd to the OpenApi root document file")
    .option("-o, --output [output]", "Target directory where the generated files will appear", "out")
    .action(async (spec: string, options: { output: string }) => {
      const result = await withPerformance(() => generateOpenapi(spec, options.output));
      log.info(`finished generate in ${(result.duration / 1000).toFixed(3)} s`, result.ret);
    });
}

export function createCommandGenerateTs(program: Command) {
  program
    .command("generate-ts-axios")
    .description("Generate typescript source code")
    .argument("<openapi-spec>", "Relative filepath from the current cwd to the OpenApi root document file")
    .option("-o, --output [output]", "Target directory for the generated files", "out")
    .action(async (spec: string, options: { output: string }) => {
      const result = await withPerformance(() => generateTsAxios(spec, options.output, { generateZod: false }));
      log.info(`finished generate in ${(result.duration / 1000).toFixed(3)} s`, result.ret);
    });
}

export function createCommandGenerateZod(program: Command) {
  program
    .command("generate-zod")
    .description("Generate Zod schemas")
    .argument("<openapi-spec>", "Relative filepath from the current cwd to the OpenApi root document file")
    .option("-o, --output [output]", "Target directory for the generated files", "out")
    .action(async (spec: string, options: { output: string }) => {
      const { parsed } = await bundle(spec);
      const result = await withPerformance(() => generateZod(parsed, options.output, { includeTsTypes: false }));
      log.info(`finished generate in ${(result.duration / 1000).toFixed(3)} s`, result.ret);
    });
}

export function createCommandBundle(program: Command) {
  program
    .command("bundle")
    .description("Bundle Openapi specified files into a single file")
    .argument("<openapi-spec>", "Absolut or Relative filepath from the cwd to the OpenApi root document file")
    .option("-o, --outputFile [outputFile]", "Absolut or relative filepath to cwd of the resulting bundled file")
    .option("--disableMergeAllOf", "If set, allOf arrays will be left as is after bundling")
    .option("--disableEnsureDiscriminatorValues", "If set, discriminator values won't be ensured on every subType")
    .action(async (spec: string, options: { outputFile?: string; disableMergeAllOf?: boolean; disableEnsureDiscriminatorValues?: boolean }) => {
      const postProcessor = createSpecProcessor({
        mergeAllOf: options.disableMergeAllOf ?? true,
        ensureDiscriminatorValues: options.disableEnsureDiscriminatorValues ?? true,
      });
      const result = await withPerformance(() => bundleOpenapi(spec, { postProcessor, outFile: options.outputFile }));
      log.info(`finished generate in ${(result.duration / 1000).toFixed(3)} s`, result.ret);
    });
}

async function withPerformance<T>(fun: () => Promise<T>) {
  const start = performance.now();
  const ret = await fun();
  const end = performance.now();
  return { duration: end - start, ret };
}
