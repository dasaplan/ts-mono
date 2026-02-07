# @dasaplan/openapi-cli

Unified CLI for OpenAPI code generation tools.

This package provides a command-line interface for generating TypeScript code from OpenAPI specifications, including:

- **Zod schemas** - Generate Zod validation schemas from OpenAPI specs
- **Endpoint definitions** - Generate TypeScript endpoint interfaces and types
- **Express API** - Generate Express.js API implementations

## Installation

```bash
npm install -g @dasaplan/openapi-cli
# or
pnpm add -g @dasaplan/openapi-cli
```

## Usage

### Generate Zod Schemas

```bash
oa-cli generate-zod <openapi-spec> [options]
```

Options:
- `-o, --output [output]` - Target directory for generated files (default: "out")
- `--tsTypeSuffix [suffix]` - Suffix for TypeScript type names
- `--expressJs` - Compatible types for Express.js (lowercase headers)
- `--keyOptional` - Generate key-optional properties instead of value-optional
- `--disableUnknownEnum` - Render enums without unknown values
- `--disableUnknownUnion` - Render unions without unknown values
- `--debug` - Enable debug logging

### Generate Endpoints

```bash
oa-cli generate-endpoints <openapi-spec> [options]
```

Options:
- `--templates [dir]` - Temporary directory for templates (default: "tmp")
- `-o, --out [dir]` - Target directory for generated files (default: "out")
- `--typeSuffix [suffix]` - Suffix appended to schema names
- `--apiName [name]` - Name of the API
- `--typeNamespace [namespace]` - Namespace for type module imports
- `--typeModuleName [name]` - Module name for importing types
- `--debug` - Enable debug logging

### Generate Express API

```bash
oa-cli generate-express-api <openapi-spec> [options]
```

Options:
- `--templates [dir]` - Temporary directory for templates (default: "tmp")
- `-o, --out [dir]` - Target directory for generated files (default: "out")
- `--apiName [name]` - Name of the API
- `--generator <type>` - Generator type: "zod" (default: "zod")
- `--debug` - Enable debug logging

## Programmatic Usage

You can also use the package programmatically:

```typescript
import {
  generateZodSchemas,
  generateEndpointDefinitions,
  generateExpressApi,
  type ZodGenOptions,
  type EndpointDefinitionGeneratorOptions,
} from "@dasaplan/openapi-cli";

// Generate Zod schemas
await generateZodSchemas(parsedOpenapi, outputDir, options);

// Generate endpoints
await generateEndpointDefinitions(specPath, options);

// Generate Express API
await generateExpressApi(specPath, options);
```

## License

MIT
