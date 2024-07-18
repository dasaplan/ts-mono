import { Command } from "commander";
import { bundle, generateOpenapi, generateTsAxios, generateZod } from "./generate.js";
import { appLog } from "./logger.js";

export function createCommandGenerate(program: Command) {
  program
    .command("generate")
    .description("Generate Typescript and Zod files from an Openapi specified file")
    .argument("<openapi-spec>", "Relative filepath from the current cwd to the OpenApi root document file")
    .option("-o, --output [output]", "Target directory where the generated files will appear", "out")
    .action(async (spec: string, options: { output: string }) => {
      const result = await withPerformance(() => generateOpenapi(spec, options.output));
      appLog.log.info(`finished generate in ${(result.duration / 1000).toFixed(3)} s`, result.ret);
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
      appLog.log.info(`finished generate in ${(result.duration / 1000).toFixed(3)} s`, result.ret);
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
      appLog.log.info(`finished generate in ${(result.duration / 1000).toFixed(3)} s`, result.ret);
    });
}

async function withPerformance<T>(fun: () => Promise<T>) {
  const start = performance.now();
  const ret = await fun();
  const end = performance.now();
  return { duration: end - start, ret };
}
