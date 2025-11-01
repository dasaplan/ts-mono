# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# 0.1.0 (2025-11-01)


### Bug Fixes

* ignore unions with less than 2 elements ([92cfffe](https://github.com/dasaplan/ts-mono/commit/92cfffed57527f79a87d43d9ee3b096b35e61400))
* linter ([d49e1d0](https://github.com/dasaplan/ts-mono/commit/d49e1d07510c78134fc734418dc913743fbdb27b))
* missing inheritance after merge all of for generic api ([65d9c1d](https://github.com/dasaplan/ts-mono/commit/65d9c1dd4c64c1d4c7674e31958a5db2745eaca4))
* optional discriminator properties and single union instances ([c9e2c5c](https://github.com/dasaplan/ts-mono/commit/c9e2c5cc213d55bb254c0f620fe56059e5c3a7e5))
* **transpiler, zod:** property name should not change when it references a schema entity with different name ([29b28f8](https://github.com/dasaplan/ts-mono/commit/29b28f88118bc2c99e2d7ea7666408cd5d991515))
* ts-axios suffix ([17653af](https://github.com/dasaplan/ts-mono/commit/17653afaf7985e3bcd13a0a91577b1dc0e979d70))


### Features

* **all:** update deps ([5322060](https://github.com/dasaplan/ts-mono/commit/5322060b4a676104d94bbced86d4e843628b9aba))
* **bundler:** support endpoint filter by tag and operationId ([d59557c](https://github.com/dasaplan/ts-mono/commit/d59557cd682f6961c79f26e43a67a304cd40235d))
* endpoints with generic or explicit types ([2d04bb5](https://github.com/dasaplan/ts-mono/commit/2d04bb5d49a6e2d5a5613e62aa5c0b24937f84cd))
* export endpoints in index ([175a194](https://github.com/dasaplan/ts-mono/commit/175a194f8d213893bd1dce31d4e404c4d46270d0))
* **formatter:** delete examples ([e5069d2](https://github.com/dasaplan/ts-mono/commit/e5069d23dd59accf9f6092f5caf793cda882b77b))
* generate endpoint definition ([909f5c6](https://github.com/dasaplan/ts-mono/commit/909f5c69cc9c2d3462787b3a5c3cf7255fa16134))
* generate endpoints ([488964e](https://github.com/dasaplan/ts-mono/commit/488964e0ed0dbc3ca0ec9d7e9e54262d7767d7db))
* rtk-query endpoints ([736625a](https://github.com/dasaplan/ts-mono/commit/736625adea1098d94b7fba970443142ebdc0f0ce))
* rtk-query endpoints ([8ea830e](https://github.com/dasaplan/ts-mono/commit/8ea830e7e3a843ed6c3ad1f0db8e9e4a5059636e))
* suffix model names ([58bd9cf](https://github.com/dasaplan/ts-mono/commit/58bd9cf978cc38989b3a6ac26133ee300f5e41c6))
* x-omit ([a620f7a](https://github.com/dasaplan/ts-mono/commit/a620f7ac2c9b0c587af4a631bb9eefb9de0794dc))
* xPick ([70419a0](https://github.com/dasaplan/ts-mono/commit/70419a00c7a0057c81343432aae66e2cc1675ea9))



## 0.0.5 (2024-07-16)


### Bug Fixes

* copy templates folder from node modules ([7acaaac](https://github.com/dasaplan/ts-mono/commit/7acaaac95c56ae5c841b87ff09be44ddcadac763))
* openapi-example as devDeps ([ce0a2a4](https://github.com/dasaplan/ts-mono/commit/ce0a2a4cb778806abb1198724a606429a15908ea))
* repo url ([b93a2b4](https://github.com/dasaplan/ts-mono/commit/b93a2b47ca59e1de1fca210634d4750b8b0075ef))
* toposort array items correctly when root schema is of type array ([677eef0](https://github.com/dasaplan/ts-mono/commit/677eef07d28dfc85eb88c55358a8e3b99d6f6fef))
* toposort array items correctly when the elements are allOf objects ([c999d34](https://github.com/dasaplan/ts-mono/commit/c999d3415617169833354622d85ec58976ceabd7))


### Features

* added packages ([fa6203c](https://github.com/dasaplan/ts-mono/commit/fa6203c3af7695b7710242aa9f8ca14567a27a7f))
* documentation ([da98d77](https://github.com/dasaplan/ts-mono/commit/da98d7706b227f9302c2baaa19649ee2081e1287))
* handle dangling properties for schema with allOf ([a473fa7](https://github.com/dasaplan/ts-mono/commit/a473fa77db929d9ebfebddb511b09bdc8a168e45))
* introduce application error ([99fdf2b](https://github.com/dasaplan/ts-mono/commit/99fdf2b71520916489c1bbb81242d8c4cab9799d))
* openapi-bundler ([71d5750](https://github.com/dasaplan/ts-mono/commit/71d575005a6b9d8966fc18be3e23ab0c86efcd49))
* openapi-bundler ([3e24f1e](https://github.com/dasaplan/ts-mono/commit/3e24f1e8bceddeeeeecefde6f4aaed638d5a0d6c))
* provide codegen templates on client cwd ([201d5ce](https://github.com/dasaplan/ts-mono/commit/201d5ce4aad0e955c75034bb9bb52e16d45180d9))





# @dasaplan/openapi

## 0.0.28

### Patch Changes

- Updated dependencies
  - @dasaplan/openapi-bundler@0.0.24
  - @dasaplan/openapi-codegen-endpoints@0.0.16
  - @dasaplan/openapi-codegen-zod@0.0.16

## 0.0.27

### Patch Changes

- Updated dependencies
  - @dasaplan/openapi-bundler@0.0.23
  - @dasaplan/openapi-codegen-endpoints@0.0.15
  - @dasaplan/openapi-codegen-zod@0.0.15

## 0.0.26

### Patch Changes

- Updated dependencies
  - @dasaplan/openapi-bundler@0.0.22
  - @dasaplan/openapi-codegen-endpoints@0.0.14
  - @dasaplan/openapi-codegen-zod@0.0.14

## 0.0.25

### Patch Changes

- Updated dependencies
  - @dasaplan/openapi-codegen-endpoints@0.0.13
  - @dasaplan/openapi-codegen-zod@0.0.13
  - @dasaplan/openapi-bundler@0.0.21

## 0.0.24

### Patch Changes

- update formatter
- Updated dependencies
  - @dasaplan/ts-sdk@0.0.2
  - @dasaplan/openapi-bundler@0.0.20
  - @dasaplan/openapi-codegen-endpoints@0.0.12
  - @dasaplan/openapi-codegen-zod@0.0.12

## 0.0.23

### Patch Changes

- Updated dependencies
  - @dasaplan/openapi-bundler@0.0.20
  - @dasaplan/openapi-codegen-endpoints@0.0.11
  - @dasaplan/openapi-codegen-zod@0.0.11

## 0.0.22

### Patch Changes

- Updated dependencies
  - @dasaplan/openapi-bundler@0.0.19
  - @dasaplan/openapi-codegen-endpoints@0.0.10
  - @dasaplan/openapi-codegen-zod@0.0.10

## 0.0.21

### Patch Changes

- feat: xOmit
- Updated dependencies
  - @dasaplan/openapi-bundler@0.0.18
  - @dasaplan/openapi-codegen-endpoints@0.0.9
  - @dasaplan/openapi-codegen-zod@0.0.9

## 0.0.20

### Patch Changes

- feat: xOmit
- Updated dependencies
  - @dasaplan/openapi-codegen-zod@0.0.8
  - @dasaplan/openapi-bundler@0.0.17
  - @dasaplan/openapi-codegen-endpoints@0.0.8

## 0.0.19

### Patch Changes

- feat: x-omit
- Updated dependencies
  - @dasaplan/openapi-bundler@0.0.16
  - @dasaplan/openapi-codegen-endpoints@0.0.7
  - @dasaplan/openapi-codegen-zod@0.0.7

## 0.0.18

### Patch Changes

- feat: generate endpoints
- Updated dependencies
  - @dasaplan/openapi-bundler@0.0.15
  - @dasaplan/openapi-codegen-endpoints@0.0.6
  - @dasaplan/openapi-codegen-zod@0.0.6

## 0.0.17

### Patch Changes

- feat: rtk-query
- Updated dependencies
  - @dasaplan/openapi-codegen-endpoints@0.0.5
  - @dasaplan/openapi-bundler@0.0.14
  - @dasaplan/openapi-codegen-zod@0.0.5

## 0.0.16

### Patch Changes

- feat: export endpoints in generator
- Updated dependencies
  - @dasaplan/openapi-codegen-endpoints@0.0.4
  - @dasaplan/openapi-codegen-zod@0.0.4
  - @dasaplan/openapi-bundler@0.0.13

## 0.0.15

### Patch Changes

- generate endpoints
- Updated dependencies
  - @dasaplan/openapi-bundler@0.0.12
  - @dasaplan/openapi-codegen-endpoints@0.0.3
  - @dasaplan/openapi-codegen-zod@0.0.3

## 0.0.14

### Patch Changes

- feat: endpoint definitions
- Updated dependencies
  - @dasaplan/openapi-bundler@0.0.11
  - @dasaplan/openapi-codegen-zod@0.0.2

## 0.0.13

### Patch Changes

- Mostly cleanup and some fixes
- Updated dependencies
  - @dasaplan/openapi-bundler@0.0.10
  - @dasaplan/openapi-codegen-zod@0.0.1

## 0.0.12

### Patch Changes

- fix: optional discriminator properties and single union instances dsp A minute ago
- Updated dependencies
  - @dasaplan/openapi-bundler@0.0.9

## 0.0.11

### Patch Changes

- fix zod generate schema properties
- Updated dependencies
  - @dasaplan/openapi-bundler@0.0.8

## 0.0.10

### Patch Changes

- ef2415e: fixed toposort schemas when array items are allOf objects
- Updated dependencies [ef2415e]
  - @dasaplan/openapi-bundler@0.0.7

## 0.0.9

### Patch Changes

- fix template dir
- Updated dependencies
  - @dasaplan/ts-sdk@0.0.1
  - @dasaplan/openapi-bundler@0.0.6

## 0.0.8

### Patch Changes

- fix mergeAlOf order to follow default behaviour
- Updated dependencies
  - @dasaplan/openapi-bundler@0.0.6

## 0.0.7

### Patch Changes

- Updated dependencies
  - @dasaplan/openapi-bundler@0.0.5

## 0.0.6

### Patch Changes

- small changes

## 0.0.5

### Patch Changes

- Update documentation
- Updated dependencies
  - @dasaplan/openapi-bundler@0.0.3

## 0.0.4

### Patch Changes

- handle dangling properties for schemas with allOf array.
- Updated dependencies
  - @dasaplan/openapi-bundler@0.0.2
