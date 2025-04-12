import { _ } from "./lodash-extended.js";

export namespace Union {
  export type Handler<I, R> = (e: I) => R;
  export type MatchObj<T extends string, R> = {
    [K in T as K]: Handler<Extract<T, K>, R>;
  } & { onDefault: Handler<unknown, R> };

  export function matcher<T extends string, R>(s: MatchObj<T, R>) {
    return _.curryRight(match<T, R>)(s);
  }

  export function partialMatcher<T extends string, R>(s: Partial<MatchObj<T, R>>) {
    return _.curryRight(matchPartial<T, R>)(s);
  }

  export function of<T extends string, R>(s: T) {
    return {
      match: _.curry(match<T, R>)(s),
      matchPartial: _.curry(matchPartial<T, R>)(s),
    };
  }
  /** All handler must return the same type*/
  export function match<T extends string, R>(enumValue: T, handler: MatchObj<T, R>): R {
    if (enumValue in handler) {
      return handler[enumValue](enumValue as never);
    }
    return handler.onDefault(enumValue);
  }

  /** All handler must return the same type*/
  export function matchPartial<T extends string, R>(enumValue: T, handler: Partial<MatchObj<T, R>>): R | undefined {
    if (enumValue in handler) {
      return handler[enumValue]?.(enumValue as never);
    }
    return handler.onDefault?.(enumValue);
  }
}
