// Re-export all code generation functions for programmatic use
export {
  generateZodSchemas,
  generateZodSources,
  generateZodSchemasFromParseModel,
  type ZodGenOptions,
} from "@dasaplan/openapi-codegen-ts";

export {
  type EndpointDefinition,
  generateEndpointDefinitions,
  generateEndpointDefinitionsFromBundled,
  generateExpressApi,
  type EndpointDefinitionGeneratorOptions,
  type ExpressApiGeneratorOptions,
  type EndpointInterfaceGeneratorOptions,
  generateEndpointInterfacesAsText,
} from "@dasaplan/openapi-codegen-ts";

// Re-export CLI command builders
export { createCommandGenerateZod } from "./commands/zod.js";
export { createCommandGenerateEndpoints, createCommandGenerateExpressApi } from "./commands/endpoints.js";

export * from "@dasaplan/openapi-codegen-ts";
