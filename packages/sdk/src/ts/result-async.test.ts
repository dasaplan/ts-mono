import { describe, expect, test } from "vitest";
import { Result } from "./result.js";
import { setTimeout } from "node:timers/promises";

describe("result async", () => {
  test("async tryCatch", async () => {
    const a = Result.tryCatch(fetchOne);
    expect(a.getOrThrow() instanceof Promise).toBe(true);

    const b = await a.resolved();
    expect(b.getOrThrow()).toEqual("1");
  });

  test("async map", async () => {
    const a = Result.tryCatch(fetchOne).mapOk(awaitOk(save));
    expect(a.getOrThrow() instanceof Promise).toBe(true);

    const b = await a.resolved();
    expect(b.getOrThrow()).toEqual("saved-1");
  });
});

async function fetchOne() {
  return Promise.resolve("1");
}

function awaitOk<E, T extends Promise<E>, R>(fn: (i: Awaited<T>) => R): (a: T) => Promise<R> {
  return async (a: T) => fn(await a);
}

async function save(a: string): Promise<typeof a> {
  return setTimeout(100, `saved-${a}`);
}
