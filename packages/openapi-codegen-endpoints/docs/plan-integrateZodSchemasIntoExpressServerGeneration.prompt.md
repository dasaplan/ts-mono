# Plan: Integrate Zod Schemas into Express Server Code Generation

## Current State

The current architecture has `openapi-codegen-endpoints` generating Express server code with placeholder validation that expects Zod schemas, but it doesn't actually wire them in. Meanwhile, `openapi-codegen-zod` generates standalone Zod schemas. The challenge is that `openapi` package already orchestrates both, but `openapi-codegen-endpoints` can't directly depend on `openapi-codegen-zod` due to circular dependency concerns.

### Key Observations

1. **Two Generator Modes**: `openapi-codegen-endpoints` supports `generator: "zod" | "ts"` option
   - `"ts"` mode uses `ExpressTsCommon.ts` with function-based validation
   - `"zod"` mode uses `ExpressZodCommon.ts` with Zod schema-based validation

2. **Current Zod Integration Gap**: When `generator: "zod"` is selected:
   - Express server code is generated with placeholders for Zod schemas
   - `CreateInputValidator` expects `{ headers?, params?, body? }` with Zod schemas
   - Response validation expects `{ [status]: ZodSchema }` mapping
   - **BUT**: No actual Zod schemas are generated or imported

3. **Existing Zod Generator**: `openapi-codegen-zod` already has:
   - `generateZodSchemasFromParseModel()` - generates schemas from bundled spec
   - `generateEndpointSchemasFromParseModel()` - generates `Endpoints` object with params/request/responses per operation
   - Output structure: `Schemas.Endpoints["operationId"].params`, `.request`, `.responses`

4. **Current Workaround**: The `openapi` package orchestrates both generators separately but doesn't connect them

## Problem Statement

When generating Express server code with `generator: "zod"`, we need to:
1. Generate Zod schemas alongside the Express API code
2. Import the generated schemas into the Express server file
3. Wire the schemas into the request/response validation points

## Proposed Solution

### Architecture Decision

**Option A: Direct Dependency (Recommended)**
- Add `@dasaplan/openapi-codegen-zod` as dependency to `openapi-codegen-endpoints`
- Call Zod generation directly when `generator: "zod"`
- Benefits: Self-contained, easier to use standalone
- Drawbacks: Couples the packages

**Option B: Keep Separation**
- Keep packages independent
- Require users to manually generate and wire schemas
- Benefits: Clean separation of concerns
- Drawbacks: Poor DX, error-prone

**Recommendation**: Choose Option A for better developer experience.

## Implementation Steps

### 1. Add Package Dependency

**File**: `packages/openapi-codegen-endpoints/package.json`

Add to dependencies:
```json
{
  "dependencies": {
    "@dasaplan/openapi-codegen-zod": "workspace:*"
  }
}
```

### 2. Generate Zod Schemas Alongside Express API

**File**: `packages/openapi-codegen-endpoints/src/endpoint-generator.ts`

In `generateExpressApiFromBundled()` function, when `params.generator === "zod"`:
- Import `generateZodSources` from `@dasaplan/openapi-codegen-zod`
- Generate `zod.ts` file in the output directory
- Generate `zod-common.ts` helper file

```typescript
// Add import
import { generateZodSources } from "@dasaplan/openapi-codegen-zod";

// In generateExpressApiFromBundled, after creating out folder:
if (params.generator === "zod") {
  const zodFilePath = out.makeFile("zod.ts").absolutePath;
  await generateZodSources(bundled, zodFilePath, {
    includeTsTypes: false, // Don't need TS types, Zod infers them
    withUnknownEnum: true,
    withUnknownUnion: true,
    tsTypeNameSuffix: "",
  });
}
```

### 3. Add Zod Import to Generated Express File

**File**: `packages/openapi-codegen-endpoints/src/server/express-server-api.ts`

In `generateCreateExpressServerApi()`, add conditional import when using Zod:

```typescript
const importZodSchemas = options.generator === "zod" 
  ? createImport("./zod.js", "Schemas") 
  : null;

const libImports = [
  importExpress, 
  expressGenLib,
  importZodSchemas
].filter(i => i !== null).join("\n");
```

### 4. Wire Zod Schemas into Request Validation

**File**: `packages/openapi-codegen-endpoints/src/server/express-server-api.ts`

Replace the placeholder schema object with actual schema references:

```typescript
// Current (around line 135):
const zodInputSchemas = `{ 
  headers: ${idWithDefaults}?.requestValidation?.headers, 
  params:  ${idWithDefaults}?.requestValidation?.params,
  body:  ${idWithDefaults}?.requestValidation?.body 
}`;

// Change to:
const zodInputSchemas = `{ 
  headers: ${idWithDefaults}?.requestValidation?.headers ?? Schemas.Endpoints["${e.alias}"].params?.headers, 
  params:  ${idWithDefaults}?.requestValidation?.params ?? Schemas.Endpoints["${e.alias}"].params?.params,
  body:  ${idWithDefaults}?.requestValidation?.body ?? Schemas.Endpoints["${e.alias}"].request
}`;
```

### 5. Wire Zod Schemas into Response Validation

**File**: `packages/openapi-codegen-endpoints/src/server/express-server-api.ts`

Update response validation to use generated schemas:

```typescript
// Current (around line 142):
const responseValidator = `${idWithDefaults}?.responseValidation?.responses`;

// Change to:
const responseValidator = `${idWithDefaults}?.responseValidation?.responses ?? Schemas.Endpoints["${e.alias}"].responses`;
```

### 6. Update ExpressZodCommon Template Types

**File**: `packages/openapi-codegen-endpoints/templates/ExpressZodCommon.ts`

Ensure the `Operation` interface aligns with generated schema structure. Current structure looks correct, but verify that:
- `requestValidation.headers`, `.params`, `.body` match Zod generator output
- `responseValidation.responses` structure matches

### 7. Update TypeScript Types Generation Strategy

**Decision Point**: When `generator: "zod"`, should we:
- **Option A**: Skip TypeScript type generation entirely (use `z.infer<>`)
- **Option B**: Generate minimal types for IDE support
- **Option C**: Generate full types as reference

**Recommendation**: Option A - Zod's `z.infer<>` provides all needed types, avoiding redundancy.

## Testing Strategy

1. **Unit Tests**: Test schema generation in isolation
2. **Integration Tests**: Generate Express API with Zod schemas for sample spec
3. **Type Tests**: Verify TypeScript types are correctly inferred from Zod schemas
4. **Runtime Tests**: Ensure validation actually works with Express middleware

## Migration Path

For existing users:

1. **No Breaking Changes**: This is opt-in via `generator: "zod"`
2. **Documentation Update**: Document how to use Zod validation
3. **Example Project**: Create sample Express app using generated code

## Open Questions

1. **Should response validation be enabled by default?**
   - Pro: Full type safety
   - Con: Performance overhead
   - Suggestion: Make it opt-in via config flag

2. **How to handle custom Zod refinements?**
   - Allow users to extend generated schemas?
   - Provide hooks for custom validation?

3. **Should we generate request parameter parsing for path/query params?**
   - OpenAPI specs define params separately from body
   - Zod generator outputs them in `params` object
   - Need to ensure Express path params are validated

4. **Type inference strategy**:
   - Should generated code export inferred types?
   - Example: `export type GetConstantsRequest = z.infer<typeof Schemas.Endpoints.getConstants.params>`

## Further Considerations

### 1. Dependency Direction

The dependency `openapi-codegen-endpoints` → `openapi-codegen-zod` is acceptable because:
- Both already depend on `openapi-bundler`
- No circular dependency created
- Clear separation: bundler → zod → endpoints
- Alternative of extracting shared logic is over-engineering

### 2. TypeScript Types Redundancy

Since Zod schemas already infer TypeScript types via `z.infer<>`:
- **Skip** generating separate TypeScript types when using Zod generator
- Better IDE autocomplete from Zod types
- Single source of truth (the schema)
- Less code generation overhead

### 3. Response Validation Schemas

Response validation should be:
- **Included** in generation (already done by zod generator)
- **Opt-in** at runtime (performance consideration)
- Allow per-operation override via `responseValidation: false`
- Document the tradeoff in README

### 4. Parameter Handling

Express handles parameters differently:
- **Path params**: `req.params` (from URL segments like `/inventory/:id`)
- **Query params**: `req.query` (from `?key=value`)
- **Headers**: `req.headers` (lowercased by Express)

Need to ensure Zod schemas map correctly:
- Zod generator's `params` should cover path + query params
- Headers need separate validation
- Body is straightforward

## Success Criteria

✅ Generate Express API with `generator: "zod"` produces working validation
✅ Zod schemas are automatically generated and imported
✅ Request validation works for headers, params, and body
✅ Response validation works for all status codes
✅ TypeScript types are correctly inferred
✅ No breaking changes to existing API
✅ Documentation includes usage examples

## Next Actions

1. Implement steps 1-6 above
2. Add integration tests
3. Update documentation
4. Create example project
5. Consider response validation opt-in flag
6. Document parameter validation behavior

