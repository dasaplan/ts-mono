import { _ } from "./lodash-extended.js";

export module DiscriminatedUnion {
  export type Handler<I, R> = (e: I) => R;
  export type MatchObj<
    T extends object,
    Discriminator extends keyof T,
    R
  > = Discriminator extends string
    ? {
        [K in T as K[Discriminator] extends string | number
          ? K[Discriminator]
          : never]: Handler<Extract<T, { type: K[Discriminator] }>, R>;
      } & { onDefault: Handler<unknown, R> }
    : never;
  export function matcher<T extends object, D extends keyof T, R>(
    discriminator: D,
    matcher: MatchObj<T, D, R>
  ) {
    return _.curryRight(match<T, D, R>)(discriminator)(matcher);
  }

  export function partialMatcher<T extends object, D extends keyof T, R>(
    discriminator: D,
    matcher: Partial<MatchObj<T, D, R>>
  ) {
    return _.curryRight(matchPartial<T, D, R>)(discriminator)(matcher);
  }

  /** All handler must return the same type*/
  export function match<T extends object, D extends keyof T, R>(
    union: T,
    handler: MatchObj<T, D, R>,
    discriminator: D
  ): R {
    const p = union[discriminator] as keyof typeof handler;
    if (p === null || typeof p === "undefined") {
      return handler.onDefault(union);
    }
    if (p in handler) {
      return (handler[p] as (a: T) => R)(union as never);
    }
    return handler.onDefault(union);
  }

  /** All handler must return the same type*/
  export function matchPartial<T extends object, D extends keyof T, R>(
    union: T,
    handler: Partial<MatchObj<T, D, R>>,
    discriminator: D
  ): R | undefined {
    const p = union[discriminator] as keyof typeof handler;
    if (p === null || typeof p === "undefined") {
      return handler.onDefault?.(union);
    }
    if (p in handler) {
      return (handler[p] as (a: T) => R)(union as never);
    }
    return handler.onDefault?.(union);
  }
}
