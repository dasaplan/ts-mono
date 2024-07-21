import { appLog } from "../logger.js";
import { _, ApplicationError, CommandLine } from "@dasaplan/ts-sdk";

export module OaGenerator {
  const logger = appLog.childLogger("OaGenerator");

  /** User Input must be sanitized from the caller*/
  export async function generate<ConcreteGenerator extends object>(options: OaGeneratorOptions, concreteGeneratorOptions: ConcreteGenerator) {
    const log = logger.childLog(generate);
    log.info(`start generate with options:`, JSON.stringify(options));

    const cliParams = OaGeneratorOptions.create(options, concreteGeneratorOptions);
    const command = `npx`;
    const args = [" openapi-generator-cli", "generate", ...cliParams];
    await tryExec(command, args);
  }

  async function tryExec(command: string, args: ReadonlyArray<string>) {
    const log = logger.childLog(tryExec);

    try {
      log.info(`start: ${command}, args: ${args.join(", ")}`);
      const stdout = await CommandLine.spawn(command, args);
      log.debug(`end: ${command}`);
      log.debug("stdout:", stdout);
    } catch (error) {
      throw ApplicationError.create("failed code generation").chainUnknown(error);
    }
  }
}

export type OaGeneratorOptions = OaGeneratorOptions.CLIParams;
export module OaGeneratorOptions {
  export function create<ConcreteGeneratorOptions extends object>(
    options: OaGeneratorOptions,
    concreteGeneratorOptions: ConcreteGeneratorOptions
  ): ReadonlyArray<string> {
    const generatorOptions = Object.entries(concreteGeneratorOptions)
      .map(([key, value]) => `${key}=${value}`)
      .join(",");

    // use cases for additional-properties are "documented generator options" and "undocumented variables for templating"
    const additionalProperties = [options["--additional-properties"], generatorOptions].filter(_.isDefined).join(",");

    const params = {
      "--skip-validate-spec": undefined,
      ..._.omit(options, "generatorOptions"),
      "--additional-properties": additionalProperties,
    };

    return Object.entries(params).reduce((acc: Array<string>, [flag, value]) => {
      if (!flag) {
        return acc;
      }
      const formattedFlag = flag.startsWith("-") ? flag : `--${flag}`;
      if (typeof value === "boolean" && value) {
        return [...acc, formattedFlag];
      }
      const stringValueInQuotes = typeof value === "string" ? `"${value}"` : value;
      if (!stringValueInQuotes) {
        return [...acc, formattedFlag];
      }
      return [...acc, formattedFlag, stringValueInQuotes];
    }, []);
  }

  /** https://openapi-generator.tech/docs/usage/*/
  export interface CLIParams {
    /** path to spec */
    "--input-spec": string;
    /** output dir*/
    "--output": string;
    /** templates dir*/
    "--template-dir"?: string;
    /** generator */
    "--generator-name": "typescript-axios" | "spring";
    "--skip-validate-spec"?: undefined;
    /** generator options (or variables passed to the templates(*/
    "--additional-properties"?: string;
    /** Path to configuration file. It can be JSON or YAML. If file is JSON,
         the content should have the format {"optionKey":"optionValue",
         "optionKey1":"optionValue1"...}. If file is YAML, the content should
         have the format optionKey: optionValue. Supported options can be
         different for each language. Run config-help -g {generator name}
         command for language-specific config options*/
    "--engine"?: "mustache" | "handlebars";
    "--config"?: string;
    "--ignore-file-override"?: boolean;
    "--legacy-discriminator-behavior"?: boolean;
    "--model-name-prefix"?: string;
    "--model-name-suffix"?: string;
    "--strict-spec"?: boolean;
    "--verbose"?: boolean;
  }
}
