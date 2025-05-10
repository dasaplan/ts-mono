// @ts-nocheck

import { ApplicationError } from "./error.js";

export type Result<T, E> = Ok<T> | Err<E>;

export type FnOk<T, $NextVal> = T extends Ok<infer OkVal> ? (ok: OkVal) => $NextVal : never;
export type FnErr<T, $NextVal> = T extends Err<infer ErrVal> ? (ok: ErrVal) => $NextVal : never;

const onOk: FnOk<Ok<string>, number> = (ok) => Number.parseInt(ok);
const parsed = onOk("test");

export type Pipe<Ok, Err> = Result<Ok, Err> & {
  onOkValue: <T extends Result<$Ok, $Err>, $Ok, $NextOk, $Err>(fn: (val: T) => $NextOk) => Pipe<$NextOk, $Err>;
  onOk: <T extends Result<$Ok, $Err>, $NextOk, $NextErr, $Ok, $Err>(fn: (val: T) => Result<$NextOk, $NextErr>) => Pipe<$NextOk, $NextErr>;
};

export type Ok<T> = $Ok<T> & {
  wait: () => Promise<$Ok<Awaited<T>>>;
};
export type Err<E> = $Err<E> & {
  wait: () => Promise<$Err<Awaited<E>>>;
};
export type $Ok<T> = { isOk: true; okValue: T };
export type $Err<E> = { isOk: false; errValue: E };

export namespace Result {
  function isPromise(val: unknown): val is Promise<unknown> {
    return Promise.resolve(val) === val;
  }

  export function pipe<Ok, Err>(val: Result<Ok, Err>): Pipe<Ok, Err> {
    return {
      ...val,
      onOkValue: (fn) => {
        pipe(val.isOk ? ok(fn(val.okValue)) : val);
      },
      onOk: <$Ok, $Err>(fn) => pipe<$Ok, $Err>(val as unknown as Result<$Ok, $Err>),
    };
  }
  export function ok<T>(val: T | Promise<T>): Ok<typeof val> {
    return {
      isOk: true,
      okValue: val,
      wait: async () => {
        return { isOk: true, okValue: await val };
      },
    };
  }

  export function err<T>(val: T | Promise<T>): Err<typeof val> {
    return {
      isOk: false,
      errValue: val,
      wait: async () => {
        return { isOk: false, errValue: await val };
      },
    };
  }

  //
  // export function tryAsync<R, T extends () => Promise<R>>(fn: T): Result<T, ApplicationError> {
  //   try {
  //     return ok(fn());
  //   } catch (e) {
  //     return err(ApplicationError.from(e));
  //   }
  // }
  //
  // export function trySync<T>(fn: () => T): Result<T, ApplicationError> {
  //   try {
  //     return ok(fn());
  //   } catch (e) {
  //     return err(ApplicationError.from(e));
  //   }
  // }
}
