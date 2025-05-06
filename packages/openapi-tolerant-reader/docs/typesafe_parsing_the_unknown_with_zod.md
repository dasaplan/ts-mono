<!-- TOC -->
* [How to typesafe parse the unknown with Zod](#how-to-typesafe-parse-the-unknown-with-zod)
  * [Example: Animal shelter pet list](#example-animal-shelter-pet-list)
    * [Getting started with the implementation](#getting-started-with-the-implementation)
    * [Parsing the response from the Animal Shelter's Rest API](#parsing-the-response-from-the-animal-shelters-rest-api)
  * [Problem 1: The Unknown Pet](#problem-1-the-unknown-pet)
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

This article addresses the challenges of parsing unknown data from APIs using Zod, focusing on type-safe handling and scalable solutions. At least this is how the AI summarized its essence.

You will find a lot of code examples which are intended to be read along the text.
However, you may jump directly into the last section where we provide a summary of the key issues.

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

The shelter API is pretty large, but we are provided with a sample JSON response, tailored to our requirements:

```json
[ 
  { "id": "1", "type": "Cat",  "name": "Kitty"  }, 
  { "id": "2", "type": "Dog",  "name": "Snoopy" }, 
  { "id": "3", "type": "Bird", "name": "Chewie" }
]
```

---

### Getting started with the implementation

Let's get started by implementing the MVP logic. The MVP implementation fetches mock data, transforms it into a Pet model, and renders it. Here's the key transformation logic:

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

The implementation currently does not compile. The return value of `fechtPets` is **unknown** until we validate that the shape of the payload meets our expectations.

We were provided an Openapi specification for the Animal Shelters API, and it is pretty large. 
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
    const PetBase = z.interface({ id: z.string(), name: z.string().optional() });
    const Cat = PetBase.extend(z.interface({ type: z.literal("Cat"), mood: z.string()}));
    const Dog = PetBase.extend(z.interface({ type: z.literal("Dog") }));

    export const Pet = z.discriminatedUnion([Cat, Dog]);
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
Besides discriminatedUnions may utilize `.union` or just `.or`. However, doing so, we will lose validation for our concrete schemas Cat and Dog.

For parsing `{ type: "Cat"}` we would expect a validation error because of a missing required field `mood`. Yet, because the union schema includes a generic option, we won't get an error.

```typescript
const Cat = z.interface({ type: z.literal("Cat"), mood: z.string() });
const Dog = z.interface({ type: z.literal("Dog") });
const UnknownPet = z.interface({ type: z.string() });

const Pet = z.discriminatedUnion([Cat, Dog, UnknownPet]);
   // ?^ ❌`Error: Invalid discriminated union option at index "2"` 

const PetOrUnkown = z.discriminatedUnion([Cat, Dog]).or(UnknownPet);
const cat_or = PetOrUnkown.parse( {type: "Cat"})
   // ?^ { type: "Cat "} ❌ mood is missing

const PetUnion = z.union([Cat, Dog, UnknownPet]);
const cat_union = PetUnion.parse( {type: "Cat"})
  // ?^ { type: "Cat "} ❌ mood is missing
```

Instead of parsing an unknown type, what else can we do? There are a lot of workarounds we can come up - with from manually handling invalid data to ditching Zod.  

However, every workaround we can think of has all the same issues. They do not scale well.

## Problem 2: The Scaling Issue

Scaling issues arise when manually writing schemas for APIs with many fields and deeply nested polymorphic values. It just becomes more and more impractical with the size of the APIs.

This means, in the following example we would need to handle manually deeply nested **discriminatedUnion** like for `Cat.needs.features` or nested **enums** like `Cat.mood` or `Cat.needs.features.favorites`.

```typescript
const Dog = z.interface({/**/})
const Cat = z.interface({
        type: z.literal("Cat"),
        // ❌ unknown enum value
        mood: z.enum(["angry", "hungry"]),
        needs: z.array(z.interface({
            // ❌ unknown discriminator value    
            features: z.discriminatedUnion( 
                [
                  z.interface({
                    type: 'BREAKING_STUFF', 
                    //  ❌ unknown enum value                               
                    favorites: z.enum(["CABLE", "COUCH"]) 
                  }),
                  z.interface({type: 'EATING', likesHunting: z.boolean()})
                ]
            )
        }))
    })
);
// ❌ unknown discriminator value    
export const Pet = z.discriminatedUnion([Cat, Dog]);
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

This compiles just fine, but we rather like to have a compiler error since we now `type` may be any string. Hence, to make it typesafe, we need to describe **unknown values**. But there is a catch. We can't just extend the union with `string`.

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
