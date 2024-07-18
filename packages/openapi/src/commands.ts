import { Command } from "commander";
import { generateOpenapi, generateTsAxios } from "./generate.js";
import { appLog } from "./logger.js";

export function createCommandGenerate(program: Command) {
  program
    .command("generate")
    .description("Generate Typescript and Zod files from an Openapi specified file")
    .argument("<openapi-spec>", "Relative filepath from the current cwd to the OpenApi root document file")
    .option("-o, --output [output]", "Target directory where the generated files will appear", "out")
    .action(async (spec: string, options: { output: string }) => {
      await generateOpenapi(spec, options.output);
      appLog.log.info(`finished generate`);
    });
}

export function createCommandGenerateTs(program: Command) {
  program
    .command("generate-ts-axios")
    .description("Generate typescript source code")
    .argument("<openapi-spec>", "Relative filepath from the current cwd to the OpenApi root document file")
    .option("-o, --output [output]", "Target directory for the generated files", "out")
    .action(async (spec: string, options: { output: string }) => {
      await generateTsAxios(spec, options.output, { generateZod: false });
      appLog.log.info(`finished generate`);
    });
}
