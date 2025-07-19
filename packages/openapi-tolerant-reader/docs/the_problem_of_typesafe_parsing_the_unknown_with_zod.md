---
title: The Problem of typesafe parsing the unknown with Zod
---
<!-- TOC -->
  * [The Challenge: Animal Shelter API Integration](#the-challenge-animal-shelter-api-integration)
    * [Getting started with the implementation](#getting-started-with-the-implementation)
    * [Parsing the response from the Animal Shelter's Rest API](#parsing-the-response-from-the-animal-shelters-rest-api)
  * [Problem 1: The Unknown Pet](#problem-1-the-unknown-pet)
  * [Problem 2: The Scaling Issue](#problem-2-the-scaling-issue)
  * [Problem 3: Type-Safe Handling the Unknown](#problem-3-type-safe-handling-the-unknown)
    * [Making a type-safe switch-case statement](#making-a-type-safe-switch-case-statement)
    * [Making an evolutionary stable switch-case statement](#making-an-evolutionary-stable-switch-case-statement)
  * [Conclusion](#conclusion)
<!-- TOC -->

In web development, handling data from external APIs can become quite a challenge. How do we safely handle potentially unknown or evolving data structure during runtime and compile time in TypeScript? This article explores practical solutions using Zod, focusing on real-world scenarios and scalable implementations.

## The Challenge: Animal Shelter API Integration

Let's explore this challenge through a practical example. An animal shelter likes to present their pets in an appealing way on their webpage. Our goal is to display a simple list of pets with appropriate icons:

```html
<div class="page">
    <h1> Animal Shelter Pets </h1>
    <h2> 😺: Kitty  </h2>
    <h2> 🐶: Snoopy </h2>
    <h2> ❓: Chewie </h2>
</div>
```

The shelter API is pretty large, but we are provided with a sample JSON response, tailored to our requirements:

```json
[ 
  { "id": "1", "type": "Cat",  "name": "Kitty"  }, 
  { "id": "2", "type": "Dog",  "name": "Snoopy" }, 
  { "id": "3", "type": "Bird", "name": "Chewie" }
]
```

### Getting started with the implementation

Let's get started by implementing the minimal valuable product (MVP). The MVP implementation fetches mock data, transforms it into a Pet model, and renders it.
But we immediately ran into an issue. 
Here's the key transformation logic:

```typescript

namespace MVP {
  type PetDto   = { id: string, name?: string, type: string };
  type PetModel = { name?: string; icon: "😺" | "🐶" | "❓" };

  async function createPetList(): Promise<Array<Pet>> {
    const response: unknown = await fetchPets();
    return response.map(mapToPetModel)
                // ❌ ^? Error: response is of type unknown
  }
  
  function mapToPetModel(dto: PetDto): Pet {
    switch (pet.type) {
      case "Cat": { return { name: pet.name, icon: "😺" }; }
      case "Dog": { return { name: pet.name, icon: "🐶" }; }
      default: {
        const unknownPet = pet as any;
        console.warn(`unknown pet type: ${pet.type}`);
        return { name: unknownPet.name, icon: "❓" };
      }
    }
  }
}

```

The implementation currently does not compile because return value of `fechtPets` is **unknown**. The type is unkown for us until we validate the shape of the response in respect to our expectations.

We were provided a pretty large Openapi specification as documentation for the Animal Shelters API. 
Writing the validation logic ourselves seems cumbersome in the long run. Hence, we decide to use a parsing library which nicely integrates with Openapi code generation. We decide to move forward with Zod as our parsing library.

---

### Parsing the response from the Animal Shelter's Rest API
For this iteration we write a minimal version of the API schemas by hand.

We skimmed through the API and can infer that **Pet** is a polymorphic **oneOf**-schema with a **discriminator** of the property "**type**". This means most fields depend on `pet.type`. In the API e.g., only a Cat has a required field "**mood**". Yet all pets have a field "**id**", "**name**" and "**type**".

The Pet schema looks like this:
```yaml
Pet:
  oneOf:
    - $ref: "#/components/schemas/Cat"
    - $ref: "#/components/schemas/Dog"
  discriminator:
    propertyName: "type"
```

Our codegenerator would translate a `oneOf` with `discriminator` into a Zod `discriminatedUnion`. Hence, our generated schemas would look like this:

```typescript
  // TODO: generate API schemas from Openapi specification
  namespace PetApi_v1_0 {
    const PetBase = z.object({ id: z.string(), name: z.string().optional() });
    const Cat = PetBase.extend(z.object({ type: z.literal("Cat"), mood: z.string()}));
    const Dog = PetBase.extend(z.object({ type: z.literal("Dog") }));

    export const Pet = z.discriminatedUnion("type", [Cat, Dog]);
    export const Pets = z.array(Pet);
  }
```

We extend `createPetList` by parsing the response with the Zod schema **Pets**. In case the payload does not match the schema, we will throw an error. However, our first take has an issue.

```typescript
  async function createPetList(): Promise<Array<Pet>> {
    const response: unknown = await fetchPets();
    const petsParseResult = PetApi_v1_0.Pets.safeParse(response);

    if (!petsParseResult.success) {
      throw new Error(`failed parsing pets response: ${JSON.stringify(petsParseResult.error)}`);
    }
    return petsParseResult.data.map(mapToPetModel)
  }
```

Running the code against the example data reveals an issue. Our error handling gets some work because we forgot to define a schema for the JSON value `{ "id": "3", "type2: "Bird", "name": "Chewie" }`.

```text
❌ Error: failed parsing pets response: {"issues":[{"code":"invalid_union","errors":[],"note":"No matching discriminator","path":[2],"message":"Invalid input"}]}
```

So, add a **Bird schema** and call it a day? There is a deeper problem here. We know that `"Bird"` is just an example for any kind of pet. It could be also `"Hamster"` but we actually don't know. We also don't know if all possible values are documented in the API. We can be certain that at any time, any value could be provided.

However, for us, it would be good enough to only parse **Cat** or **Dog** and put any other kind of animal in an "**unknown**" state. It is really no big deal for us if there is a different Pet because we handle it in our business logic `mapToPetModel` with a default case.
If we don't know the Pet, we will default to the "❓"-icon:

So, why not just extend the discriminatedUnion with a generic schema? Maybe we could expect any other string besides 'Cat' or 'Dog' for the **type**.

---

## Problem 1: The Unknown Pet

We like to have a generic schema with an unknown literal value for **type** but here we are limited with Zod.
If we create a schema **UnknownPet** and extend the **discriminatedUnion** accordingly, we will receive a runtime error.
Besides discriminatedUnions we may utilize `.union` or just `.or`. However, doing so, we will lose validation for our concrete schemas Cat and Dog.

For parsing `{ type: "Cat"}` we would expect a validation error because of a missing required field `mood`. Yet, because the union schema includes a generic option, we won't get an error.

```typescript
const Cat = z.object({ type: z.literal("Cat"), mood: z.string() });
const Dog = z.object({ type: z.literal("Dog") });
const UnknownPet = z.object({ type: z.string() });

const Pet = z.discriminatedUnion("type", [Cat, Dog, UnknownPet]);
   // ?^ ❌`Error: Invalid discriminated union option at index "2"` 

const PetOrUnkown = z.discriminatedUnion("type", [Cat, Dog]).or(UnknownPet);
const cat_or = PetOrUnkown.parse( {type: "Cat"})
   // ?^ { type: "Cat "} ❌ mood is missing

const PetUnion = z.union([Cat, Dog, UnknownPet]);
const cat_union = PetUnion.parse( {type: "Cat"})
  // ?^ { type: "Cat "} ❌ mood is missing
```

Instead of parsing an unknown type, what else can we do? There are a lot of workarounds we can come up with from manually handling invalid data to ditching Zod.
However, every workaround we can think of has all the same issues. They do not scale well.

## Problem 2: The Scaling Issue

Scaling issues arise when manually writing schemas for APIs with many fields and deeply nested polymorphic values. It just becomes more and more impractical with the size of the APIs.

This means, in the following example we would need to handle manually deeply nested **discriminatedUnion** like for `Cat.needs.features` or nested **enums** like `Cat.mood` or `Cat.needs.features.favorites`.

```typescript
const Dog = z.object({/**/})
const Cat = z.object({
        type: z.literal("Cat"),
        // ❌ unknown enum value
        mood: z.enum(["angry", "hungry"]),
        needs: z.array(z.object({
            // ❌ unknown discriminator value    
            features: z.discriminatedUnion(
                "type",
                [
                  z.object({
                    type: 'BREAKING_STUFF', 
                    //  ❌ unknown enum value                               
                    favorites: z.enum(["CABLE", "COUCH"]) 
                  }),
                  z.object({type: 'EATING', likesHunting: z.boolean()})
                ]
            )
        }))
    })
);
// ❌ unknown discriminator value    
export const Pet = z.discriminatedUnion("type", [Cat, Dog]);
```

Applying any workaround on that kind of schema takes significant more effort as for the simple example. Now let us imagine an API with over 500 fields and a significant depth.

We may think, well, that is just bad API design. Isn't that why we have HATEOAS principles for REST or technologies like graphQL?  

And our thoughts may be right for some APIs and use cases. Then we take a deep breath and allow us to remember of integrating all the large messy enterprise APIs within our careers.
The reality is, we always need to handle the unknown. And we need to handle the unknown consistently and reliably.

To scale well, we need to be able to generate code or schemas which allow us to type-safe validate and parse any response size or depth.

## Problem 3: Type-Safe Handling the Unknown

In TypeScript, we embrace correctness and evolutionary stability. We are happy when we encounter compile errors when something changes over time. And we are sad when we have to rely on runtime errors. We love exhaustive switch cases.

A *switch case* is **exhaustive** if all possible values of a type are *explicitly* handled. An **enum** or a **constant set** of values yields a case for every statically known value. A **string** as a type holds *infinite* values. We handle *infinity* with a **default** case.

Let's take a look at our previous example **mapToPetModel**. The interesting part is the default case because it will only execute for **unknown** values for **pet.type**.  
The switch case is exhaustive. Is it **typesafe**? Is it **evolutionary stable**?

### Making a type-safe switch-case statement

If we create a switch-case on a union type and define a case for every known value, we won't get any compiler errors. TypeScript will not complain because every statically known value is handled. What we are missing, however, is the possibility that the union type is incomplete.

```typescript
interface PetDto { /*...*/
  type: 'Cat' | 'Dog'
  // ^? ❌ incomplete set - missing unknown
}

function mapToPetModel(dto: PetDto): Pet {
  switch (pet.type) {
    // ^? ❌ exhaustive without default
    case "Cat": { /*..*/ }
    case "Dog": { /*..*/ }
  }
}

```

This compiles just fine, but we rather like to have a compiler error since we know `type` may be any string. Hence, to make it typesafe, we need to describe **unknown values**. But there is a catch. We can't just extend the union with `string`.

If we extend the union **'Cat' | 'Dog'** with **string**, TypeScript will only see **string**.
Thus, we lose type information. 

Though, there is a little intersection trick for keeping type inference in place and enforce handling with a default case. If we intersect `string & {}` or `string & Record<string,never>` we will still see all variations of the union.

```typescript
type PetDto = {
    // type?: 'Cat' | 'Dog' | string <? ❌ TS infers string
    type: 'Cat' | 'Dog' | string & {}
      // ^? ✅ TS infers 'Cat' | 'Dog' | string
}; 

function transformPet(pet:PetDto): Pet {
// ✅ ?^ Error TS2366: Function lacks ending return statement...
    switch (pet.type) {
        case "Cat": { /* ... */}
        case "Dog": { /* ... */}
    }
}
```

### Making an evolutionary stable switch-case statement

What if the code and type evolve? What if the API changes and there is a new pet type Bird, we need to handle?

If we have a default case in place, we won't get any compiler error if we are not handling Bird. The default case already handles any new **type** including petType **"Bird"**.

But we can fix that. To do so, we need to explicitly define a type check with `unknownPetType: never = pet.type` in the default case. This will yield a compiler error because we are missing explicitly handling a value **Bird** which is a *string* and not *never*. 
```typescript
interface PetDto {  type: 'Cat' | 'Dog' | 'Bird' }; 

function transformPet(pet:PetDto): Pet {
    switch (pet.type) {
        case "Cat": {  /*..*/ }
        case "Dog": { /*..*/ }
        default: {
          // keep unused for compiler error
          const _unknownPetType: never = pet.type
          // ✅ ?^ Error TS2322: Type string is not assignable to type never
          /*.handle default */
        }
    }
}
```
## Conclusion

Throughout this article, we've explored the challenges of type-safe parsing of unknown data structures using Zod in TypeScript, particularly when dealing with external APIs. We've identified three main problems and their solutions:

1. Handling unknown pet types in discriminated unions requires careful consideration, as simple solutions like extending with generic schemas can lead to validation issues.

2. Scaling becomes problematic with complex, deeply nested polymorphic structures, highlighting the need for a systematic approach to handle unknown values at any level.

3. Type-safety and evolutionary stability can be achieved through clever TypeScript patterns, such as using string intersections (`string & {}`) to maintain type inference while handling unknowns, and implementing explicit type checks in default cases to catch missing handlers when new types are added.

These solutions provide a robust foundation for building maintainable applications that can gracefully handle both known and unknown data structures while maintaining type safety. By implementing these patterns, we can create more resilient systems that adapt to API changes while catching potential issues at compile time rather than runtime.

You may find a solution incorporating those patterns interesting which will be discussed in [A Solution for typesafe parsing the unknown with zod](a_solution_for_typesafe_parsing_the_unknown.md)