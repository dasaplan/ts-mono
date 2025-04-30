/* eslint-disable @typescript-eslint/no-unused-vars,@typescript-eslint/no-explicit-any */
// noinspection JSUnusedLocalSymbols

import { z } from "zod";
import { describe, test, expect } from "vitest";

declare const tag: unique symbol;
type UNKNOWN = string & { readonly [tag]: "UNKNOWN" };

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
  type Pet = { id?: string; name?: string; icon: "😺" | "🐶" | "❓" };

  /** (c) transform server data into our model */
  async function createPetList1(): Promise<Array<Pet>> {
    // TODO: parse pets to avoid any
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

  // TODO: generate API schemas from Openapi specification
  namespace PetApi_v1_0 {
    const PetBase = z.interface({ id: z.string(), name: z.string().optional() });
    const Cat = PetBase.extend(z.interface({ type: z.literal("Cat") }));
    const Dog = PetBase.extend(z.interface({ type: z.literal("Dog") }));
    const UnknownPet = PetBase.extend(z.interface({ type: z.string() }));

    export const Pet = z.discriminatedUnion([Cat, Dog]);
    export const Pets = z.array(Pet);

    test("throws error for invalid Cat type", () => {
      const Pet2 = Cat.or(UnknownPet);
      expect(() => Pet2.parse({ id: "1", type: "Cat" })).toThrow();
    });
  }

  namespace PetApi_v1_0_Patched {
    const PetBase = z.interface({ id: z.string(), name: z.string().optional() });
    const Cat = PetBase.extend(z.interface({ type: z.literal("Cat") }));
    const Dog = PetBase.extend(z.interface({ type: z.literal("Dog") }));
    const UnknownPet = PetBase.extend(z.interface({ type: z.string() }));

    const PetMatcher = { Cat: Cat, Dog: Dog, onDefault: UnknownPet } as const;
    const Pet = CreateTolerantPetSchema("type", PetMatcher);

    type TPetMatcher = typeof PetMatcher;
    export function CreateTolerantPetSchema(discriminator: "type", matcher: TPetMatcher) {
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

    test("matcher error messages", () => {
      // success false
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
      expect(Pet.safeParse({ type: "Cat", toy: { name: 1 } }).error, "name must be ot type string").toMatchInlineSnapshot(`
        ZodError {
          "issues": [
            {
              "code": "invalid_type",
              "expected": "string",
              "message": "Invalid input: expected string, received undefined",
              "path": [
                "id",
              ],
            },
          ],
        }
      `);
      expect(Pet.safeParse({ id: "1", type: "Cat" }).error, "name must be ot type string").toMatchInlineSnapshot(`undefined`);
      expect(Pet.safeParse(undefined).error, "name must be ot type string").toMatchInlineSnapshot(`
        ZodError {
          "issues": [
            {
              "code": "invalid_type",
              "expected": "object",
              "message": "expected value to be an object but received undefined",
              "path": [],
            },
          ],
        }
      `);
      expect(Pet.safeParse({ id: "string", type: "Unknown", name: 2, a: 1 }).error, "name must be ot type string").toMatchInlineSnapshot(`
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
    });

    test("tolerant union schema", () => {
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
      // success true
      expect(Pet.safeParse({ id: "string", type: "Cat" }).success, "must parse valid Cat").toEqual(true);
      expect(Pet.safeParse({ id: "string", type: "Dog" }).success, "must parse valid Dog").toEqual(true);
      expect(Pet.safeParse({ id: "string", type: "Cat", name: "foo" }).success, "mast parse valid Cat with optional field").toEqual(true);
      expect(Pet.safeParse({ id: "string", type: "Cat", name: "foo", bar: 2 }).success, "mast parse valid Cat with additional field").toEqual(true);
      // success false
      expect(Pet.safeParse({ id: "string", type: "Cat", name: 2 }).success, "name must be ot type string").toEqual(false);
      expect(Pet.safeParse({ id: "string", type: "Cat", name: 2 }).success, "name must be ot type string").toEqual(false);
      // unknown values
      expect(Pet.safeParse({ id: "string", type: "Unknown", name: "foo", a: 1 }).success, "must parse unknown values for type").toEqual(true);
      expect(Pet.safeParse({ id: "string", type: "Unknown", name: 2, a: 1 }).success, "name must be ot type string").toEqual(false);
    });

    test("throws error for invalid Cat type", () => {
      const Pet2 = Cat.or(UnknownPet);
      expect(() => Pet2.parse({ id: "1", type: "Cat" })).toThrow();
    });
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

  interface PetDto2 {
    name?: string;
    type: "Cat" | "Dog" | "A";
  }

  function transformPet(pet: PetDto2): Pet {
    switch (pet.type) {
      case "Cat": {
        return { name: pet.name, icon: "😺" };
      }
      case "Dog": {
        return { name: pet.name, icon: "😺" };
      }
      default: {
        const unknownPetType: "A" = pet.type;
        // ?^ TS2322: Type string is not assignable to type never
        const unknownPet = pet as any;
        console.warn(`unknown pet type: ${unknownPetType}`);
        return { id: unknownPet.id, name: unknownPet.name, icon: "❓" };
      }
    }
  }

  type PetDto = {
    id?: string;
    name?: string;
    type?: "Cat" | "Dog";
  };

  async function createPetList3(): Promise<Array<Pet | undefined>> {
    const pets: Array<PetDto> = (await fetchPets()) as Array<PetDto>;
    return pets.map((pet) => {
      switch (pet.type) {
        case undefined:
          return undefined;
        case "Cat": {
          return { id: pet.id, name: pet.name, icon: "😺" };
        }
        case "Dog": {
          return { id: pet.id, name: pet.name, icon: "🐶" };
        }
        default: {
          const unknownPetType: never = pet.type;
          const unknownPet = pet as any;
          console.warn(`unknown pet type: ${unknownPetType}`);
          return { id: unknownPet.id, name: unknownPet.name, icon: "❓" };
        }
      }
    });
  }
}

/**
 failed parsing pets response: {"issues":[{"expected":"string","code":"invalid_type","path":[0,"id"],"message":"Invalid input: expected string, received undefined"},{"expected":"string","code":"invalid_type","path":[1,"id"],"message":"Invalid input: expected string, received undefined"},{"code":"invalid_union","errors":[],"note":"No matching discriminator","path":[2],"message":"Invalid input"}]}
 */

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

function parseError(error: z.ZodError | undefined) {
  const issue = error?.issues[0];
  if (!issue) {
    return "";
  }
  return {
    code: issue.code,
    note: "note" in issue ? issue.note : undefined,
    message: issue.message,
  };
}

test("zod discriminated union will fail for an unknown schema option", () => {
  // arrange
  const A = z.interface({ type: z.literal("A") });
  const B = z.interface({ type: z.literal("B"), b: z.number() });
  const schema = z.discriminatedUnion([A, B]);

  // act
  const parseResult = schema.safeParse({ type: "C" });

  // assert
  expect(parseResult.success).toBe(false);
  expect(parseError(parseResult.error)).toMatchInlineSnapshot(`
    {
      "code": "invalid_union",
      "message": "Invalid input",
      "note": "No matching discriminator",
    }
  `);
});

test("zod discriminated union won't fail for Union.or(Unknown)", () => {
  const A = z.interface({ type: z.literal("A") });
  const B = z.interface({ type: z.literal("B"), b: z.number() });
  const Unknown = z.interface({ type: z.string() }).loose();

  const discriminated = z.discriminatedUnion([A, B]).or(Unknown);
  type T = z.infer<typeof discriminated>;
  const invalidSchema: T = {
    type: "B",
  };
  expect(discriminated.parse(invalidSchema)).toEqual({ type: "B" });
});
