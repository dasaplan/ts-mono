
---

## Refactoring Plan: Generator Consolidation

### Vision
Consolidate all OpenAPI TypeScript code generators into a single `@dasaplan/openapi-codegen-ts` package (`packages/oa_code_gen_ts`) to enable better synergy between generators, reduce maintenance overhead, and accelerate iteration cycles.

### Current State (Pre-Refactoring)
**Fragmented Generator Packages:**
- `@dasaplan/openapi-codegen-zod` - Zod schema generation
- `@dasaplan/openapi-codegen-endpoints` - Framework-agnostic endpoint generation
- Individual, duplicated infrastructure, build configs, and dev-tool setups

**Target Structure Already in Place:**
The `oa_code_gen_ts` package already has the foundational folder structure:
```
packages/oa_code_gen_ts/
├── model/          # TypeScript type generation
├── marshalling/    # Zod schema & runtime utilities
├── client/         # HTTP client generation (axios, fetch, etc.)
├── server/         # Server code generation (express, etc.)
├── index.ts        # Unified export surface
└── [CLI entry point]
```

### Workplan

#### Phase 1: Infrastructure & Consolidation
- [ ] **Update package.json** in `oa_code_gen_ts`
  - [ ] Add workspace references to existing generators as devDependencies for transitional import
  - [ ] Update metadata (description, keywords, repository path)
  - [ ] Consolidate common scripts (build, test, lint, prepack)

- [ ] **Migrate Zod Generator**
  - [ ] Move `@dasaplan/openapi-codegen-zod` logic into `marshalling/` subdirectory
  - [ ] Preserve internal module structure for maintainability
  - [ ] Update imports to reference unified exports

- [ ] **Migrate Endpoints Generator**
  - [ ] Move `@dasaplan/openapi-codegen-endpoints` logic into `client/` and `server/` subdirectories
  - [ ] Add framework-specific adapters (express, axios, etc.)
