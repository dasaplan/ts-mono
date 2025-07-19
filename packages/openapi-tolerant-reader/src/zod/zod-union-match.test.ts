/* eslint-disable @typescript-eslint/no-unused-vars */
// noinspection JSUnusedLocalSymbols

import { BRAND, z } from "zod";
import { ZodUnionMatch } from "./zod-union-match.js";
import { test, expect } from "vitest";

test("zod discriminated union", () => {
  type Unknown = string & z.BRAND<"UNKNOWN">;

  const PetBase = z.object({ id: z.number().int().min(1), type: z.string() });
  const GenericPet = PetBase.merge(z.object({ name: z.string().optional(), type: z.enum(["BIRD", "HAMSTER"]) }));
  const Dog = PetBase.merge(z.object({ bark: z.string(), type: z.literal("DOG") }));
  const ShortHair = z.object({ color: z.string(), catType: z.literal("SHORT"), angryLevel: z.string().optional(), type: z.literal("CAT") });
  const Seam = PetBase.merge(
    z.object({ color: z.string(), catType: z.literal("SEAM"), angryLevel: z.string().regex(/\w+/).optional(), type: z.literal("CAT") }),
  );

  const Cat = ZodUnionMatch.matcher("catType", {
    onDefault: z.object({ catType: z.string().brand("UNKNOWN") }).passthrough(),
    SEAM: Seam,
    SHORT: ShortHair,
  });
  const Pet = ZodUnionMatch.matcher("type", {
    DOG: Dog,
    BIRD: GenericPet,
    HAMSTER: GenericPet,
    onDefault: z.object({ type: z.string().brand("UNKNOWN") }).passthrough(),
  });
  const a: z.infer<typeof Pet> = {
    type: "A" as Unknown,
  };
  expect(Cat.parse({ catType: "foo", a: 1 })).toEqual({
    catType: "foo",
    a: 1,
  });
  expect(() => Cat.parse({ catType: "SEAM" })).toThrow();
  expect(() => Cat.parse({ catType: "SHORT" })).toThrow();
  expect(() => Cat.parse({ catType1: "SEAM" })).toThrow();
});
