# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [0.3.5](https://github.com/dasaplan/ts-mono/compare/@dasaplan/openapi@0.3.4...@dasaplan/openapi@0.3.5) (2025-11-20)


### Bug Fixes

* fixed missing suffix for ts type references in zod codegen ([cb5aa87](https://github.com/dasaplan/ts-mono/commit/cb5aa8791f93ae2fa19a904be0f25aa0efbe42b3))





## [0.3.4](https://github.com/dasaplan/ts-mono/compare/@dasaplan/openapi@0.3.3...@dasaplan/openapi@0.3.4) (2025-11-12)


### Bug Fixes

* **generator:** fix cli params for model suffix ([e322bc5](https://github.com/dasaplan/ts-mono/commit/e322bc5f7e4ba93c4de6c9ab2ef978a200422181))
* unknown enum variant inference not working god enough when parsing with ZodUnionMatch ([e2e9298](https://github.com/dasaplan/ts-mono/commit/e2e92985e258e887069e9d656a728d1117add66a))





## [0.3.3](https://github.com/dasaplan/ts-mono/compare/@dasaplan/openapi@0.3.2...@dasaplan/openapi@0.3.3) (2025-11-11)


### Bug Fixes

* fixed when properties referencing objects marked optional but where actually required in specs ([4264a9c](https://github.com/dasaplan/ts-mono/commit/4264a9c5f2b14c6c023b9932deb9770145d320d7))





## [0.3.2](https://github.com/dasaplan/ts-mono/compare/@dasaplan/openapi@0.3.1...@dasaplan/openapi@0.3.2) (2025-11-06)


### Bug Fixes

* **endpoints:** fix handling optional path params ([eab3d85](https://github.com/dasaplan/ts-mono/commit/eab3d856ccd03f24689f41c3f27ab97ef558f987))
* **ts-axios:** fix cli argument --templates ([830eaea](https://github.com/dasaplan/ts-mono/commit/830eaeae73d33313f47a2df5059550b420015bed))
* **ts-axios:** fix generating union without discriminator ([6ab460f](https://github.com/dasaplan/ts-mono/commit/6ab460f57b62e1369de3ad49bb9a9487a4e5e2ce))





## [0.3.1](https://github.com/dasaplan/ts-mono/compare/@dasaplan/openapi@0.3.0...@dasaplan/openapi@0.3.1) (2025-11-06)

**Note:** Version bump only for package @dasaplan/openapi





# [0.3.0](https://github.com/dasaplan/ts-mono/compare/@dasaplan/openapi@0.2.4...@dasaplan/openapi@0.3.0) (2025-11-05)


### Bug Fixes

* **openapi:** fix for when templates dir is not found ([12dc39e](https://github.com/dasaplan/ts-mono/commit/12dc39e7ae267456a4961b8b9c102a0a9a4c5f60))


### Features

* added debug flag in cli ([2bc9e3f](https://github.com/dasaplan/ts-mono/commit/2bc9e3ff741e2af852235e9f88998817b25f0441))
* added templates flat to only copy templates if desired ([4a20f9f](https://github.com/dasaplan/ts-mono/commit/4a20f9f2d3bf1708ffb63fc666322b4ee2892b25))





## [0.2.4](https://github.com/dasaplan/ts-mono/compare/@dasaplan/openapi@0.2.1...@dasaplan/openapi@0.2.4) (2025-11-02)

**Note:** Version bump only for package @dasaplan/openapi





## [0.2.1](https://github.com/dasaplan/ts-mono/compare/@dasaplan/openapi@0.2.0...@dasaplan/openapi@0.2.1) (2025-11-02)

**Note:** Version bump only for package @dasaplan/openapi





# [0.2.0](https://github.com/dasaplan/ts-mono/compare/@dasaplan/openapi@0.0.28...@dasaplan/openapi@0.2.0) (2025-11-01)


### Features

* **all:** update deps ([5322060](https://github.com/dasaplan/ts-mono/commit/5322060b4a676104d94bbced86d4e843628b9aba))
* **bundler:** support endpoint filter by tag and operationId ([d59557c](https://github.com/dasaplan/ts-mono/commit/d59557cd682f6961c79f26e43a67a304cd40235d))





# [0.1.0](https://github.com/dasaplan/ts-mono/compare/@dasaplan/openapi@0.0.28...@dasaplan/openapi@0.1.0) (2025-11-01)


### Features

* **all:** update deps ([5322060](https://github.com/dasaplan/ts-mono/commit/5322060b4a676104d94bbced86d4e843628b9aba))
* **bundler:** support endpoint filter by tag and operationId ([d59557c](https://github.com/dasaplan/ts-mono/commit/d59557cd682f6961c79f26e43a67a304cd40235d))





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
