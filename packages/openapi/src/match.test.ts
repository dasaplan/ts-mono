/* eslint-disable @typescript-eslint/no-explicit-any,@typescript-eslint/no-unused-vars,no-inner-declarations,@typescript-eslint/ban-types */

import { Union, DiscriminatedUnion } from "@dasaplan/ts-sdk";
import { z } from "zod";

declare const tag: unique symbol;
type UNKNOWN = string & { readonly [tag]: "UNKNOWN" };
import { describe, test, expect } from "vitest";

describe("discriminated union", () => {
  type DiscriminatedUnion = { type: "A"; a: number } | { type: "B"; b: number } | { type: UNKNOWN; [b: string]: unknown };
  describe("matchPartial", () => {
    test("compile error", () => {});
  });

  describe("match", () => {
    test("compile error", () => {});

    test("compiles", () => {
      const matcher: DiscriminatedUnion.MatchObj<DiscriminatedUnion, "type", string> = {
        A: (a) => `${a.type}: ${a.a}`,
        B: (b) => `${b.type}: ${b.b}`,
        onDefault: (u) => `${JSON.stringify(u)}`,
      };
      expect(DiscriminatedUnion.match({ type: "A", a: 1 } as DiscriminatedUnion, matcher, "type")).toBe("A: 1");
      expect(DiscriminatedUnion.match({ type: "B", b: 2 } as DiscriminatedUnion, matcher, "type")).toBe("B: 2");
      expect(DiscriminatedUnion.match({ type: "C" as UNKNOWN, foo: "a", d: 1 } as DiscriminatedUnion, matcher, "type")).toBe('{"type":"C","foo":"a","d":1}');
      expect(DiscriminatedUnion.match({ type: "A", a: 3 } as DiscriminatedUnion, matcher, "type")).toBe("A: 3");
    });
  });
});

describe("union", () => {
  type Union = "A" | "B" | UNKNOWN;
  describe("matchPartial", () => {
    test("factory", () => {
      expect(Union.of("A" as Union).match({ A: () => 1, B: () => 2, onDefault: () => 3 })).toBe(1);
      expect(Union.of("A" as Union).matchPartial({ B: () => 2, onDefault: () => 3 })).toBe(3);

      const match = Union.matcher({ A: () => 1, B: () => 2, onDefault: () => 3 });
      expect(match("A")).toBe(1);
      expect(match("B")).toBe(2);
      expect(match("D")).toBe(3);

      const partialMatch = Union.partialMatcher<Union, number>({ onDefault: () => 3, A: () => 1 });
      expect(partialMatch("A")).toBe(1);
      expect(partialMatch("B")).toBe(3);
      expect(partialMatch("D" as UNKNOWN)).toBe(3);
    });

    test("compile error", () => {
      const a = Union.matchPartial("A" as Union, {
        A: () => 1,
      });

      const b = Union.matchPartial("A" as Union, {
        A: () => 1,
        B: () => 2,
      });

      const c = Union.matchPartial("A" as Union, {
        A: () => 1,
        // @ts-expect-error not assignable to number
        B: () => "diffrent type",
        onDefault: () => 0,
      });
    });

    test("compiles", () => {
      expect(Union.matchPartial("A" as Union, { A: () => 1 })).toBe(1);
      expect(Union.matchPartial("A" as Union, { B: () => 1 })).toBe(undefined);
      expect(Union.matchPartial("B" as Union, { A: () => 1 })).toBe(undefined);
      expect(Union.matchPartial("B" as Union, { A: () => 1, onDefault: () => 0 })).toBe(0);
      expect(Union.matchPartial("B" as Union, { B: () => 3, onDefault: () => 0 })).toBe(3);
    });
  });

  describe("match", () => {
    test("compile error", () => {
      // @ts-expect-error B is missing
      const a = Union.match("A" as Union, {
        A: () => 1,
        onDefault: () => 0,
      });

      // @ts-expect-error default is missing
      const b = Union.match("A" as Union, {
        A: () => 1,
        B: () => 2,
      });

      const c = Union.match("A" as Union, {
        A: () => 1,
        // @ts-expect-error not assignable to number
        B: () => "diffrent type",
        onDefault: () => 0,
      });
    });

    test.each([
      { t: "A", e: 1 },
      { t: "B", e: 2 },
      { t: "C" as UNKNOWN, e: 0 },
    ] satisfies Array<{ t: Union; e: number }>)("matches $t to $e", (test) => {
      const a = Union.match(test.t, {
        A: () => 1,
        B: () => 2,
        onDefault: () => 0,
      });
      expect(a).toBe(test.e);
    });
  });
});
