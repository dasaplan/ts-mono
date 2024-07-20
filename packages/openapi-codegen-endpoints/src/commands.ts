import { Command } from "commander";
import { generateEndpointDefinitions } from "./endpoint-generator.js";

export function createCommandGenerateEndpoints(program: Command) {
  program
    .command("generate-endpoints")
    .description("Generate Openapi Endpoint interfaces")
    .argument("<openapi-spec>", "Relative filepath from the current cwd to the OpenApi root document file")
    .option("-o, --out [out]", "Target directory for the generated files", "out")
    .option("--suffix [suffix]", "Schema name suffix")
    .option("--templates [templates]", "Temporary directory which can be deleted", "tmp")
    .action(async (spec: string, options: { out: string; templates: string; suffix: string }) => {
      await generateEndpointDefinitions(spec, {
        templatesDir: options.templates,
        outDir: options.out,
        typeSuffix: options.suffix,
      });
    });
}
