---
title: A Solution for typesafe parsing the unknown with zod
---
<!-- TOC -->
* [Problem Overview](#problem-overview)
* [Solution: Creating A Custom Zod Schema](#solution-creating-a-custom-zod-schema)
* [Appendix](#appendix)
  * [Solving the evolution problem](#solving-the-evolution-problem)
  * [Generic Tolerant Zod union](#generic-tolerant-zod-union)
<!-- TOC -->

At this point, we should have a good understanding of the problem space around **type-safe parsing the unknown with Zod**. We talked about three concrete problems our solution should take into account. Let's make a quick recap and extract our requirements from it.

# Problem Overview
We discuss all problems in more detail in [The Problem of Typesafe parsing the unknown with zod](./the_problem_of_typesafe_parsing_the_unknown_with_zod.md).

In **"Problem 1: The Unknown Pet"** we looked into parsing a discriminated union where we do not know the provided value for the discriminator at compile time.
Hence, speaking in TypeScript, our solution should be able to handle the following union type for a given concrete discriminator property.

```typescript
type UnknownPet = { type: string & {}; [additional: string]: unknown };
type Pet = UnknownPet | { type: "Cat" } | { type: "Dog" };
```

Tinkering around to solve Problem 1, we ran into **"Problem 2: The Scaling Issue""**.
We noted that a solution must nicely integrate with code generation. Ideally, we can extend Zod with a tolerant parsing alternative for discriminated unions.

Finally, we looked at **"Problem 3: Type-Safe Handling the Unknown**" where we talked about exhaustive switch-statements, the impact of the **default case** on the evolutionary stability of our code, and the type inference of a union with string.

```typescript
type PetType_a = "Cat" | "Dog" | string
      // ?^ string
type PetType_b = "Cat" | "Dog" | string & {}
      // ?^ "Cat" | "Dog" | string & {}
```  

So our solution should ensure that we are `still able to discriminate against unions` while `using Zod`. We also need a sustainable way to explicitly handle `default cases while getting compiler errors if new known unhandled cases are added later`.

# Solution: Creating A Custom Zod Schema

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

What would a function signature look like for this specification?

```typescript
const mapping = { "Cat": Cat, "Dog": Dog, onDefault: UnknownPet } as const;
function createTolerantSchema(discriminator: "type", mapping: typeof mapping): z.ZodCustom {
  // insert magic
  return z.custom();
};
```

There you go, easy-peasy. A tolerant discriminated union... let's implement it.
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

Let's implement a solution explicitly for the Pet example. Later we can think about a more generic solution.

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
  /* ... */
  expect(Pet.safeParse({ id: "string", type: "Cat", name: 2 }).error).toMatchInlineSnapshot(`
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

With `z.custom()` we only can define a single error message, but we don't have access to our validation cases.
In Zod v3 we could utilize `.superRefine` in order to yield validation context-specific error issues.

In Zod v4 `.superRefine` got deprecated. AFAIK, the next best thing where we have access to the context is `.transform`.
If we rewrite the previous function with transform and concrete error messages, the result is more specific like this:

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

Let's take a look how we utilize `.transform` with the context object `ctx` to get better error messages.

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

# Appendix

## Solving the evolution problem

With our custom tolerant discriminated union we have typesafe parse results. However, if we want to process the union in an exhaustive switch case, then we will be forced to handle a default case.
We will need to introduce "type checks" to get compile errors for unknown handled cases.

What we have so far maybe already good enough. But with code generation, we can actually provide an implementation for a switch case analogous to our zod function.
Please note that in this example we make use of generics and inline the discriminator property `type`. With code generation we would parameterize the discriminator property as well.

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
## Generic Tolerant Zod union

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
