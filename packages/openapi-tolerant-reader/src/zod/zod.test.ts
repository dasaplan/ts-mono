/* eslint-disable @typescript-eslint/no-unused-vars */
// noinspection JSUnusedLocalSymbols

import { z } from "zod";
import { describe, test, expect } from "vitest";

declare const tag: unique symbol;
type UNKNOWN = string & { readonly [tag]: "UNKNOWN" };

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
