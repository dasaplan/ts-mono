# @dasaplan/openapi-codegen-zod

## Getting Started
```shell
npm i --save-dev @dasaplan/openapi-codegen-zod
```

```shell
oazod generate-zod --help
```

```shell
oazod generate-zod --help
```

## Features

- ✅ generate schemas
- ✅ generate 100 % compatible schemas with generated typescript types
- 🔲 extended validation and parsing of data types and formats
    - ✅ ensure primitive data types and basic set of formats
    - 🔲 validate / ensure that a date format does not include time information
    - 🔲 validate / ensure that a date-time format includes timezone information
    - 🔲 support parsing bigint for string + int64 format
- ✅ support of nested (discriminated) unions
- ✅ support **unknown enum variant**
- ✅ support of circular (lazy) schemas
- ✅ support types for lazy schemas
- ✅ support for deeply nested recursive schemas 