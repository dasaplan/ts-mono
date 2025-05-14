import { describe, expect, test } from "vitest";
import { Result } from "./result.js";

describe("result", () => {
  test("getOr", () => {
    const a: Result<string, "bar"> = maybeErrorBar("throw")();
    expect(a.getOr("foo")).toEqual("foo");

    const b: Result<string, "bar"> = maybeErrorBar("not-throw")();
    expect(b.getOr("foo")).toEqual("ok-bar");

    // @ts-expect-error orValue needs to be of the same type as okValue
    b.getOr(1);
  });

  test("mutable api ", () => {
    const parseInt = (a: string): number => Number.parseInt(a);
    const add2 = (a: number): number => a + 2;

    const a = Result.mut.tryCatch(() => "1").mapOk(parseInt);

    expect(a.getOrThrow()).toEqual(1);
    expect(a.mapOk(add2).getOrThrow()).toEqual(3);
    expect(a.getOrThrow()).toBe(3);
  });

  test("onOk(", async () => {
    const b = Result.ok("foo");
    const obj = { foo: 1 };
    b.onOk(() => (obj.foo += 1));
    expect(obj.foo).toEqual(2);
  });

  test("immutable api ", () => {
    const parseInt = (a: string): number => Number.parseInt(a);
    const add2 = (a: number): number => a + 2;

    const a = Result.tryCatch(() => "1").mapOk(parseInt);

    expect(a.getOrThrow()).toEqual(1);
    expect(a.mapOk(add2).getOrThrow()).toEqual(3);
    expect(a.getOrThrow()).toBe(1);
  });

  test("getOrThrow", () => {
    const a: Result<string, "bar"> = maybeErrorBar("throw")();
    expect(() => a.getOrThrow()).throws("bar");

    const b: Result<string, "bar"> = maybeErrorBar("not-throw")();
    expect(b.getOrThrow()).toEqual("ok-bar");
  });

  test("mapErr", () => {
    const a: Result<string, "bar"> = maybeErrorBar("throw")();
    const b: Result<string, "foo-bar"> = a.mapErr((err) => `foo-${err}` as const);
    expect(b).toEqual(expect.objectContaining({ isOk: false, errValue: "foo-bar" }));
  });

  test("pipe on value", () => {
    const a: Result<string, unknown> = Result.tryCatch(() => "1");
    const b: Result<number, unknown> = a.mapOk((v) => Number.parseInt(v));
    const value: number = b.getOrThrow();
    expect(value).toEqual(1);
  });

  test("mapOk and andThen dont run on error", () => {
    const a: Result<string, "foo"> = Result.tryCatch(() => {
      throw "foo";
    });
    const b: Result<number, "foo"> = a.mapOk((v) => Number.parseInt(v));
    expect(b).toEqual(expect.objectContaining({ isOk: false, errValue: "foo" }));
    const c: Result<number, "foo"> = a.andThen((v) => Result.tryCatch(() => Number.parseInt(v)));
    expect(c).toEqual(expect.objectContaining({ isOk: false, errValue: "foo" }));
  });

  test("andThen can handle chaining errors", () => {
    const a: Result<string, "foo"> = Result.ok("ok");
    const b = a.andThen(maybeErrorBar()).andThen(maybeErrorFoo()).andThen(maybeErrorOne());
    expect(b).toEqual(expect.objectContaining({ isOk: false, errValue: "bar" }));

    const c = a.andThen(maybeErrorBar("not-throw")).andThen(maybeErrorFoo()).andThen(maybeErrorOne());
    expect(c).toEqual(expect.objectContaining({ isOk: false, errValue: "foo" }));

    const d = a.andThen(maybeErrorBar("not-throw")).andThen(maybeErrorFoo("not-throw")).andThen(maybeErrorOne());
    expect(d).toEqual(expect.objectContaining({ isOk: false, errValue: 1 }));
  });

  test("mapOk will catch errors", () => {
    const a: Result<string, unknown> = Result.tryCatch(() => ({}) as string);
    const b: Result<number, unknown> = a.mapOk((v) => {
      throw "not a number";
    });
    expect(b).toEqual(expect.objectContaining({ errValue: "not a number", isOk: false }));
  });

  test("tryCatch", () => {
    const a = Result.tryCatch(() => 1);

    expect(a.getOrThrow()).toEqual(1);

    expect(() =>
      Result.tryCatch(() => {
        throw "foo";
      }).getOrThrow(),
    ).throw();

    expect(
      Result.tryCatch(() => {
        throw "foo";
      }),
    ).toEqual(expect.objectContaining({ isOk: false, errValue: "foo" }));
  });

  test("ok", () => {
    const a = Result.ok(1);
    expect(a).toEqual(expect.objectContaining({ isOk: true, okValue: 1 }));
  });

  test("err", () => {
    const a = Result.err(1);
    expect(a).toEqual(expect.objectContaining({ isOk: false, errValue: 1 }));
  });
});

function maybeErrorBar(ok: "throw" | "not-throw" = "throw"): () => Result<"ok-bar", "bar"> {
  return () =>
    Result.tryCatch(() => {
      if (ok === "throw") throw "bar";
      return "ok-bar";
    });
}
function maybeErrorFoo(ok: "throw" | "not-throw" = "throw"): () => Result<"ok-foo", "bar"> {
  return () =>
    Result.tryCatch(() => {
      if (ok === "throw") throw "foo";
      return "ok-foo";
    });
}
function maybeErrorOne(ok: "throw" | "not-throw" = "throw"): () => Result<"ok-1", 1> {
  return () =>
    Result.tryCatch(() => {
      if (ok === "throw") throw 1;
      return "ok-1";
    });
}
