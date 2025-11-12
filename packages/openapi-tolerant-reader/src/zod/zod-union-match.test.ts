/* eslint-disable @typescript-eslint/no-unused-vars */
// noinspection JSUnusedLocalSymbols

import { z } from "zod";
import { ZodUnionMatch } from "./zod-union-match.js";
import { expect, test } from "vitest";

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

test("handle unknown variant after parsing discriminated union using merge", () => {
  const ChangeConstantBase = z.object({ event: z.string() });
  const GoldPriceUpdateDetails = z.object({ price: z.number() });
  const ChangeConstantUser = ChangeConstantBase.merge(
    z.object({ inventoryId: z.string(), details: GoldPriceUpdateDetails, event: z.literal("UPDATE_DOUGH_PRICE").default("UPDATE_DOUGH_PRICE") }),
  );
  const ChangeConstantGlobal = ChangeConstantBase.merge(z.object({ details: GoldPriceUpdateDetails, event: z.literal("GLOBAL_UPDATE_DOUGH_PRICE") }));
  const ChangeConstant = ZodUnionMatch.matcher("event", {
    UPDATE_DOUGH_PRICE: ChangeConstantUser,
    GLOBAL_UPDATE_DOUGH_PRICE: ChangeConstantGlobal,
    onDefault: z.object({ event: z.string().transform((s) => `unknown:${s}` as const) }).passthrough(),
  });

  const c = ChangeConstant.parse({
    event: "foo",
    bar: 42,
  });
  switch (c.event) {
    case "UPDATE_DOUGH_PRICE": {
      throw new Error('Not implemented yet: "UPDATE_DOUGH_PRICE" case');
    }
    case "GLOBAL_UPDATE_DOUGH_PRICE": {
      throw new Error('Not implemented yet: "GLOBAL_UPDATE_DOUGH_PRICE" case');
    }
    default: {
      const _a: `unknown:${string}` = c.event;
      expect(c).toEqual({ event: `unknown:foo`, bar: 42 });
    }
  }
});

test("handle unknown variant after parsing discriminated union using extend", () => {
  const ChangeConstantBase = z.object({ event: z.string() });
  const ChangeConstantUser = ChangeConstantBase.extend({
    inventoryId: z.string(),
    details: z.object({ price: z.number() }),
    event: z.literal("UPDATE_DOUGH_PRICE"),
  });

  const ChangeConstantGlobal = ChangeConstantBase.extend({
    details: z.object({ price: z.number(), foo: z.string() }),
    event: z.literal("GLOBAL_UPDATE_DOUGH_PRICE"),
  });

  const ChangeConstant = ZodUnionMatch.matcher("event", {
    UPDATE_DOUGH_PRICE: ChangeConstantUser,
    GLOBAL_UPDATE_DOUGH_PRICE: ChangeConstantGlobal,
    // onDefault: z.object({ event: z.literal("foo") }).passthrough(),
    onDefault: z.object({ event: z.string().transform((s) => `unknown:${s}` as const) }).passthrough(),
  });

  const a = ChangeConstant.parse({
    event: "foo",
    bar: 42,
  });

  switch (a.event) {
    case "UPDATE_DOUGH_PRICE": {
      const c: "UPDATE_DOUGH_PRICE" = a.event;
      break;
    }
    case "GLOBAL_UPDATE_DOUGH_PRICE": {
      const c: "GLOBAL_UPDATE_DOUGH_PRICE" = a.event;
      break;
    }
    default: {
      const c: `unknown:${string}` = a.event;
      expect(a).toEqual({ event: `unknown:foo`, bar: 42 });
    }
  }
});
