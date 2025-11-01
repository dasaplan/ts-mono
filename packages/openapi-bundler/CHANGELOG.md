# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# 1.1.0 (2025-11-01)


### Bug Fixes

* **bundler:** force merge allOf ([0c3c21d](https://github.com/dasaplan/ts-mono/commit/0c3c21d191ad35169f5e64da796b698d4c19f0d7))
* **bundler:** merge allOf when only inline sub schema has discriminator ([03be04b](https://github.com/dasaplan/ts-mono/commit/03be04b5f5dc54b1bfbc4524d8cb0bc3fb1f955d))
* **bundler:** process x-omit and x-pick before allOff merger ([fc8cca2](https://github.com/dasaplan/ts-mono/commit/fc8cca22d05a97e659328d269bf8b8224c07071d))
* ignore unions with less than 2 elements ([92cfffe](https://github.com/dasaplan/ts-mono/commit/92cfffed57527f79a87d43d9ee3b096b35e61400))
* linter ([d49e1d0](https://github.com/dasaplan/ts-mono/commit/d49e1d07510c78134fc734418dc913743fbdb27b))
* missing inheritance after merge all of for generic api ([65d9c1d](https://github.com/dasaplan/ts-mono/commit/65d9c1dd4c64c1d4c7674e31958a5db2745eaca4))
* optional discriminator properties and single union instances ([c9e2c5c](https://github.com/dasaplan/ts-mono/commit/c9e2c5cc213d55bb254c0f620fe56059e5c3a7e5))
* toposort array items correctly when root schema is of type array ([677eef0](https://github.com/dasaplan/ts-mono/commit/677eef07d28dfc85eb88c55358a8e3b99d6f6fef))
* toposort array items correctly when the elements are allOf objects ([c999d34](https://github.com/dasaplan/ts-mono/commit/c999d3415617169833354622d85ec58976ceabd7))
* **transpiler, zod:** property name should not change when it references a schema entity with different name ([29b28f8](https://github.com/dasaplan/ts-mono/commit/29b28f88118bc2c99e2d7ea7666408cd5d991515))


### Features

* **bundler:** process properties and inline schema ([7e71d91](https://github.com/dasaplan/ts-mono/commit/7e71d91a7ad044389de4eab419ba839072a08d2a))
* **bundler:** support endpoint filter by tag and operationId ([d59557c](https://github.com/dasaplan/ts-mono/commit/d59557cd682f6961c79f26e43a67a304cd40235d))
* **bundler:** support endpoint filter by tag and operationId ([1e75ea7](https://github.com/dasaplan/ts-mono/commit/1e75ea7e48f3739924e1137387669b0c74a8163a))
* documentation ([da98d77](https://github.com/dasaplan/ts-mono/commit/da98d7706b227f9302c2baaa19649ee2081e1287))
* export endpoints in index ([175a194](https://github.com/dasaplan/ts-mono/commit/175a194f8d213893bd1dce31d4e404c4d46270d0))
* **formatter:** delete examples ([e5069d2](https://github.com/dasaplan/ts-mono/commit/e5069d23dd59accf9f6092f5caf793cda882b77b))
* generate endpoint definition ([d467be0](https://github.com/dasaplan/ts-mono/commit/d467be0448a58f6d0a7d5847eae1dcec48bb8861))
* handle dangling properties for schema with allOf ([a473fa7](https://github.com/dasaplan/ts-mono/commit/a473fa77db929d9ebfebddb511b09bdc8a168e45))
* oas extended schema ([e5c9e7e](https://github.com/dasaplan/ts-mono/commit/e5c9e7e6fb1276a2555cc5c2dbe75575783bc891))
* openapi-bundler ([71d5750](https://github.com/dasaplan/ts-mono/commit/71d575005a6b9d8966fc18be3e23ab0c86efcd49))
* openapi-bundler ([3e24f1e](https://github.com/dasaplan/ts-mono/commit/3e24f1e8bceddeeeeecefde6f4aaed638d5a0d6c))
* rtk-query endpoints ([8ea830e](https://github.com/dasaplan/ts-mono/commit/8ea830e7e3a843ed6c3ad1f0db8e9e4a5059636e))
* x pick ([0d5bea2](https://github.com/dasaplan/ts-mono/commit/0d5bea2b86dd57bf4cb1f8a183de80dd37dad6f3))
* x-omit ([a620f7a](https://github.com/dasaplan/ts-mono/commit/a620f7ac2c9b0c587af4a631bb9eefb9de0794dc))
* x-omit ([6f7009d](https://github.com/dasaplan/ts-mono/commit/6f7009d1962099d7dade25b303790b8da348c114))
* xOmit deep ([5c6632e](https://github.com/dasaplan/ts-mono/commit/5c6632eef85f45eb1aec40827e5042229a638939))
* xPick ([70419a0](https://github.com/dasaplan/ts-mono/commit/70419a00c7a0057c81343432aae66e2cc1675ea9))





# @dasaplan/openapi-bundler

## 0.0.24

### Patch Changes

- process schema properties

## 0.0.23

### Patch Changes

- fix allOf merge

## 0.0.22

### Patch Changes

- improve x-omit

## 0.0.21

### Patch Changes

- improve formatter

## 0.0.20

### Patch Changes

- feat(bundler): force merge allOf

## 0.0.19

### Patch Changes

- fix(bundler): when mergeAllOf fails for only inline schema having discriminator

## 0.0.18

### Patch Changes

- feat: xOmit

## 0.0.17

### Patch Changes

- feat: xOmit

## 0.0.16

### Patch Changes

- feat: x-omit

## 0.0.15

### Patch Changes

- feat: generate endpoints

## 0.0.14

### Patch Changes

- feat: rtk-query

## 0.0.13

### Patch Changes

- feat: export endpoints in generator

## 0.0.12

### Patch Changes

- generate endpoints

## 0.0.11

### Patch Changes

- feat: endpoint definitions

## 0.0.10

### Patch Changes

- Mostly cleanup and some fixes

## 0.0.9

### Patch Changes

- fix: optional discriminator properties and single union instances dsp A minute ago

## 0.0.8

### Patch Changes

- fix zod generate schema properties

## 0.0.7

### Patch Changes

- ef2415e: fixed toposort schemas when array items are allOf objects

## 0.0.6

### Patch Changes

- fix mergeAlOf order to follow default behaviour

## 0.0.5

### Patch Changes

- fix mergeAllOf order to follow default behaviour

## 0.0.3

### Patch Changes

- Update documentation

## 0.0.2

### Patch Changes

- handle dangling properties for schemas with allOf array.
