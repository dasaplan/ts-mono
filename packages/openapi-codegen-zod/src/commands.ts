import { Command } from "commander";
import { generateZodSchemas } from "./index.js";
import { bundleParseOpenapi } from "@dasaplan/openapi-bundler";

export function createCommandGenerateZod(program: Command) {
  program
    .command("generate-zod")
    .description("Generate Zod schemas")
    .argument("<openapi-spec>", "Relative filepath from the current cwd to the OpenApi root document file")
    .option("-o, --output [output]", "Target directory for the generated files", "out")
    .option("-t, --temp [temp]", "Temporary directory which can be deleted", "out")
    .action(async (spec: string, options: { output: string }) => {
      const parsed = await bundleParseOpenapi(spec, {
        mergeAllOf: true,
        ensureDiscriminatorValues: true,
      });
      await generateZodSchemas(parsed, options.output, { includeTsTypes: false });
    });
}
