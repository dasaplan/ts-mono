import { appLog } from "../logger.js";
import child_process from "node:child_process";
import { _, ApplicationError } from "@dasaplan/ts-sdk";
import util from "node:util";

export module OaGenerator {
  const logger = appLog.childLogger("OaGenerator");

  /** User Input must be sanitized from the caller*/
  export function generateSync<ConcreteGenerator extends object>(options: OaGeneratorOptions<ConcreteGenerator>) {
    const log = logger.childLog(generateSync);
    log.info(`start generate with options:`, JSON.stringify(options));

    const cliParams = OaGeneratorOptions.create<ConcreteGenerator>(options);
    const command = `npx openapi-generator-cli generate ${cliParams}`;

    tryExecSync(command);
  }

  /** User Input must be sanitized from the caller*/
  export async function generate<ConcreteGenerator extends object>(options: OaGeneratorOptions<ConcreteGenerator>) {
    const log = logger.childLog(generateSync);
    log.info(`start generate with options:`, JSON.stringify(options));

    const cliParams = OaGeneratorOptions.create<ConcreteGenerator>(options);
    const command = `npx openapi-generator-cli generate ${cliParams}`;

    await tryExec(command);
  }

  async function tryExec(command: string) {
    const log = logger.childLog(tryExec);
    const execAsync = util.promisify(child_process.exec);
    try {
      log.info(`start: ${command}`);
      const { stdout, stderr } = await execAsync(command);
      if (stderr) {
        log.error(stderr);
      }
      log.debug(`end: ${command}`);
      log.debug(stdout);
    } catch (error) {
      throw ApplicationError.create("failed code generation").chainUnknown(error);
    }
  }

  function tryExecSync(command: string) {
    const log = logger.childLog(tryExec);
    try {
      log.info(`start: ${command}`);
      const result = child_process.execSync(command);
      log.debug(`end: ${command}`);
      log.debug(result);
    } catch (error) {
      throw ApplicationError.create("failed code generation").chainUnknown(error);
    }
  }
}

export type OaGeneratorOptions<T extends object> = OaGeneratorOptions.CLIParams<T>;
export module OaGeneratorOptions {
  export function create<ConcreteGeneratorOptions extends object>(options: OaGeneratorOptions<ConcreteGeneratorOptions>): string {
    const generatorOptions = Object.entries(options.generatorOptions)
      .map(([key, value]) => `${key}=${value}`)
      .join(",");

    // use cases for additional-properties are "documented generator options" and "undocumented variables for templating"
    const additionalProperties = [options["--additional-properties"], generatorOptions].join(",");

    const params = {
      "--skip-validate-spec": undefined,
      ..._.omit(options, "generatorOptions"),
      "--additional-properties": additionalProperties,
    };

    return Object.entries(params).reduce((acc, [flag, value]) => {
      const formattedFlag = flag.startsWith("-") ? flag : `--${flag}`;
      const stringValueInQuotes = typeof value === "string" ? `"${value}"` : value;
      const formattedValue = value ? ` ${stringValueInQuotes}` : "";
      return `${acc} ${formattedFlag}${formattedValue}`;
    }, "");
  }

  export interface CLIParams<T extends object> {
    /** path to spec */
    "-i": string;
    /** output dir*/
    "-o": string;
    /** templates dir*/
    "-t"?: string;
    /** generator */
    "-g": "typescript-axios" | "spring";
    "--skip-validate-spec"?: undefined;
    /** generator options (or variables passed to the templates(*/
    "--additional-properties"?: string;
    generatorOptions: T;
  }
}
