# @dasaplan/openapi

Collection of ready to use tools to facilitate OpenApi specification centered workflows.
Standard tooling is incorporated but configured and modified to yield consistent and opinionated results.

> Licenced with Apache License Version 2.0 because openapi codegen is wrapped in this project

## Project Goals

1. We write **tech stack agnostic** OpenApi specifications which are as compatible as possible with widespread OpenApi tooling **across domains** and the use
   cases **json payload validation**, **api documentation** and **code generation**.
    1. We leverage tooling helping us to write specifications to fulfill rule 1 by **automatically applying opinionated practices**.
    2. We **express concepts** like inheritance and polymorphism **as precise as possible with OpenApi** rather than extending OpenApi syntax which need to be known for
       interpreting the specification.
2. We aim for generated code which **facilitates statically analysing the correctness** of our programs
    1. We want generated code which respects a **tolerant reader**
    2. We want the generated code to be usable in vanilla tech stacks **without forcing frameworks** on our consumers.

## Getting Started
### Prerequisite
The generated typescript types depend on runtime libraries which will need to be installed as `dependencies`. 
For actually generating code we need to install as `devDependencies` this package and the standard generator cli, this package depends on.

>  @openapitools/openapi-generator-cli wraps the java tolling which needs to be installed and requires a java runtime for execution.
- using npm
    ```shell
    npm i --save axios zod \
    && npm i --save-dev @dasaplan/openapi @openapitools/openapi-generator-cli
    ```
- using pnpm
    ```shell
    pnpm i --save axios zod \
    && pnpm i --save-dev @dasaplan/openapi @openapitools/openapi-generator-cli
    ```    

### usage
- For generating `ts-axios` client side code gen with `zod` schemas
    ```shell
    # assuming the root spec file is located at "$cwd/specs/generic/api.yml"
    # and assuming we want all generated files to find at "$cwd/out"
    oa-cli generate specs/generic/api.yml -output out
    ```

### customizing
- The used templates for the standard generator can be output at `$cwd/templates` which can be extended as stated in the official doc https://openapi-generator.tech/docs/templating
- When using custom / private maven registries see https://github.com/OpenAPITools/openapi-generator-cli?tab=readme-ov-file#using-custom--private-maven-registry
    ```json
    {
      "$schema": "./node_modules/@openapitools/openapi-generator-cli/config.schema.json",
      "spaces": 2,
      "generator-cli": {
        "version": "7.3.0",
        "repository": {
          "queryUrl": "https://private.maven.intern/solrsearch/select?q=g:${group.id}+AND+a:${artifact.id}&core=gav&start=0&rows=200",
          "downloadUrl": "https://private.maven.intern/maven2/${groupId}/${artifactId}/${versionName}/${artifactId}-${versionName}.jar"
        }
      }
    }
    ```

## Features
### Openapi Specification

#### bundler

-  [@dasaplan/openapi-bundler][@dasaplan/openapi-bundler] is used as pre-processing to ensure a certain state. This reduces the complexity e.g. code generation has to endure. 

### Code Generator

#### typescript-axios

The ts source code generator is a modified and configured wrapper of the standard [typescript-axios][typescript-axios] generator. 
The modification are aligned and derived from the project goals.

<details>
<summary>✅ <b>ensured discriminator values</b> on all union sub types</summary>
           
````typescript

module DSP_OPENAPI {
    // discriminator on Pet becomes redundant but does not hurt
    type Pet = { type: 'CAT' } & Cat | { type: 'DOG' } & Dog
    // discriminator value is known on type level
    interface Cat { type: 'CAT' }
    interface Dog { type: 'DOG' }
}

module Standard {
    type Pet = { type: 'CAT' } & Cat | { type: 'DOG' } & Dog
    interface Cat { type: string }
    interface Dog { type: string }
}

````
    
</details>
<details>
<summary>✅ <b><u>recursively</u></b> <b>ensured discriminator values</b> for nested union types</summary>
        
````typescript
type Pet = { type: 'CAT' } & Cat  | { type: 'DOG' } & Dog;
interface Dog { type: 'DOG' };

// in this exampel Cat is also a discriminated union and referenced from Pet
type Cat = { catType: 'SEAM' } & Seam | { catType: 'SHORT' } & ShortHair;
// all discriminator values for catType and type are ensured recursively 
interface Seam { catType: 'SEAM', type: 'CAT' }
interface ShortHair { catType: 'SHORT', type: 'CAT' }
````
    
</details>
<details>
<summary>✅ typescript compatible <b>unknown enum variant</b> which can be used in exhaustive switch cases</summary>
        
````typescript
type Pet = | { type: 'CAT' } & Cat | { type: 'DOG' } & Dog | { type: UNKNOWN_ENUM_VARIANT, [prop: string]: unknown }
// typesafe example for working with unknown values
function fooPet(pet: Pet): any {
    switch (pet.type) {
        case 'CAT':
            return doSomethingWithCat(pet);
        case 'DOG':
            return doSomethingWithDog(pet);
        // will throw compile error when missing    
        default:
            // exhaustiveness check: will throw compiler error for new variants
            const unknownVariant: UNKNOWN_ENUM_VARIANT = pet;
            logger.warning(`can't explicitly handle variant '${unknownVariant.type}' at the moment`);
            return applyDefaultOrThrow();
    }
}

````
    
</details>
<details>
<summary>✅ <b>match</b> ( switch alternative) <b>utility</b> for every union like type</summary>
        
````typescript

/* some example usage with utilities, note that the discriminator handling is handled by the generator */
function fooPet(pet: Pet): any {
    return Pet.match(pet, {
        'CAT': doSomethingWithCat,
        'DOG': doSomethingWithDog,
        onDefault: () => {
            logger.warning(`can't explicitly handle variant '${unknownVariant.type}' at the moment`);
            return applyDefaultOrThrow();
        }
    })
}

/* some example usage with utilities, note that the handler arguments are type safe*/
function fooPetNested(pet: Pet): any {
    return Pet.match(pet, {
        'CAT': (c) =>
            Cat.match(c, {
                'SEAM': () => 1.1,
                'SHORT': () => 1.2,
                onDefault: () => 1.3,
            }),
        'DOG': (d) => 2,
        onDefault: (unknown) => 3,
    });
````
    
</details>
<details>
<summary>✅ cleaned generator output</summary>

- Some files are being generated e.g. for packaging the types which are removed. This is merely a workaround which may be resolved with a better configuration.
- Reasoning: This project does not want to make assumptions on how the types are being packaged.
</details>

<p></p>
<details>
<summary> <b style="color: #2c6fdf">📜 complete example: ts-axios generator</b> </summary>

````typescript
export type UNKNOWN_ENUM_VARIANT = string & { readonly [tag]: "UNKNOWN"; };

interface Seam {
    catType: 'SEAM',
    type: 'CAT'
}

interface ShortHair {
    catType: 'SHORT',
    type: 'CAT'
}

type Cat = | { catType: 'SEAM' } & Seam 
           | { catType: 'SHORT' } & ShortHair 
           | { type: UNKNOWN_ENUM_VARIANT, [prop: string]: unknown }

interface Dog {
    type: 'DOG'
}

type Pet = | { type: 'CAT' } & Cat 
           | { type: 'DOG' } & Dog 
           | { type: UNKNOWN_ENUM_VARIANT, [prop: string]: unknown }

/** Utilities to work with the discriminated union Pet (will be generated for every discriminated or simple union) */  
export namespace Pet {
    type Handler<I, R> = (e: I) => R;
    type MatchObj<T extends Pet, R> = { [K in T as K["type"]]: Handler<Extract<T, { type: K["type"] }>, R> } & { onDefault: Handler<unknown, R> };
    
    /** All handler must return the same type*/
    export function match<R>(union: Pet, handler: MatchObj<Pet, R>): R {
        return union.type in handler ? handler[union.type](union as never) : handler.onDefault(union);
    }
    
    /** All handler must return the same type*/
    export function matchPartial<R>(union: Pet, handler: Partial<MatchObj<Pet, R>>): R | undefined {
        return union.type in handler ? handler[union.type]?.(union as never) : handler.onDefault?.(union);
    }
}

/* some example usage without utilities */
function fooPet(pet: Pet): any {
    switch (pet.type) {
        case 'CAT':
            return doSomethingWithCat(pet);
        case 'DOG':
            return doSomethingWithDog(pet);
        default:
            // exhaustiveness check: will throw compiler error for new variats
            const unknownVariant: UNKNOWN_ENUM_VARIANT = pet;
            logger.warning(`can't explicitly handle variant '${unknownVariant.type}' at the moment`);
            return applyDefaultOrThrow();
    }
}

/* some example usage with utilities, note that the discriminator handling is handled by the generator */
function fooPet(pet: Pet): any {
   return Pet.match(pet, {
       'CAT': doSomethingWithCat,
       'DOG': doSomethingWithDog,
       onDefault: () => {
           logger.warning(`can't explicitly handle variant '${unknownVariant.type}' at the moment`);
           return applyDefaultOrThrow();
       }
    })
}

/* some example usage with utilities, note that the handler arguments are type safe*/
function fooPetNested(pet: Pet): any {
    return Pet.match(pet, {
        'CAT': (c) =>
              Cat.match(c, {
                'SEAM': () => 1.1,
                'SHORT': () => 1.2,
                onDefault: () => 1.3,
              }),
        'DOG': (d) => 2,
        onDefault: (unknown) => 3,
    });
}
````

</details>

#### zod

-  [@dasaplan/openapi-codegen-zod][@dasaplan/openapi-codegen-zod] is used to generate zod schemas which respect a tolerant reader and is compatible with the generated typescript interfaces




[typescript-axios]: https://github.com/OpenAPITools/openapi-generator/blob/master/docs/generators/typescript-axios.md
[@dasaplan/openapi-bundler]: ../openapi-bundler/README.MD
[@dasaplan/openapi-codegen-zod]: ../openapi-codegen-zod/README.MD