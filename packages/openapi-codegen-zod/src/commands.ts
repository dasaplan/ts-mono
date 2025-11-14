import { Command } from "commander";
import { generateZodSchemas } from "./index.js";
import { bundleParseOpenapi } from "@dasaplan/openapi-bundler";
import { appLog } from "./logger.js";

export function createCommandGenerateZod(program: Command) {
  program
    .command("generate-zod")
    .description("Generate Zod schemas")
    .argument("<openapi-spec>", "Relative filepath from the current cwd to the OpenApi root document file")
    .option("-o, --output [output]", "Target directory for the generated files", "out")
    .option("--tsTypeSuffix [tsTypeSuffix]", "Suffix for typescript type names", "")
    .option("--disableUnknownEnum", "If set, enums will be rendered without unknown values", false)
    .option("--disableUnknownUnion", "If set, discriminated unions (oneOf) will be rendered without unknown values", false)
    .option("--debug", "Enable debug logging", false)
    .action(
      async (spec: string, options: { output: string; debug: string; disableUnknownEnum: boolean; disableUnknownUnion: boolean; tsTypeSuffix: string }) => {
        if (options.debug) {
          appLog.setLogLevel("debug");
        }
        const parsed = await bundleParseOpenapi(spec, {
          xOmit: true,
          mergeAllOf: true,
          ensureDiscriminatorValues: true,
        });
        await generateZodSchemas(parsed, options.output, {
          includeTsTypes: false,
          withUnknownEnum: !options.disableUnknownEnum,
          withUnknownUnion: !options.disableUnknownUnion,
          tsTypeNameSuffix: options.tsTypeSuffix,
        });
      },
    );
}
