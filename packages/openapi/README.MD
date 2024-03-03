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
- The used templates for the standard generator will be output at `$cwd/templates` which can be extended as stated in the official doc https://openapi-generator.tech/docs/templating
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
> note: Some examples like OpenApi Specs are written in a compressed way to reduce whitespace and facilitate an overview over the whole example.
### Openapi Specification

#### bundler

- ✅ Configured wrapper of the standard [redocly](https://redocly.com/docs/cli/) bundler.

#### post processing
<details>
<summary>✅ merge all of</summary>

<details style="margin-left: 20px"><summary> motivation </summary>
Merging allOf arrays means we reduce complexity for generator and documentation tooling in order to facilitate consistency across tech stacks. 
<p>The easiest way would be to flat out every allOf so there resulting spec does not have the complexity at all. Yet, we need to find a middle ground because codegenerators may rely on identifiers like the discriminator to create object hierarchies.</p> 
We could just let every tool care for themselves how to handle their use-cases. However, from experience this will yield undefined behaviour for API consumer and lead to frustration because the default tooling does no yield results aligning with the specification.

```yaml
# schema declares a $ref and has sibling members: almost any tool I encounter will ignore the siblings on a $ref in alignment with the Openapi Spec 
SomeRefSchema:
  $ref: '#/SomeOtherComposite'
  description: "This is something I like to share!"
  title: SomeRefSchema
  
# schema declares allOf but has also sibling members: most tool will merge siblings into array, but some may ignore them 
MySchema:
  allOf: [{$ref: '#/SomeOtherComposite'}]
  properties: # sibling member should be part of allOF
    name: { type: string }

# multiple allOfs a payload must be valid against all sub schemas. This is very easy to compute for validators because they will only care and evaluate each element in isolation. Yet, for generators or documentation tools this representation leaves many question open because we need to resolve them into a unified view like how to represent collisions.
MyOtherSchema:
  allOf: [{$ref: '#/SomeComposite'}, {$ref: '#/SomeOtherComposite'}, {properties: {foo: {type: string}}}]
```
</details>



<details style="margin-left: 20px">
<summary> src spec </summary>

````yaml
components:
  schemas:
    PetBase: { type: object,
               properties: { type: { type: string } }
    }
    CatBase: { type: object,
               discriminator: {propertyName: catType},
               properties: { type: { catType: string, enum: [ 'SEAM', 'SHORT_HAIR' ] } }
    }

    SeamCat:
      allOf:
        - $ref: '#/components/PetBase'
        - $ref: '#/components/CatBase'
        - title: SeamCat
    ShortHairCat:
      allOf:
        - $ref: '#/components/PetBase'
        - $ref: '#/components/CatBase'
        - title: ShortHairCat

    Dog: { allOf: [ { $ref: '#/components/PetBase' }, { title: Dog } ] }



````
</details>

<details style="margin-left: 20px">
<summary> resulting spec </summary>

````yaml
components:
  schemas:
    PetBase: { type: object, required: [type] discriminator: {propertyName: type},properties: { type: { type: string } } }

    SeamCat:
      allOf:
        - $ref: '#/components/PetBase'
        - { title: SeamCat, type: object, properties: { type: { catType: string, enum: [ 'SEAM', 'SHORT_HAIR' ] } } }

    ShortHairCat:
      allOf:
        - $ref: '#/components/PetBase'
        - { title: ShortHairCat, type: object, properties: { type: { catType: string, enum: [ 'SEAM', 'SHORT_HAIR' ] } } }

    Dog:
      allOf:
        - $ref: '#/components/PetBase'
        - title: Dog 
````
</details>
</details>



<details>
<summary>✅ ensure discriminator values</summary>

- ensures that: 
    - discriminator property type is of type string, and not enum. 
      - most sophisticated tools can infer the values from the explicit or implicit discriminator mapping
  - polymorphism and inheritance can be explicitly inferred from the spec
    - every polymorph subschema defines the discriminator property and respective value
      - this is only necessary to extend the standard generator with templating
      - discriminator value is declared with <b>x-const</b> to avoid triggering compatibility layers for discriminator
    - any parent schema referenced from an allOf array does not define discriminator mapping
    - discriminator mapping only exists on schemas with a oneOf member

</details>
<details>
<summary>✅ support muli schema usage in discriminator mapping (1:n discriminator value to mapping)</summary>

````yaml
Cat:
  type: object
  properties:
    type: 
      type: string
      x-const: [ 'SEAM', 'SHORT_HAIR' ]
    
MyOneOfSchema:
  oneOf: [{$ref: '#/Dog', {$ref: '#/Cat'}}]
  discriminator:
    propertyName: 'type'
    mapping:
      SEAM: "#/Cat"
      SHORT_HAIR: "#/Cat"
      Dog: "#/Dog"
````
</details>
<p></p>
<details>
<summary> <b style="color: #2c6fdf">📜 complete example: openapi post-processing </b> </summary>

| examples | src                                 | bundled                                     | post-processed                                       |
|----------|-------------------------------------|---------------------------------------------|------------------------------------------------------|
| simple   | [link to src][simple-petstore-src]  | [link to bundled][simple-petstore-bundled]  | [link to post-processed][simple-petstore-processed]  |
| complex  | [link to src][complex-petstore-src] | [link to bundled][complex-petstore-bundled] | [link to post-processed][complex-petstore-processed] |

</details>

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
export module Pet {
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

[complex-petstore-src]: ./test/specs/pets-modular-complex/petstore-api.yml

[complex-petstore-bundled]: ./docs/examples/specs/complex-petstore-bundled.yml

[complex-petstore-processed]: ./docs/examples/specs/complex-petstore-post-processed.yml

[simple-petstore-src]: ./test/specs/pets-simple/pets-api.yml

[simple-petstore-bundled]: ./docs/examples/specs/simple-petstore-bundled.yml

[simple-petstore-processed]: ./docs/examples/specs/simple-petstore-post-processed.yml

[typescript-axios]: https://github.com/OpenAPITools/openapi-generator/blob/master/docs/generators/typescript-axios.md