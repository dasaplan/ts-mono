import { z } from "zod";

export declare const BRAND: unique symbol;

export declare type BRAND<T extends string | number | symbol> = {
  [BRAND]: { [k in T]: true };
};

/**
 * Use this to match with enum variants defined by ts generator
 *
 * To avoid casting from one API to another api, it is important that the branding of both APIs use the same unique symbol.
 * We can achieve that, when we provide the opaque type by a peer-dependency where the consumer can provide its own lib version.
 *
 * @example
 * ```typescript
 *     switch (a.type) {
 *       case "A":
 *         break;
 *       default: {
 *         // @ts-expect-error "B" is missing
 *         // eslint-disable-next-line @typescript-eslint/no-unused-vars
 *         const check: UNKNOWN_ENUM_VARIANT_TS = a.type;
 *         throw new Error("test failed 2");
 *       }
 *     }
 * ```
 * */
export type UNKNOWN_ENUM_VARIANT_TS = string & BRAND<"UNKNOWN">;

/**
 * Use this to match with enum variants defined by zod generator
 *
 * To avoid casting from one API to another api, it is important that the branding of both APIs use the same unique symbol.
 * We can achieve that, when we provide the opaque type by a peer-dependency where the consumer can provide its own lib version.
 *
 * @example
 * ```typescript
 *     switch (a.type) {
 *       case "A":
 *         break;
 *       default: {
 *         // @ts-expect-error "B" is missing
 *         // eslint-disable-next-line @typescript-eslint/no-unused-vars
 *         const check: UNKNOWN_ENUM_VARIANT_ZOD = a.type;
 *         throw new Error("test failed 2");
 *       }
 *     }
 * ```
 * */
export type UNKNOWN_ENUM_VARIANT_ZOD = string & z.BRAND<"UNKNOWN">;
