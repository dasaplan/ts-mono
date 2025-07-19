# Project Description
This project is a typescript monorepo using pnpm, turbo repo and vitest.
It is designed to be used in a nodejs environment.
The workspace is found in the `packages` directory.
A package may be public or private, and the workspace is configured to allow both.
A public package has a Readme file in the root of the package directory.

# Domain Description
The Domain of this project is Api Development. 
Every package either is designed to parse, interpret, bundle, or format OpenAPI specifications. From the OpenApi spec we generate client and server code, documentation, and other artifacts.

# Project Structure
openapi-specs holds example OpenAPI specifications.
openapi-bundler bundles OpenAPI specifications into a single file using a library and then parses it in a way it can be transpiled easily into other formats.
openapi-formatter formats OpenAPI specifications to a specific style which shall facilitate code generation but does not change the semantics of the OpenAPI specification.

# Package Instructions
Always consider the current workspace package as the scope for your changes.
Consider the package's `README.md` file for context and instructions.
