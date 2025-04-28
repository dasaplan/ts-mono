/* eslint-disable @typescript-eslint/no-unused-vars */
// noinspection JSUnusedLocalSymbols

import { z } from "zod";
import { describe, test, expect } from "vitest";

declare const tag: unique symbol;
type UNKNOWN = string & { readonly [tag]: "UNKNOWN" };

describe("zod 4 test", () => {
  test("discriminatedUnion", () => {
    const A = z.interface({ id: z.string(), type: z.literal("A") });
    const B = z.interface({ id: z.string(), type: z.literal("B"), b: z.number() });

    const discriminated = z.discriminatedUnion([A, B]);

    // @error: needs constant literal for discriminator
    // const Unknown = z.interface({ type: z.string() }).loose();
    // const discriminated = z.discriminatedUnion([A, B, Unknown]);
    expect(discriminated.safeParse({ type: "A", id: "1" }).success).toEqual(true);
    expect(discriminated.safeParse({ type: "B", id: "1", b: 1 }).success).toEqual(true);
    expect(discriminated.safeParse({ type: "B", id: "1" }).success).toEqual(false);
    expect(discriminated.safeParse({ type: "C", id: "1" }).success).toEqual(false);
  });

  test("nested discriminatedUnion", () => {
    const A = z.interface({ id: z.string(), type: z.literal("AB"), ab: z.literal("a") });
    const B = z.interface({ id: z.string(), type: z.literal("AB"), ab: z.literal("b"), b: z.number() });
    const C = z.interface({ id: z.string(), type: z.literal("CD"), cd: z.literal("c"), c: z.number() });
    const D = z.interface({ id: z.string(), type: z.literal("CD"), cd: z.literal("d"), d: z.number() });
    const E = z.interface({ id: z.string(), type: z.literal("E"), e: z.string() });

    const ab_union = z.discriminatedUnion([A, B]);
    const cd_union = z.discriminatedUnion([C, D]);
    const nested_union = z.discriminatedUnion([E, ab_union, cd_union]);

    // @error: needs constant literal for discriminator
    // const discriminated = z.discriminatedUnion([A, B, Unknown]);
    expect(nested_union.safeParse({ type: "CD", cd: "d", id: "1", d: 1 }).success).toEqual(true);
    expect(nested_union.safeParse({ type: "CD", cd: "c", id: "1", c: 1 }).success).toEqual(true);
    expect(nested_union.safeParse({ type: "CD", cd: "a", id: "1" }).success).toEqual(false);
    expect(nested_union.safeParse({ type: "AB", cd: "a", id: "1" }).success).toEqual(false);
    expect(nested_union.safeParse({ type: "AB", ab: "a", id: "1" }).success).toEqual(true);
    expect(nested_union.safeParse({ type: "E", e: "test", id: "1" }).success).toEqual(true);
  });

  test("A.or(Unknown)", () => {
    const A = z.interface({ id: z.string(), type: z.literal("A") });
    const B = z.interface({ id: z.string(), type: z.literal("B"), b: z.number() });
    const Unknown = z.interface({ type: z.string() }).loose();

    const discriminated = A.or(Unknown);

    expect(
      discriminated.parse({
        type: "A",
      }),
    ).toEqual({ type: "A" });
  });
});

describe("zod 3", () => {
  test("zod vanilla discriminated union won't fail for Union.or(Unknown)", () => {
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

  test("zod vanilla discriminated union should fail for Union.or(Unknown)", () => {
    const A = z.interface({ type: z.literal("A") });
    const B = z.interface({ type: z.literal("B"), b: z.number() });
    const Unknown = z
      .interface({
        type: z
          .string()
          .refine((value) => value !== "A" && value !== "B")
          .transform((d) => d as UNKNOWN),
      })
      .loose();

    const discriminated = z.discriminatedUnion([A, B]).or(Unknown);
    type T = z.infer<typeof discriminated>;
    const a: T = {
      type: "C" as UNKNOWN,
      b: 1,
    };

    const r = discriminated.parse(a);
    expect(r).toEqual(a);
  });

  test("zod vanilla discriminated union fail for Union.or(Unknown)", () => {
    const A = z.interface({ type: z.literal("A") });
    const B = z.interface({ type: z.literal("B"), b: z.number() });
    // eslint-disable-next-line @typescript-eslint/ban-types
    type UnknownValue = string & {};
    const Unknown = z
      .interface({
        type: z
          .string()
          .refine((value) => value !== "A" && value !== "B")
          .transform((d) => d as UnknownValue),
      })
      .loose();

    const discriminated = z.discriminatedUnion([A, B]).or(Unknown);
    type T = z.infer<typeof discriminated>;
    const a: T = {
      type: "C" as UNKNOWN,
      b: 1,
    };

    const r = discriminated.parse(a);
    switch (r.type) {
      case "A": {
        throw new Error("A case not expected");
      }
      default: {
        const check: UnknownValue = r.type;
        break;
      }
    }
    expect(r).toEqual(a);
  });

  test("union", () => {
    const A = z.interface({ type: z.literal("A") });
    const B = z.interface({ type: z.literal("B") });
    const Unknown = z.interface({ type: z.string().transform((d) => d as UNKNOWN) });
    const Union = z.union([A, B, Unknown]);

    function match2(union: z.infer<typeof Union>, matcher: Array<z.Schema>) {
      const errors = [];
      for (const schema of Object.values(matcher)) {
        const result = schema.safeParse(union);
        if (result.success) {
          return result.data;
        }
        errors.push(result.error);
      }
      throw errors[0];
    }
    type IUnion = { type: "A" } | { type: "B" } | { type: UNKNOWN };
    const schemas = [A, B, Unknown];
    // const a: IUnion = match2({ type: "B" } as z.infer<typeof Union>, schemas);
    // expect(match2({ type: "A" }, schemas)).toEqual({ type: "A" });
    // expect(match2({ type: "B" }, schemas)).toEqual({ type: "B" });
    // expect(match2({ type: "C" } as never, schemas)).toEqual({ type: "C" });
    expect(() => match2({ type: 1 } as never, schemas)).toThrow();
  });
});
