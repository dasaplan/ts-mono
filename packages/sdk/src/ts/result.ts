import { ApplicationError } from "./error.js";

export type Result<OkVal, ErrVal> = $Result<OkVal, ErrVal> & ResultApi<OkVal, ErrVal>;

export type $Result<OkVal, ErrVal> = Ok<OkVal> | Err<ErrVal>;

export type ResultApi<Ok, Err> = {
  getOrThrow(): Ok;
  getOrThrowAsync(): Promise<Ok>;
  getOr(orValue: Ok): Ok;
  mapOk: <$NextOk>(ok: FnMapOk<$NextOk, Ok>) => Result<$NextOk, Err>;
  mapOkAsync: <$NextOk>(ok: (a: Awaited<Ok>) => Promise<$NextOk>) => Result<Promise<$NextOk>, Err>;
  mapErr: <$NextErr>(ok: FnMapErr<$NextErr, Err>) => Result<Ok, $NextErr>;
  andThen: <$NextOk, $NextErr>(ok: FnFlatMapOk<$NextOk, Ok, $NextErr, Err>) => Result<$NextOk, $NextErr | Err>;
  resolved: () => Promise<Result<Awaited<Ok>, Awaited<Err>>>;
};

export type FnMapOk<$NextOk, Ok> = (ok: Ok) => $NextOk;
export type FnMapErr<$NextErr, Err> = (err: Err) => $NextErr;
export type FnFlatMapOk<$NextOk, Ok, $NextErr, Err> = (ok: Ok) => Result<$NextOk, $NextErr | Err>;

export type Ok<OkVal> = $Ok<OkVal>;
export type Err<ErrVal> = $Err<ErrVal>;

/** used to allocate a single object for both Ok and Err, to avoid creating new objects for each call*/
export interface $Context {
  isOk?: boolean | Promise<boolean>;
  okValue?: unknown | Promise<unknown>;
  errValue?: unknown | Promise<unknown>;
  noopErr?: () => unknown;
  noopOk?: () => unknown;
}

interface $Ok<OkVal> {
  okValue: OkVal;
  isOk: true;
}

interface $Err<ErrVal> {
  errValue: ErrVal;
  isOk: false;
}

export namespace Result {
  /** mutable api. mutates the context, so it can be reused for the next call*/
  export const mut = {
    tryCatch<OkVal, ErrVal = unknown>(fn: () => OkVal): Result<OkVal, ErrVal> {
      return tryCatch(fn, {});
    },
    ok<OkVal>(_okVal: OkVal): Result<OkVal, never> {
      return ok<OkVal>(_okVal, {});
    },
    err<ErrVal>(_errVal: ErrVal): Result<never, ErrVal> {
      return err<ErrVal>(_errVal, {});
    },
  } as const;

  function isPromise(val: unknown): val is Promise<unknown> {
    return Promise.resolve(val) === val;
  }

  export function tryCatch<OkVal, ErrVal = unknown>(fn: () => OkVal, ctx?: $Context): Result<OkVal, ErrVal> {
    try {
      return ok<OkVal>(fn(), ctx);
    } catch (e) {
      return err<ErrVal>(e as ErrVal, ctx);
    }
  }

  function awaitOk<E, T extends Promise<E>, R>(fn: (i: Awaited<T>) => R): (a: T) => Promise<R> {
    return async (a: T) => fn(await a);
  }

  export function err<ErrVal>(_errVal: ErrVal, ctx?: $Context): Result<never, ErrVal> {
    const errResult: Partial<Result<never, ErrVal>> & Err<ErrVal> = makeErr<ErrVal>(_errVal, ctx);
    if (ctx && errResult.errValue !== ctx?.errValue) {
      // we don't want to create a function object on each call, so we initialize the ctx with a noop
      // to update the function, we depend on the errValue - should be good enough
      ctx.noopErr = () => err<ErrVal>(errResult.errValue, ctx);
    }

    /** READ **/
    errResult.getOrThrow = () => {
      throw ApplicationError.create("[unsafe] can't get okValue from Err!").chainUnknown(_errVal);
    };
    errResult.getOrThrowAsync = () => {
      throw ApplicationError.create("[unsafe] can't get okValue from Err!").chainUnknown(_errVal);
    };
    errResult.getOr = (a) => a;
    errResult.resolved = () => {
      if (isPromise(_errVal)) {
        return new Promise((resolve, reject) => {
          _errVal.then((resolvedErrValue) => {
            errResult.errValue = resolvedErrValue as Awaited<ErrVal>;
            resolve(errResult as Result<never, Awaited<ErrVal>>);
          }, reject);
        });
      }
      return Promise.resolve(errResult) as Promise<Result<never, Awaited<ErrVal>>>;
    };

    /** WRITE **/
    errResult.mapErr = <$NextVal>(fn: FnMapErr<$NextVal, ErrVal>) => err<$NextVal>(fn(_errVal), ctx);

    /** no ops **/
    const noop = (ctx?.noopErr ?? (() => err(_errVal, ctx))) as () => Result<never, ErrVal>;
    errResult.mapOk = noop;
    errResult.mapOkAsync = noop;
    errResult.andThen = noop;

    return errResult as Pick<
      Result<never, ErrVal>,
      "getOrThrow" | "isOk" | "mapOk" | "andThen" | "mapErr" | "getOr" | "resolved" | "mapOkAsync" | "getOrThrowAsync"
    > &
      Err<ErrVal>;
  }

  export function ok<OkVal>(_okVal: OkVal, ctx?: $Context): Result<OkVal, never> {
    const okResult: Partial<Result<OkVal, never>> & Ok<OkVal> = makeOk<OkVal>(_okVal, ctx);
    if (ctx && okResult.okValue !== ctx?.okValue) {
      // we don't want to create a function object on each call, so we initialize the ctx with a noop
      // to update the function, we depend on the errValue - should be good enough
      ctx.noopOk = () => ok<OkVal>(okResult.okValue, ctx);
    }

    /** READ **/
    okResult.getOrThrow = () => okResult.okValue;
    okResult.getOr = () => okResult.okValue;
    okResult.getOrThrowAsync = () => (isPromise(okResult.okValue) ? okResult.okValue : Promise.resolve(okResult.okValue)) as Promise<OkVal>;
    okResult.resolved = () => {
      if (isPromise(_okVal)) {
        return new Promise((resolve, reject) => {
          _okVal.then((resolvedOkValue) => {
            okResult.okValue = resolvedOkValue as Awaited<OkVal>;
            resolve(okResult as Result<Awaited<OkVal>, never>);
          }, reject);
        });
      }
      return Promise.resolve(okResult) as Promise<Result<Awaited<OkVal>, never>>;
    };

    /** WRITE **/
    okResult.mapOk = <$NextVal>(fn: FnMapOk<$NextVal, OkVal>) => tryCatch<$NextVal, never>(() => fn(okResult.okValue), ctx);
    okResult.mapOkAsync = <$NextOk>(fn: (a: Awaited<OkVal>) => Promise<$NextOk>) => {
      return tryCatch(() => awaitOk<OkVal, Promise<OkVal>, Promise<$NextOk>>(fn)(okResult.okValue as Promise<OkVal>), ctx) as Result<Promise<$NextOk>, never>;
    };
    okResult.andThen = <$NextVal, $NextErr>(fn: FnFlatMapOk<$NextVal, OkVal, $NextErr, never>) => {
      const newResult = fn(okResult.okValue);
      return newResult.isOk ? ok<$NextVal>(newResult.okValue, ctx) : (err<$NextErr>(newResult.errValue, ctx) as Result<never, $NextErr>);
    };

    /** no ops **/
    const noop = (ctx?.noopErr ?? (() => ok(_okVal, ctx))) as () => Result<OkVal, never>;
    okResult.mapErr = noop;
    return okResult as Pick<
      Result<OkVal, never>,
      "getOrThrow" | "isOk" | "mapOk" | "andThen" | "mapErr" | "getOr" | "resolved" | "mapOkAsync" | "getOrThrowAsync"
    > &
      Ok<OkVal>;
  }

  function makeOk<T>(val: T, ctx?: $Context): $Ok<T> {
    if (ctx !== null && typeof ctx === "object") {
      ctx.isOk = true;
      ctx.okValue = val;
      delete ctx.errValue;
      return ctx as Partial<Result<T, never>> & $Ok<T>;
    }
    return {
      isOk: true,
      okValue: val,
    };
  }

  function makeErr<T>(val: T, ctx?: $Context): Err<typeof val> {
    if (ctx !== null && typeof ctx === "object") {
      ctx.isOk = false;
      ctx.errValue = val;
      delete ctx.okValue;
      return ctx as Err<typeof val>;
    }
    return {
      isOk: false,
      errValue: val,
    };
  }
}
