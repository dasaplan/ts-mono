/* eslint-disable @typescript-eslint/no-unused-vars,@typescript-eslint/no-explicit-any */
// noinspection ES6UnusedImports,JSUnusedLocalSymbols
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import lodash from "lodash";

declare module "lodash" {
  interface LoDashStatic {
    isDefined<T>(input: T): input is NonNullable<T>;
    withPerformance<T>(
      fun: () => Promise<T>
    ): Promise<PerformanceResult<Awaited<T>>>;
    withLogPerformanceSync<T>(subject: string, fun: () => T): T;
  }
  interface LoDashExplicitWrapper<TValue> {
    isDefined(input: TValue): LoDashExplicitWrapper<NonNullable<TValue>>;
    withPerformance<T>(
      fun: () => Promise<T>
    ): Promise<PerformanceResult<Awaited<T>>>;
    withLogPerformanceSync<T>(subject: string, fun: () => T): T;
  }
}

export interface PerformanceResult<T> {
  duration: number;
  ret: T;
}

lodash.mixin({
  isDefined: <T>(input: T | undefined) => !lodash.isNil(input),
  withLogPerformanceSync<T>(subject: string, fun: () => T): T {
    const start = performance.now();
    const ret = fun();
    const end = performance.now();
    console.log(`Performance: ${subject} took ${end - start}`);
    return ret;
  },
  async withPerformance<T>(
    fun: () => Promise<T>
  ): Promise<PerformanceResult<Awaited<T>>> {
    const start = performance.now();
    const ret = await fun();
    const end = performance.now();
    return { duration: end - start, ret };
  },
});

export const _ = lodash;
export default lodash;
