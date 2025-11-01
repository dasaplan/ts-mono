# @dasaplan/openapi-formatter

A development-focused OpenAPI specification formatter designed to assist in migrating and standardizing OpenAPI documents.

## Features
- Formats OpenAPI specifications without changing their semantics
- Ideal for standardizing specs during development and migration projects
- Helps maintain consistent OpenAPI document structure

## Installation
```bash
npm install @dasaplan/openapi-formatter
# or
pnpm add @dasaplan/openapi-formatter
```

## Usage
```typescript
import { formatOpenApiSpec } from '@dasaplan/openapi-formatter';

const formattedSpec = await formatOpenApiSpec(yourOpenApiSpec);
```

## CLI Usage
```bash
oa-formatter input.yaml -o output.yaml
```

## License
MIT
