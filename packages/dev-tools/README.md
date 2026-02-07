# @dasaplan/dev-tools

Common development tools and dependencies for the TypeScript monorepo. This package consolidates shared dev dependencies to reduce duplication across workspace packages.

## Purpose

This package centralizes common development dependencies including:

- **Linting**: ESLint, TypeScript ESLint plugin, and related plugins
- **TypeScript**: TypeScript compiler
- **Build Tools**: npm-run-all, clean-package, sort-package-json
- **Type Definitions**: Common type definition packages

## Usage

Add `@dasaplan/dev-tools` as a dev dependency in your package.json:

```json
{
  "devDependencies": {
    "@dasaplan/dev-tools": "workspace:*"
  }
}
```

All tools will then be available in your project through the monorepo's node_modules.

## Included Dependencies

- `@typescript-eslint/eslint-plugin`
- `eslint`
- `eslint-plugin-import`
- `eslint-plugin-n`
- `eslint-plugin-promise`
- `typescript`
- `clean-package`
- `npm-run-all`
- `sort-package-json`
- Type definitions for common packages
