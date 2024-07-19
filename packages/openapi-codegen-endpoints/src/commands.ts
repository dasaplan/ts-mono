import { Command } from "commander";
import { bundleParseOpenapi } from "@dasaplan/openapi-bundler";
import { generateEndpointDefinitions } from "./endpoint-generator.js";

export function createCommandGenerateEndpoints(program: Command) {
  program
    .command("generate-endpoints")
    .description("Generate Zod schemas")
    .argument("<openapi-spec>", "Relative filepath from the current cwd to the OpenApi root document file")
    .option("-o, --out [out]", "Target directory for the generated files", "out")
    .option("-t, --temp [temp]", "Template directory used to generate source code")
    .option("--templates [templates]", "Temporary directory which can be deleted", "tmp")
    .action(async (spec: string, options: { out: string; tmp: string; templates: string }) => {
      const parsed = await bundleParseOpenapi(spec, {
        mergeAllOf: true,
        ensureDiscriminatorValues: true,
      });
      await generateEndpointDefinitions(parsed, {
        templatesDir: options.templates,
        outDir: options.out,
      });
    });
}
