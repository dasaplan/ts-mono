<!-- TOC -->
* [How to typesafe parse the unknown with Zod](#how-to-typesafe-parse-the-unknown-with-zod)
  * [Example: Animal shelter pet list](#example-animal-shelter-pet-list)
    * [Getting started with the implementation](#getting-started-with-the-implementation)
    * [Parsing the response from the Animal Shelter's Rest API](#parsing-the-response-from-the-animal-shelters-rest-api)
  * [Problem 1: The Unknown Pet](#problem-1-the-unknown-pet)
    * [Fix Attempt 1: discriminatedUnion([ Cat, Dog, UnknownPet])](#fix-attempt-1-discriminatedunion-cat-dog-unknownpet)
    * [Fix Attempt 2: Union - Cat.or(Dog).or(UnknownPet)](#fix-attempt-2-union---catordogorunknownpet)
    * [Fix Attempt 3: Working around zod schemas](#fix-attempt-3-working-around-zod-schemas)
  * [Problem 2: The Scaling Issue](#problem-2-the-scaling-issue)
  * [Problem 3: Type-Safe Handling the Unknown](#problem-3-type-safe-handling-the-unknown)
    * [Making a type-safe switch-case statement](#making-a-type-safe-switch-case-statement)
    * [Making an evolutionary stable switch-case statement](#making-an-evolutionary-stable-switch-case-statement)
  * [A Solution: Tolerant Discriminated Union Schema](#a-solution-tolerant-discriminated-union-schema)
    * [Problem Recap](#problem-recap)
    * [Creating A Custom Zod Schema](#creating-a-custom-zod-schema)
    * [Bonus: Generic Tolerant Zod union](#bonus-generic-tolerant-zod-union)
    * [Solving the evolution problem](#solving-the-evolution-problem)
<!-- TOC -->
# How to typesafe parse the unknown with Zod

This article addresses the challenges of parsing unknown data from APIs using Zod, focusing on type-safe handling and scalable solutions.

You will find a lot of code examples which are intended to be read along the text.
However, you may jump directly into the last section where the article provides a summary of the key issues.

## Example: Animal shelter pet list

We like to display pets from an animal shelter in an appealing way. For the MVP we just need a list of names with icons for cats and dogs.

```html
<div class="page">
    <h1> Animal Shelter Pets </h1>
    <h2> 😺: Kitty  </h2>
    <h2> 🐶: Snoopy </h2>
    <h2> ❓: Chewie </h2>
</div>
```

The shelter API is pretty large, but we are provided with an example JSON response, tailored to our requirements:

```json
[ 
    { "type": "Cat", "name": "Kitty" }, 
    { "type": "Dog", "name": "Snoopy" }, 
    { "type": "Bird", "name": "Chewie" }
]
```

---

### Getting started with the implementation

Let's get started by implementing the MVP logic.
The MVP implementation fetches mock data, transforms it into a Pet model, and renders it.

Here's the key transformation logic:

```typescript

namespace MVP {
  type Pet = { id: string; name?: string; icon: "😺" | "🐶" | "❓" };

  async function createPetList(): Promise<Array<Pet>> {
    const pets: any = await fetchPets();
    return pets.map((pet: any) => {
      switch (pet.type) {
        case "Cat": { return { name: pet.name, icon: "😺" }; }
        case "Dog": { return { name: pet.name, icon: "🐶" }; }
        default   : { return { name: pet.name, icon: "❓" }; }
      }
    });
  }
}

```

Let's test the implementation to see if we are on track. Therefore, we implement the main and a render function along with the test.

```typescript
namespace MVP {
  function renderPage(pets: Array<Pet>): string {
    const header = "<h1>Animal Shelter Pets</h1>";
    const petList = pets.map((p) => `<h2> ${p.icon}: ${p.name ?? ""} </h2>`);
    return `<div class="page">\n\t${header}\n\t${petList.join("\n\t")} \n </div>`;
  }

  export async function displayPets(): Promise<string> {
    const petsWithicons = await createPetList();
    return renderPage(petsWithicons);
  }
}
test("Renders mvp correctly", async () => {
  const page = await MVP.displayPets();
  expect(page).toMatchInlineSnapshot(`
    "<div class="page">
     <h1>Animal Shelter Pets</h1>
     <h2> 😺: Kitty </h2>
     <h2> 🐶: Snoopy </h2>
     <h2> ❓: Chewie </h2> 
     </div>"
  `);
});
```

With the MVP implementation in place, we have a good starting point to further iterate on the integration with the Animal Shelter API.

Let's collect the TODOS from the MVP for the next iteration:

TODOS:

1) parse pets response to avoid 'any'
2) replace mock response with api call

We decide that parsing the response will be our next task. We will use Zod as our parsing library.

---

### Parsing the response from the Animal Shelter's Rest API

The Animal Shelters API is pretty large. We plan to later generate the Schemas from the Openapi specification. However, for this iteration we write a minimal version of the schemas by hand.

We skimmed through the API and can infer that **Pet** is a **oneOf**-schema with a **discriminator** of the property "**type**". This means most fields depend on the pet.type. In the API only a Cat e.g., has a field "**mood**". Yet all pets have a field "**id**", "**name**" and "**type**".

```typescript
  // TODO: generate API schemas from Openapi specification
  namespace PetApi_v1_0 {
    const PetBase = z.interface({ id: z.string(), name: z.string().optional() });
    const Cat = PetBase.extend(z.interface({ type: z.literal("Cat") }));
    const Dog = PetBase.extend(z.interface({ type: z.literal("Dog") }));

    export const Pet = z.discriminatedUnion([Cat, Dog]);
    export const Pets = z.array(Pet);
  }

  async function createPetList(): Promise<Array<Pet>> {
    const response: unknown = await fetchPets();
    const petsParseResult = PetApi_v1_0.Pets.safeParse(response);

    if (!petsParseResult.success) {
      console.error(`failed parsing pets response: ${JSON.stringify(petsParseResult.error)}`);
      return [];
    }
    return petsParseResult.data.map(mapToPetModel)
  }
```

Our first take on the zod schema **Pet** and **createPetList** has an issue. When we ran our test, we get the following nasty error:

```text
failed parsing pets response: {"issues":[{"expected":"string","code":"invalid_type","path":[0,"id"],"message":"Invalid input: expected string, received undefined"},{"expected":"string","code":"invalid_type","path":[1,"id"],"message":"Invalid input: expected string, received undefined"},{"code":"invalid_union","errors":[],"note":"No matching discriminator","path":[2],"message":"Invalid input"}]}
```

We forgot to define a schema for the value  `{ "type": "Bird", "name": "Chewie" }`. Zod tried every possible union option without a match. Every try yields an issue. So, add a Bird schema and call it a day?

There is a deeper problem here. We know that "Bird" is just an example for any kind of pet. It could be also "Hamster" but we actually don't know. We also don't know if all possible values are documented in the API. At any time, any value could be provided.

However, for us, it would be good enough to only parse **Cat** or **Dog** and put any other kind of animal in an "**unknown**" state. It is really no big deal for us if there is a different Pet because we handle it in our business logic with a default case.
If we don't know the Pet, we will default to the "❓"-icon:

```typescript
function mapToPetModel(dto: {id: string, name?: string, type: string }): Pet {
    switch (pet.type) {
      case "Cat": { return { id: pet.id, name: pet.name, icon: "😺" }; }
      case "Dog": { return { id: pet.id, name: pet.name, icon: "🐶" }; }
      default: { 
         const unknownPet = pet as any; 
         console.warn(`unknown pet type: ${pet.type}`);
         return { id: unknownPet.id, name: unknownPet.name, icon: "❓" };
      }
    }
}
```

So, why not just extend the discriminatedUnion with a generic schema o? Since all Pets seem to have an **id** and a **name**, we could maybe expect any other string for the **type**, hence an unknown value?

---

## Problem 1: The Unknown Pet

We like to have a generic schema with an unknown literal value for **type** but we are limited with Zod.
If we create a schema **UnknownPet** and extend the **discriminatedUnion** accordingly, we will receive an runtime error.
Besides discriminatedUnions we could utilize `.union` or just `.or`. However, doing so, we will loose validations for our concrete schemas.

```typescript
const Cat = z.interface({ mood:    z.string(), type: z.literal("Cat") });
const Dog = z.interface({ toyName: z.string(), type: z.literal("Dog") });
const UnknownPet = z.interface({ type: z.string() };

const Pet = z.discriminatedUnion([Cat, Dog, UnknownPet]);
   // ?^ `Error: Invalid discriminated union option at index "2"` 

const PetOrUnkown = z.discriminatedUnion([Cat, Dog]).or(UnknownPet);
const Cat = PetOrUnkown.parse( {type: "Cat"})
   // ?^ { type: "Cat "} ❌ mood is missing
```

Instead of parsing an unknown type, why not just handle the "invalid union" Exception?

If `.safeParse` or try-catch `.parse` run into an error state, we only have access to the error. There is no "partially parsed success value." However, we have access to the **path** where the issue occurred.

Having this information, there are a lot of workarounds we can come up with.  

* We could post process the response data and handle the error path.
* We could process only parts of the response like parse each array element with **Pet**.
* We could ditch Zod and just use plain JavaScript for parsing.

Every workaround we can think of has all the same issues. They do not scale.

## Problem 2: The Scaling Issue

Scaling issues arise when manually writing schemas for APIs with numerous fields and deeply nested polymorphic values. It just becomes more and more impractical with the siye of the APIs.

This means, in the following example we will need to handle manually deeply nested **discriminatedUnion** e.g., for `Cat.needs.features` or nested **enums** like `Cat.mood` or `Cat.needs.features.favorites`.

```typescript
const Dog = z.interface({ id: z.string(), type: z.literal("Dog")});
const Cat = PetBase.extend(
    z.interface({ 
        type: z.literal("Cat"),
        // unknown enum value?
        mood: z.enum(["angry", "hungry"]),
        needs: z.array(z.interface({
            name: z.string(),
            // unknown discriminator value?    
            features: z.discriminatedUnion( 
                [
                    z.interface({ 
                        type: 'BREAKING_STUFF', 
                        // unknown enum value?                               
                        favorites: z.enum(["CABLE", "COUCH"]) 
                    }),
                    z.interface({ 
                        type: 'EATING', 
                        likesHunting: z.boolean()
                    }),
                ]
            )
        }))
    })
);

export const Pet = z.discriminatedUnion([Cat, Dog]);

```

Applying any workaround on that kind of schema takes significant more effort as for the simple example. Now let us imagine an API with over 500 fields and a depth up to six, ten, or more.

We may think, well, that is just bad API design. Isn't that why we have HATEOAS principles for REST or technologies like graphQL?  

And our thoughts may be right. Then we take a deep breath and allow us to remember of integrating all the large messy enterprise APIs within our careers. The reality is, we need to handle the unknown. And we need to handle the unknown consistently and reliably.

To scale well, we need to be able to generate code or schemas which allow us to type-safe validate and parse any response size or depth.

## Problem 3: Type-Safe Handling the Unknown

In TypeScript, we embrace correctness. We embrace evolutionary stability. We are happy when we encounter compile errors when we change something. And we are sad when we have to rely on runtime errors. We love exhaustive switch cases.

A *switch case* is **exhaustive** if all possible values of a type are *explicitly* handled. An **enum** or a **constant set** of values yields a case for every statically known value. A **string** as a type is *infinite*. We handle *infinite* with a **default** case.

Let's take a look at our previous example **createPetList**. The example now declares an interface **PetDto** which represents how we expect the response JSON to be structured. We have omitted parsing with zod and just "believe" the data is formed as our model. There will be no runtime error if the data does not match the interface. It is the JavaScript way.

```typescript
interface PetDto {
     id?: string;
     name?: string;
     type?: 'Cat' | 'Dog'
}; 

async function createPetList(): Promise<Array<Pet>> {
  const pets: Array<PetDto> = await fetchPets();
  return pets.map((pet) => {
    switch (pet.type) {
      case undefined: {
          console.warn(`missing pet type for pet: ${JSON.stringify(pet)}`);
          return undefined;
      }
      case "Cat": {
        return { id: pet.id, name: pet.name, icon: "😺" };
      }
      case "Dog": {
        return { id: pet.id, name: pet.name, icon: "🐶" };
      }
      default: {
        const unknownPet = pet as any;
        console.warn(`unknown pet type: ${pet.type}`);
        return { id: unknownPet.id, name: unknownPet.name, icon: "❓" };
      }
    }
  }).filter(pet => pet && pet !== null);
}
```

In this version of the example every field in the response is **optional**.
The undefined handling with the new case and filter is only introduced due to making everything optional.

The interesting part is the default case because it will only be executed for **unknown** values for **pet.type**.  

The switch case is exhaustive. Is it **typesafe**? Is it **evolutionary stable**?

### Making a type-safe switch-case statement

If we create a switch-case on a union type and define a case for every known value, we won't get any compiler errors. TypeScript will not complain because every statically known value is handled.

What we are missing is the possibility that the union type is incomplete.

Let's take a look at this more simplified example with **transformPet**, where we only have a single required PetDto.

```typescript
interface PetDto {
    name?: string;
    type: 'Cat' | 'Dog'
}; 

function transformPet(pet:PetDto): Pet {
    switch (pet.type) {
        case "Cat": {
            return { name: pet.name, icon: "😺" };
        }
        case "Dog": {
            return { name: pet.name, icon: "🐶" };
        }
    }
}
```

This compiles just fine, but we know the union PetDto.type is incomplete. To make it typesafe, we need to describe **unknown values**.

```typescript
type PetDto = {
    name?: string;
    type?: 'Cat' | 'Dog' | string
}; 

// test type inference
const catTypeTest: PetDto['type'] = "Cat" as const;
      // ?^ string | undefined

function transformPet(pet:PetDto): Pet {
// ?^ TS2366: Function lacks ending return statement and return type does not include undefine
    switch (pet.type) {
        case "Cat": {
            return { name: pet.name, icon: "😺" };
        }
        case "Dog": {
            return { name: pet.name, icon: "🐶" };
        }
    }
}
```

If we extend the union with **'Cat' | 'Dog'** with **string**, TypeScript will only see **string**.
Thus, we lose type information. However, we have a compiler error for **transformPet** because we are missing the **default case**.

There is a little intersection trick for keeping type inference in place.

```typescript

type PetDto = {
    name?: string;
    type?: 'Cat' | 'Dog' | string & {}
}; 

// test type inference
const catTypeTest: PetDto['type'] = "Cat";
      // ?^ 'Cat' | 'Dog' | string & {}
```

 If we intersect `string & {}` or `string & Record<string,never>` we will still see all variations of the union.

### Making an evolutionary stable switch-case statement

What if the code and type evolve? What if the API changes and there is a new pet type Bird, we want to handle?

If we have a default case in place, we won't get any compiler error. Let's see.

```typescript
interface PetDto {
     id?: string;
     name?: string;
     type?: 'Cat' | 'Dog' | 'Bird'
}; 

function transformPet(pet:PetDto): Pet {
    switch (pet.type) {
        case "Cat": {
            return { name: pet.name, icon: "😺" };
        }
        case "Dog": {
            return { name: pet.name, icon: "🐶" };
        }
        default: {
          const unknownPet = pet as any;
          console.warn(`unknown pet type: ${pet.type}`);
          return { id: unknownPet.id, name: unknownPet.name, icon: "❓" };
        }
    }
}
```

No compiler errors. The default case already handled the new petType "Bird".
We can introduce a typecheck with `unknownPetType: never`. This will yield a type error if we are missing explicitly handling a value.

```typescript
interface PetDto {
     id?: string;
     name?: string;
     type?: 'Cat' | 'Dog' | 'Bird'
}; 

function transformPet(pet:PetDto): Pet {
    switch (pet.type) {
        case "Cat": {
            return { name: pet.name, icon: "😺" };
        }
        case "Dog": {
            return { name: pet.name, icon: "🐶" };
        }
        default: {
          // keep unused: typecheck will yield compile error for unhandled pet.type
          const _unknownPetType: never = pet.type
              // ?^ TS2322: Type string is not assignable to type never
          const unknownPet = pet as any;
          console.warn(`unknown pet type: ${_unknownPetType}`);
          return { id: unknownPet.id, name: unknownPet.name, icon: "❓" };
        }
    }
}
```

We need to explicitly define a type check in the default case to get informed by the compiler that we are missing a case for the value **Bird**.

## A Solution: Tolerant Discriminated Union Schema

At this point, we should have a good understanding of the problem space around **type-safe parsing the unknown with Zod**. We talked about three concrete problems our solution should take into account. Let's make a quick recap and extract our requirements from it.

### Problem Recap

In **"Problem 1: The Unknown Pet"** we looked into parsing a discriminated union where we do not know the provided value for the discriminator at compile time.
Hence, speaking in TypeScript, our solution should be able to handle the following union type for a given concrete discriminator property.

```typescript
type UnknownPet = { type: string & {}; [additional: string]: unknown };
type Pet = UnknownPet | { type: "Cat" } | { type: "Dog" };
```

Tinkering around to solve Problem 1, we ran into **"Problem 2: The Scaling Issue""**.
We noted that we need to be able to integrate a tolerant parsing alternative for discriminated unions into code generation tooling.

Since we already have Zod for our parsing library, and we can generate schemas:
```The solution must integrate nicely with Zod schemas.```

Finally, we looked at **"Problem 3: Type-Safe Handling the Unknown**" where we talked about exhaustive switch-statements, the impact of the **default case** on the evolutionary stability of our code, and the type inference of a union with string.

```typescript
type PetType_a = "Cat" | "Dog" | string
      // ?^ string
type PetType_b = "Cat" | "Dog" | string & {}
      // ?^ "Cat" | "Dog" | string & {}
```  

So our solution should ensure that we are ```still able to discriminate against unions```. We also need a sustainable way to ```explicitly handle the default cases while getting compiler errors if new known unhandled cases are added later```.

### Creating A Custom Zod Schema

In Zod we can utilize ```z.custom()``` to create our own discriminated union schema.
Let's remind ourselves how `discriminatedUnion` in Zod (v3) is defined.

```typescript
const PetSchema = z.discriminatedUnion("type", [Cat, Dog, UnkonwnPet]);
// parse data
const cat = PetSchema.parse({ type: "Cat"})
const dog = PetSchema.parse({ type: "Dog"})
const unknownPet = PetSchema.parse({ type: "Bird"})
```

For the schema definition, Zod takes the discriminator-property and the union schemas.
When we parse data, we provide for the discriminator-property the respective discriminator-values.
Internally, Zod will map the discriminator-values to the respective schemas we provided in the schema definition.

So, to create a discriminated union, we know that we need to incorporate static information regarding discriminator-property, discriminator-values, schemas, and a mapping between discriminator-values and schemas.

The recipe to a tolerant Zod schema should look like this

```text
- Input:
  - discriminator property e.g. "type"
  - discriminator values e.g. "Cat", "Pet", string
  - schemas e.g. Cat, Pet, UnknownPet
  - mapping e.g. {"Cat": Cat, "Pet": Pet, "unknownValue": UnknownPet}
- Output:
  - ZodSchema
```

As we can see, there are some redundancies. We can simplify the input information, because in the mapping we already have discriminator-values and schemas

```text
- Input:
  - discriminator property e.g. "type"
  - mapping e.g. {"Cat": Cat, "Pet": Pet, "unknownValue": UnknownPet}
- Output:
  - ZodSchema
```

How would a function signature look like for this specification?

```typescript
const mapping = { "Cat": Cat, "Dog": Dog, onDefault: UnknownPet } as const;
function createTolerantSchema(discriminator: "type", mapping: typeof mapping): z.ZodCustom {
  // insert magic
  return z.custom();
};
```

There you go, easy-peasy. A tolerant discriminated union... okay, let's implement it.

In the implementation we need to do just a few things:

* Find discriminator property in parse value
* Use discriminator value to get the respective schema from the map
* Use respective schema to parse the value
* Assert various error cases
  * Error: expected value to be defined
  * Error: expected value to be of type object
  * Error: expected discriminator property to be defined in value
  * Error: expected discriminator property to be of type string in value
  * Error: zod schema validation error

Let's implement the todos for the Pet example. Later we can think about a more generic solution.

```typescript
const PetBase = z.interface({id: z.string(), name: z.string().optional()});
const Cat = PetBase.extend(z.interface({type: z.literal("Cat")}));
const Dog = PetBase.extend(z.interface({type: z.literal("Dog")}));
const UnknownPet = PetBase.extend(z.interface({type: z.string().transform((val) => val as string & {})}).loose());

const PetMatcher = {Cat: Cat, Dog: Dog, onDefault: UnknownPet} as const;
const Pet = createTolerantPetSchema("type", PetMatcher);

type TPetMatcher = typeof PetMatcher;

export function createTolerantPetSchema(discriminator: "type", matcher: TPetMatcher) {
  return z.custom((val) => {
    if (typeof val !== "object" || val === null) {
      // invalid payload
      return false;
    }
    if (!(discriminator in val) || typeof val[discriminator] !== "string") {
      // invalid payload, invalid discriminator
      return false;
    }
    const discriminatorValue = val[discriminator];
    const schema = discriminatorValue in matcher ? matcher[discriminatorValue as keyof TPetMatcher] : matcher["onDefault"];
    const parsed = schema.safeParse(val);
    return parsed.success ? parsed.data : false;
  });
}
```

All right, this looks not too bad. The function returns a `z.custom()`, on parse, we return either the `parsed data` or `false`. In case of `false` Zod will yield a generic custom error message.
If we run some tests, we see this works just as we would expect. However, if we look at the error message, we will not be able to infer what was wrong.

```typescript
test("tolerant union schema", () => {
  // success true
  expect(Pet.safeParse({ id: "string", type: "Cat" }).success, "must parse valid Cat").toEqual(true);
  expect(Pet.safeParse({ id: "string", type: "Cat", name: "foo" }).success, "must parse valid Cat with optional field").toEqual(true);
  expect(Pet.safeParse({ id: "string", type: "Cat", name: "foo", bar: 2 }).success, "must parse valid Cat with additional field").toEqual(true);
  // success false
  expect(Pet.safeParse({ id: "string", type: "Cat", name: 2 }).success, "name must be ot type string").toEqual(false);
  // unknown values
  expect(Pet.safeParse({ id: "string", type: "Unknown", name: "foo", a: 1 }).success, "must parse unknown values for type").toEqual(true);
  expect(Pet.safeParse({ id: "string", type: "Unknown", name: 2, a: 1 }).success, "name must be ot type string").toEqual(false);
  // error message
  expect(Pet.safeParse({ id: "string", type: "Cat", name: 2 }).error, "name must be ot type string").toMatchInlineSnapshot(`
  ZodError {
    "issues": [
      {
        "code": "custom",
        "message": "Invalid input",
        "path": [],
      },
    ],
  }
`);
});

```

With `z.custom()` we only can define a single error message but we don't have access to our validation cases.
In Zod v3 we could utilize `.superRefine` in order to yield validation context specific error issues.

In Zod v4 `.superRefine` got deprecated. AFAIK, the next best thing where we have access to the context is `.transform`.
If we rewrite the previous function with transform and concrete error messages, the function will look like this.

```typescript
export function createTolerantPetSchema(discriminator: "type", matcher: TPetMatcher): z.ZodCustom {
  return z.custom().transform((val, ctx) => {
    if (typeof val !== "object" || val === null) {
      // invalid payload
      ctx.issues.push({
        input: val,
        code: "invalid_type",
        message: `expected value to be an object but received ${typeof val}`,
        expected: "object",
      });
      return val;
    }
    if (!(discriminator in val) || typeof val[discriminator] !== "string") {
      // invalid payload, invalid
      ctx.issues.push({
        input: val,
        code: "custom",
        message: `required discriminator '${discriminator}' of type string is missing in value. value.keys: ${Object.keys(val)?.join(", ") ?? "none"}`,
      });
      return val;
    }
    const discriminatorValue = val[discriminator];
    const schema = discriminatorValue in matcher ? matcher[discriminatorValue as keyof TPetMatcher] : matcher["onDefault"];
    const parsed = schema.safeParse(val);
    if (!parsed.success) {
      ctx.issues.push(...parsed.error.issues);
      return val;
    }
    return parsed.data;
  });
}
```

Now the error messages will be more specific like this.

```typescript
test("error message", ()=> {
  expect(Pet.safeParse({ id: "string", type: "Cat", name: 2 }).error, "name must be ot type string").toMatchInlineSnapshot(`
        ZodError {
          "issues": [
            {
              "code": "invalid_type",
              "expected": "string",
              "message": "Invalid input: expected string, received number",
              "path": [
                "name",
              ],
            },
          ],
        }
      `);
})
```

### Bonus: Generic Tolerant Zod union

Before we implemented a `createTolerantPetSchema` function. Now we like to use this function for any kind of union.
Fortunately, the function body already is generic. All details within the function only depend on the arguments of the function `discriminator` and `mapping`.

So only the signature needs to become generic, which involves a little bit of type programming.
A schema or `ZodType` can be a regular schema or a union `ZodUnion`, which in turn has also a set of `ZodType`.

We will need two generic type utilities:

* Matcher: Record, where we match discriminator values to a schema.
* Schemas: A type utility to extract all schemas from the Matcher
* Discriminator: A type utility which extracts possible discriminator properties recursively from the Schemas in the Matcher.

If we implement those, it should look like this with some small limitation. The implementation for `Discriminator<T>` will yield all keys of all schemas, which is good enough for us. We will need to cast the return type to the schemas provided in the Matcher which will yield a union of schemas.

```typescript
export type DiscriminatorValue = string;
export type Matcher = Record<DiscriminatorValue, z.ZodType>;
/** get schemas from matcher */
export type Schemas<T extends Matcher> = T[keyof T];

/** recursively collect keys from fields we can use as discriminator properties */
export type Discriminator<T extends Matcher> = RecDiscriminator<Schemas<T>>;
export type RecDiscriminator<T extends z.core.$ZodType> = T extends z.ZodUnion<infer Options> ? RecDiscriminator<Options[number]> : keyof z.infer<T>;

export function createTolerantSchema<T extends Matcher>(discriminator: Discriminator<T>, matcher: T): Schemas<T> {
  return z.custom().transform((val, ctx) => {
    if (typeof val !== "object" || val === null) {
      // invalid payload
      ctx.issues.push({
        input: val,
        code: "invalid_type",
        message: `expected value to be an object but received ${typeof val}`,
        expected: "object",
      });
      return val;
    }
    const discriminatorValue = typeof discriminator === "string" && discriminator in val? discriminator[discriminator] : undefined;
    if (typeof discriminatorValue !== "string") {
      // invalid payload, invalid
      ctx.issues.push({
        input: val,
        code: "custom",
        message: `required discriminator '${JSON.stringify(discriminator)}' of type string is missing in value. value.keys: ${Object.keys(val)?.join(", ") ?? "none"}`,
      });
      return val;
    }
    const schema = discriminatorValue in matcher ? matcher[discriminatorValue as keyof TPetMatcher] : matcher["onDefault"];
    const parsed = schema.safeParse(val);
    if (!parsed.success) {
      ctx.issues.push(...parsed.error.issues);
      return val;
    }
    return parsed.data;
  }) as unknown as Schemas<T>;
}
```

With this function, we should now be able to create as many tolerant discriminated unions as we like.

```typescript
const Pet = createTolerantSchema("type", {Cat: Cat, Dog: Dog, onDefault: UnknownPet});

// nesting
const SportCar = createTolerantSchema("model", {AClass: SportCarA, BClass: SportCarB, onDefault: UnknownSportCar});
const Car = createTolerantSchema("kind", {Sport: SportCar, Coupe: CoupeCar, onDefault: UnknownCar});

```

### Solving the evolution problem

With our custom tolerant discriminated union we have typesafe parse results. However, if we want to process the union in an exhaustive switch case, then we will be forced to handle a default case.
We will need to introduce "type checks" to get compile errors for unknown handled cases.

This should be good enough. But with code generation, we can actually provide an implementation for a switch case analogous to our zod function. In this example, the code generator inlined the discriminator property

```typescript
export type Pet = ({ type: "CAT" } & Cat) | ({ type: "DOG" } & Dog) | { type: UNKNOWN_ENUM_VARIANT; [prop: string]: unknown };

export module Pet {
  type Handler<I, R> = (e: I) => R;
  type MatchObj<T extends Pet, R> = {
    [K in T as K["type"]]: Handler<Extract<T, { type: K["type"] }>, R>;
  } & { onDefault: Handler<unknown, R> };

  /** All handler must return the same type*/
  export function match<R>(union: Pet, handler: MatchObj<Pet, R>): R {
    if (union.type in handler) {
      return handler[union.type](union as never);
    }
    return handler.onDefault(union);
  }
}

// usage
const pet: Pet = { type: "CAT" };
const order = Pet.match(pet, {
  CAT: (_value) => 1,
  DOG: (_value) => 2,
  onDefault: (_value) => 3,
});
```
