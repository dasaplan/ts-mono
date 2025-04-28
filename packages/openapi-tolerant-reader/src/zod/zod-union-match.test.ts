/* eslint-disable @typescript-eslint/no-unused-vars */
// noinspection JSUnusedLocalSymbols

import { BRAND, z } from "zod";
import { ZodUnionMatch } from "./zod-union-match.js";
import { test, expect } from "vitest";

type Unknown = string & z.BRAND<"UNKNOWN">;

const PetBase = z.interface({ id: z.number().int().min(1), type: z.string() });
const GenericPet = PetBase.extend(z.interface({ name: z.string().optional(), type: z.enum(["BIRD", "HAMSTER"]) }));
const Dog = PetBase.extend(z.interface({ bark: z.string(), type: z.literal("DOG") }));
const ShortHair = z.interface({ color: z.string(), catType: z.literal("SHORT"), angryLevel: z.string().optional(), type: z.literal("CAT") });
const Seam = PetBase.extend(
  z.interface({ color: z.string(), catType: z.literal("SEAM"), angryLevel: z.string().regex(/\w+/).optional(), type: z.literal("CAT") }),
);

/** flat union */
const Cat = ZodUnionMatch.matcher("catType", {
  SEAM: Seam,
  SHORT: ShortHair,
  onDefault: z.interface({ catType: z.string().brand("UNKNOWN") }).loose(),
});

/** nested union */
const Pet = ZodUnionMatch.matcher("type", {
  DOG: Dog,
  BIRD: GenericPet,
  HAMSTER: GenericPet,
  CAT: Cat,
  onDefault: z.interface({ type: z.string().brand("UNKNOWN") }).loose(),
});

test("parsing flat unions", () => {
  expect(Cat.parse({ catType: "foo", a: 1 })).toEqual({
    catType: "foo",
    a: 1,
  });
  expect(() => Cat.parse({ catType: "SEAM" })).toThrow();
  expect(() => Cat.parse({ catType: "SHORT" })).toThrow();
  expect(() => Cat.parse({ catType1: "SEAM" })).toThrow();
  expect(() => Cat.parse({ catType1: "SEAM" })).toThrow();
});

test("parsing nested unions", () => {
  expect(Pet.parse({ type: "CAT", catType: "foo", a: 1 })).toEqual({
    type: "CAT",
    catType: "foo",
    a: 1,
  });

  expect(Pet.parse({ type: "CAT", catType: "SHORT", color: "red" })).toEqual({
    type: "CAT",
    catType: "SHORT",
    color: "red",
  });
  expect(Pet.parse({ type: "DOG", id: 1, bark: "wuf" })).toEqual({
    type: "DOG",
    id: 1,
    bark: "wuf",
  });
  expect(() => Pet.parse({ type: "DOG" }), "expected to fail for missing required field").toThrow();
  expect(() => Pet.parse({ type: "CAT", catType: "SHORT" }), "expected to fail for missing required field").toThrow();
  expect(() => Pet.parse({ catType: "SEAM" }), "expected to fail for missing discriminator").toThrow();
});

test("renders custom error for missing discriminator property", () => {
  expect(Pet.safeParse({ typ: "DOG" }).error).toMatchInlineSnapshot(`
    ZodError {
      "issues": [
        {
          "code": "invalid_union",
          "errors": [
            [
              {
                "code": "invalid_type",
                "expected": "string",
                "message": "Invalid input: expected string, received undefined",
                "path": [
                  "type",
                ],
              },
            ],
          ],
          "message": "Invalid discriminated union: expected input to match with discriminator {"type": DOG | BIRD | HAMSTER | CAT | onDefault} but received discriminator: ("type": undefined) ",
          "path": [],
        },
      ],
    }
  `);
});
