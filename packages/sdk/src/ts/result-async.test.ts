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

  test("async map 2", async () => {
    const a = Result.tryCatch(fetchOne).mapOkAsync(save);
    expect(a.getOrThrow() instanceof Promise).toBe(true);

    const b = await a.resolved();
    expect(b.getOrThrow()).toEqual("saved-1");

    const resolved = await a.mapOkAsync(published).resolved();
    expect(resolved.getOrThrow()).toEqual("pub-saved-1");

    expect(a.getOrThrow()).toEqual("saved-1");

    expect(a.mapOkAsync(published).getOrThrowAsync() instanceof Promise).toBe(true);
    expect(await a.mapOkAsync(published).getOrThrowAsync()).toBe("pub-saved-1");
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

async function published(a: string): Promise<typeof a> {
  return setTimeout(20, `pub-${a}`);
}
