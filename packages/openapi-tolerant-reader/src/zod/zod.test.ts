/* eslint-disable @typescript-eslint/no-unused-vars */
// noinspection JSUnusedLocalSymbols

import { z } from "zod";
import { ZodDiscriminatedUnion } from "./discriminated-union.js";
import { describe, test, expect } from "vitest";

declare const tag: unique symbol;
type UNKNOWN = string & { readonly [tag]: "UNKNOWN" };

test("zod discriminated union", () => {
  const A = z.object({ type: z.literal("A") });
  const B = z.object({ type: z.literal("B") });
  const Unknown = z.object({ type: z.string().transform((d) => d as UNKNOWN) }).loose();
  const Union = z.union([A, B, Unknown]);

  function match2(union: z.infer<typeof Union>, matcher: { A: typeof A; B: typeof B; onDefault: typeof Unknown }, discriminator: keyof z.infer<typeof Union>) {
    const handlerKey = union[discriminator] as keyof typeof matcher;
    return handlerKey in matcher ? matcher[handlerKey].parse(union) : matcher.onDefault.parse(union);
  }
  type IUnion = { type: "A" } | { type: "B" } | { type: UNKNOWN };
  const matcher: ZodDiscriminatedUnion.Matcher<z.infer<typeof Union>, "type"> = { A, B, onDefault: Unknown };
  const a: IUnion = ZodDiscriminatedUnion.match({ type: "B" } as z.infer<typeof Union>, matcher, "type");
  expect(ZodDiscriminatedUnion.match({ type: "A" }, matcher, "type")).toEqual({ type: "A" });
  expect(ZodDiscriminatedUnion.match({ type: "B" }, matcher, "type")).toEqual({ type: "B" });
  expect(ZodDiscriminatedUnion.match({ type: "C" } as never, matcher, "type")).toEqual({ type: "C" });
  expect(() => ZodDiscriminatedUnion.match({ type: 1 } as never, matcher, "type")).toThrow();
});
test("union errors", () => {
  const A = z.object({ type: z.literal("A") });
  const B = z.object({ type: z.literal("B") });
  const Unknown = z.object({ type: z.string().brand<"UNKNOWN">() }).passthrough();
  const Union = z.union([A, B, Unknown]);
  type Union = { type: "A" } | { type: "B" } | { type: UNKNOWN };
  const parent = z.object({
    a: z.string(),
    b: ZodDiscriminatedUnion.of<Union>("type", { A, B, onDefault: Unknown }),
  });
  const r = parent.safeParse({ a: "", b: { e: "A", c: 2 } });
  expect(r.success).toBe(false);
  expect(parent.parse({ a: "", b: { type: "A", c: 2 } })).toEqual({ a: "", b: { type: "A" } });
  expect(
    parent.parse({
      a: "",
      b: {
        type: "G" as UNKNOWN,
        n: 2,
      },
    }),
  ).toEqual({ a: "", b: { type: "G", n: 2 } });
});
test("union", () => {
  const A = z.object({ type: z.literal("A") });
  const B = z.object({ type: z.literal("B") });
  const Unknown = z.object({ type: z.string().transform((d) => d as UNKNOWN) });
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
