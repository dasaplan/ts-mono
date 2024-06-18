# @dasaplan/openapi-bundler

- ✅ Configured wrapper of the standard [redocly](https://redocly.com/docs/cli/) bundler.
- ✅ Includes opinionated post-processing steps to transform the spec in a OpenApi 3.0.3 standard compliant way (see [spec-rules][spec-rules]).
- ✅ Is implemented against OpenApi 3.0.3.

## Getting started
### Prerequisite
- using npm
    ```shell
    # integrate in project
    npm i --save-dev @dasaplan/openapi-bundler
    ```    
    ```shell
    # global installation
    npm i -g @dasaplan/openapi-bundler
    ```    
- using pnpm
    ```shell
    # integrate in project
    pnpm i --save-dev @dasaplan/openapi-bundler
    ```    
    ```shell
    # global installation
    pnpm i -g @dasaplan/openapi-bundler
    ```    

### usage
- Bundle an OpenapiSpec
  ```shell
  # assuming the root spec file is located at "$cwd/specs/generic/api.yml"
  # and assuming we want all generated files to find at "$cwd/out"
  openapi-bundler-cli bundle specs/generic/api.yml -o ./out/bundled-api.yml
  ```
- See help for more options
    ```shell
    openapi-bundler-cli bundle --help
    ```
  
## Features
- ✅ Configured wrapper of the standard [redocly](https://redocly.com/docs/cli/) bundler.
> note: Example specs are written in a compressed but valid way to reduce whitespace and facilitate an overview over the whole example.

### post processing
<details>
<summary>✅ merge allOf subschemas</summary>

<details style="margin-left: 20px"><summary> motivation </summary>
Merging allOf arrays means we reduce complexity for generator and documentation tooling in order to facilitate consistency across tech stacks. 
<p>The easiest way would be to flat out every allOf so there resulting spec does not have the complexity at all. Yet, we need to find a middle ground because codegenerators may rely on identifiers like the discriminator to create object hierarchies.</p> 
We could just let every tool care for themselves how to handle their use-cases. However, from experience this will yield undefined behaviour for API consumer and lead to frustration because the default tooling does no yield results aligning with the specification.

```yaml
# schema declares $ref property but also other properties:
# most tools ignore everything besides $ref
# -> 🔥 unspecified behavior across tooling and use cases
RefSchema_with_dangling_properties:
  $ref: '#/A_Schema'
  description: "This is something I like to share!"
  title: RefSchema_with_dangling_properties

# schema declares allOf but declares further properties:
# most tool will merge siblings into array, but some may ignore them 
# -> 🔥 inconsistent behavior across tooling and use cases
AllOfSchema_with_dangling_properties:
  allOf: [ { $ref: '#/A_Schema'} ]
  properties: # sibling to allOf should be part of allOF
    name: { type: string }

# schema declares allOf with multiple elements:
# no problem for validators but code gen mostly try to merge them
# -> 🔥 merge behaviour may yield unexpected results
AllOfSchema_with_multi_elements:
  allOf:
    - $ref: '#/A_Schema',
    - $ref: '#/B_Schema',
    - properties: { foo: { type: string } }
```
</details>


<details style="margin-left: 20px">
<summary> src spec </summary>

````yaml
components:
  schemas:
    PetBase: 
      type: object,
      properties: { type: { type: string } }
    
    CatBase:  
      type: object,
      discriminator: { propertyName: catType },
      properties: 
        type: { type: string }, 
        catType: { type: string, enum: [ 'SEAM', 'SHORT_HAIR' ] } 

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
<summary>✅ support multi schema usage in discriminator mapping (1:n discriminator value to mapping)</summary>

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

[complex-petstore-src]: ../openapi-specs/specs/pets-modular-complex/petstore-api.yml

[complex-petstore-bundled]: ./docs/examples/specs/complex-petstore-bundled.yml

[complex-petstore-processed]: ./docs/examples/specs/complex-petstore-post-processed.yml

[simple-petstore-src]: ../openapi-specs/specs/pets-simple/pets-api.yml

[simple-petstore-bundled]: ./docs/examples/specs/simple-petstore-bundled.yml

[simple-petstore-processed]: ./docs/examples/specs/simple-petstore-post-processed.yml

[spec-rules]: ./docs/spec-rules.md