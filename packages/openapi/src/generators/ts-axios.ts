import { File, Folder } from "@dasaplan/ts-sdk";
import { appLog } from "../logger.js";
import { TemplateDir } from "../template.js";
import { OaGenerator } from "./oa-generator.js";

export interface TsAxiosPublicGenOptions {
  generateZod?: boolean;
}

export interface TsAxiosInternalOptions extends TsAxiosPublicGenOptions {
  postProcessor?: (api: string) => string;
}

export async function generateTypescriptAxios(openapiSpec: string, out: string, params?: TsAxiosInternalOptions) {
  const log = appLog.childLog(generateTypescriptAxios);
  log.info(`start generate:`, openapiSpec, out);

  const outDir = Folder.of(out);

  const zodEnabled = params?.generateZod ? "zodEnabled" : "zodDisabled";
  const templates = TemplateDir.getTmpDir();

  const sanitizedInput = {
    specPath: File.of(openapiSpec).normalize().absolutePath,
    templatesPath: templates.normalize().absolutePath,
    outDirPath: outDir.normalize().absolutePath,
  };

  await OaGenerator.generate<TypescriptAxiosConfigOptions>({
    "-g": "typescript-axios",
    "-i": sanitizedInput.specPath,
    "-o": sanitizedInput.outDirPath,
    "-t": sanitizedInput.templatesPath,
    "--additional-properties": zodEnabled,
    generatorOptions: {
      enumPropertyNaming: "original",
    },
  });

  const apiFile = outDir.makeFile("api.ts");
  if (params?.postProcessor) params.postProcessor(apiFile.absolutePath);
  return sanitizedInput.outDirPath;
}

interface TypescriptAxiosConfigOptions {
  /** boolean, toggles whether unicode identifiers are allowed in names or not, default is false
   * @default false*/
  allowUnicodeIdentifiers?: boolean;
  /** package for generated api classes
   * @default null*/
  apiPackage?: null;
  /** If false, the 'additionalProperties' implementation (set to true by default) is compliant with the OAS and JSON schema specifications. If true (default), keep the old (incorrect) behaviour that 'additionalProperties' is set to false by default.
   * @default true*/
  disallowAdditionalPropertiesIfNotPresent?: boolean;
  /** Whether to ensure parameter names are unique in an operation (rename parameters that are not).
   * @default true*/
  ensureUniqueParams?: boolean;
  /** Suffix that will be appended to all enum names.
   * @default "Enum";*/
  enumNameSuffix?: string;
  /** Naming convention for enum properties: 'camelCase', 'PascalCase', 'snake_case', 'UPPERCASE', and 'original'
   * @default "PascalCase";*/
  enumPropertyNaming?: "camelCase" | "PascalCase" | "snake_case" | "UPPERCASE" | "original";
  /** Set to true to replace '-' and '+' symbols with 'minus' and 'plus' in enum of type string
   * @default false*/
  enumPropertyNamingReplaceSpecialChar?: boolean;
  /** If the server adds new enum cases, that are unknown by an old spec/client, the client will fail to parse the network response.With this option enabled, each enum will have a new case, 'unknown_default_open_api', so that when the server sends an enum case that is not known by the client/spec, they can safely fallback to this case.
   * @default false*/
  enumUnknownDefaultCase?: boolean;
  /** Set to false for generators with better support for discriminators. (Python, Java, Go, PowerShell, C# have this enabled by default).
   * @default true*/
  legacyDiscriminatorBehavior?: boolean;
  /** package for generated models
   * @default null*/
  modelPackage?: null;
  /** The name under which you want to publish generated npm package. Required to generate a full package
   * @default null*/
  npmName?: null;
  /** Use this property to set an url of your private npmRepo in the package.json
   * @default null*/
  npmRepository?: null;
  /** The version of your npm package. If not provided, using the version from the OpenAPI specification file.
   * @default "1.0.0";*/
  npmVersion?: "1.0.0";
  /** Set to make additional properties types declare that their indexer may return undefined
   * @default false*/
  nullSafeAdditionalProps?: boolean;
  /** Naming convention for parameters: 'camelCase', 'PascalCase', 'snake_case' and 'original', which keeps the original name
   * @default ;*/
  paramNaming?: "camelCase" | "PascalCase" | "snake_case" | "UPPERCASE" | "original";
  /** Add form or body parameters to the beginning of the parameter list.
   * @default false*/
  prependFormOrBodyParameters?: boolean;
  /** When setting this property to true, the version will be suffixed with -SNAPSHOT.yyyyMMddHHmm
   * @default false*/
  snapshot?: boolean;
  /** Sort model properties to place required parameters before optional parameters.
   * @default true*/
  sortModelPropertiesByRequiredFlag?: boolean;
  /** Sort method arguments to place required parameters before optional parameters.
   * @default true*/
  sortParamsByRequiredFlag?: boolean;
  /** Generate string enums instead of objects for enum values.
   * @default false*/
  stringEnums?: boolean;
  /** Generate code that conforms to ES6.
   * @default false*/
  supportsES6?: boolean;
  /** Setting this property to true will generate functions with a single argument containing all API endpoint parameters instead of one argument per parameter.
   * @default false*/
  useSingleRequestParameter?: boolean;
  /** Setting this property to true will add brackets to array attribute names, e.g. my_values[].
   * @default false*/
  useSquareBracketsInArrayNames?: boolean;
  /** Setting this property to true will generate interfaces next to the default class implementations.
   * @default false*/
  withInterfaces?: boolean;
  /** Setting this property to true adds imports for NodeJS
   * @default false*/
  withNodeImports?: boolean;
  /** Put the model and api in separate folders and in separate classes. This requires in addition a value for 'apiPackage' and 'modelPackage'
   * @default false*/
  withSeparateModelsAndApi?: boolean;
  /** Don't prefix enum names with class names
   * @default false*/
  withoutPrefixEnums?: boolean;
}
