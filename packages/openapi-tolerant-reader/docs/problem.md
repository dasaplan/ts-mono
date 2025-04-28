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
<!-- TOC -->
# How to typesafe parse the unknown with Zod

We will start off with a simple but descriptive example to motivate the issue with parsing the unknown when fetching data over the internet.
If you are regularly parsing API responses with Zod, you may jump directly into the problems.

You will find a lot of code examples, but they are intended to be read along the text.

Please note that the focus of this article is on explaining the problem. 
My solution to the problem is this library with customized ZodTypes and handler functions which are straightforward to generate with codegen tool for Zod schemas.

There you go, you already know the solution after maybe reading a single paragraph! If you like to better understand it, I hope this article will help you with that.

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

For starters, we **(a)** mock the server response of our animal shelter server and **(b)** define the desired Pet type we can use for rendering the page. Since we have an example response, we also can already **(c)** provide a transformation from the response data to our internal Pet model.

```typescript

namespace MVP {
  /** (a) fetch data from server */
  export async function fetchPets(): Promise<unknown> {
    /** TODO:  replace mock response with api call */
    return Promise.resolve([
      { type: "Cat", name: "Kitty" },
      { type: "Dog", name: "Snoopy" },
      { type: "Bird", name: "Chewie" },
    ]);
  }

  /** (b) Our model for the animal shelter list */
  type Pet = { id: string; name?: string; icon: "😺" | "🐶" | "❓" };

  /** (c) transform server data into our model */
  async function createPetList(): Promise<Array<Pet>> {
    // TODO: parse pets response to avoid any
    const pets: any = await fetchPets();
    return pets.map((pet: any) => {
      switch (pet.type) {
        case "Cat": {
          return { name: pet.name, icon: "😺" };
        }
        case "Dog": {
          return { name: pet.name, icon: "🐶" };
        }
        default: {
          return { name: pet.name, icon: "❓" };
        }
      }
    });
  }
}

```

Let's test the implementation to see if we are on track. Therefore, we implement the main and a render function along with the test.

```typescript
namespace MVP {
  /* ... previous example code ...  */

  /** create the web page */
  function renderPage(pets: Array<Pet>): string {
    const header = "<h1>Animal Shelter Pets</h1>";
    const petList = pets.map((p) => `<h2> ${p.icon}: ${p.name ?? ""} </h2>`);
    return `<div class="page">\n\t${header}\n\t${petList.join("\n\t")} \n </div>`;
  }

  /** main */
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

The Animal Shelters API is pretty large. We plan to later generate the Schemas from the Openapi specification. However, for this iteration we write a minimal version of the schemas by hand. Later the written schemas should match the generated ones.

We skimmed through the API and can infer that **Pet** is a **oneOf**-schema with a **discriminator** of the property "**type**". This means most fields depend on the pet.type. In the API only a Cat e.g., has a field "**mood**". Yet all pets have a field "**id**", "**name**" and "**type**".

For this example we will write the schemas as they would be generated and reduce the set of fields for our needs.

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

    const pets = petsParseResult.data;
    return pets.map((pet) => {
      switch (pet.type) {
        case "Cat": {
          return { id: pet.id, name: pet.name, icon: "😺" };
        }
        case "Dog": {
          return { id: pet.id, name: pet.name, icon: "🐶" };
        }
        default: {
          // TODO: we only have Dog or Cat as schemas. We are missing an unknown type!?
          const unknownPet = pet as any;
          return { id: unknownPet.id, name: unknownPet.name, icon: "❓" };
        }
      }
    });
  }
```

Our first take on the zod schema **Pet** and **createPetList** has an issue. When we ran our test, we get the following nasty error:

```
failed parsing pets response: {"issues":[{"expected":"string","code":"invalid_type","path":[0,"id"],"message":"Invalid input: expected string, received undefined"},{"expected":"string","code":"invalid_type","path":[1,"id"],"message":"Invalid input: expected string, received undefined"},{"code":"invalid_union","errors":[],"note":"No matching discriminator","path":[2],"message":"Invalid input"}]}

```

We forgot to define a schema for the value  `{ "type": "Bird", "name": "Chewie" }` schema. Zod tried every possible union option without a match. Every try yields an issue. So, add a Bird schema and call it a day?

There is a deeper problem here. We know that "Bird" is just an example for any kind of pet. It could be also "Hamster" but we actually don't know. We also don't know if all possible values are documented in the API. At any time, any value could be provided.

However, for us, it would be good enough to only parse **Cat** or **Dog** and put any other kind of animal in an "**unknown**" state. It is really no big deal for us if there is a different Pet because we handle it in our business logic with a default case which yields an item with the "❓"-icon.

So, why not just extend the discriminatedUnion with a generic schema? Since all Pets seem to have an **id** and a **name**, we could maybe expect any other string for the **type**, hence an unknown value?

---

## Problem 1: The Unknown Pet

We like to have a generic schema with an unknown literal value for **type**. To do so, we create **UnknownPet** and extend the **discriminatedUnion** accordingly.

### Fix Attempt 1: discriminatedUnion([ Cat, Dog, UnknownPet])

```typescript
const PetBase = z.interface({ id: z.string(), name: z.string().optional() });
const Cat = PetBase.extend(z.interface({ type: z.literal("Cat") }));
const Dog = PetBase.extend(z.interface({ type: z.literal("Dog") }));
const UnknownPet = PetBase.extend(z.interface({ type: z.string() }));

export const Pet = z.discriminatedUnion([Cat, Dog, UnknownPet]);
export const Pets = z.array(Pet);
```

If we run our tests now, we will see an exception:
<span style="color: red; ">Error: Invalid discriminated union option at index "2"</span>

Zod (v3, v4) expects a constant literal value for the discriminator property. However, we don't know the unknown. We only know that it could be any string value except the values, we already know "Cat" or "Dog".

### Fix Attempt 2: Union - Cat.or(Dog).or(UnknownPet)

Well, extending discriminatedUnion with UnknownPet did not work. How about using **.or()**?

```typescript
export const Pet = z.discriminatedUnion([Cat, Dog]).or(UnknownPet);
```

This seems to work, but we actually do not have any validation anymore.
Let's simplify a bit and only look at **Cat** or **UnknownPet**.

```typescript
const PetBase = z.interface({ id: z.string()});
const Cat = PetBase.extend(z.interface({ type: z.literal("Cat"), mood: z.string() }));
const UnknownPet = PetBase.extend(z.interface({ type: z.string() }));

export const CatOrUnknown = Cat.or(UnknownPet);

test("throws error for invalid Cat type", () => {
    expect(() => CatOrUnknown.parse({id: "1", type: "Cat"})).toThrow()
    // ^ AssertionError: expected [Function] to throw an error
});

```

We expect CatOrUnknown.parse to throw, but it doesn't. The test reveals that we can omit the required field **mood** for the Cat type.

### Fix Attempt 3: Working around zod schemas

Instead of parsing an unknown type, why not just handle the "invalid union" Exception?

If `.safeParse` or try-catch `.parse` run into an error state, we only have access to the error. There is no "partially parsed success value." However, we have access to the **path** where the issue occurred.

Having this information, there are a lot of workarounds we can come up with.  

- We could post process the response data and handle the error path.
- We could process only parts of the response like parse each array element with **Pet**.
- We could ditch Zod and just use plain JavaScript for parsing.

Every workaround I can think of has all the same issues. They do not scale.

## Problem 2: The Scaling Issue

What do we mean if we speak of scaling in the context of parsing API payload?

If we have to manually write our schemas, the effort it takes to integrate with an API increases by two factors: **number of fields** and **nesting depth of polymorph values**.

This means, in the following example we will need to handle manually deeply nested **discriminatedUnion** e.g., for `Cat.needs.features` or nested **enums** like `Cat.mood` or
`Cat.needs.features.favorites`.

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

// unknown discriminator value? 
export const Pet = z.discriminatedUnion([Cat, Dog]);

```

Applying any workaround on that kind of schema takes significant more effort as for the simple example. Now let us imagine an API with over 500 fields and a depth up to six, ten or more.

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
// ?^ TS2366: Function lacks ending return statement and return type does not include undefine
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

