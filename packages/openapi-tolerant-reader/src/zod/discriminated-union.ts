import { z } from "zod";

export module ZodDiscriminatedUnion {
  export type Handler<I> = z.Schema<I>;
  export type Matcher<T extends object, Discriminator extends keyof T> = Discriminator extends string
    ? {
        [K in T as K[Discriminator] extends string | number ? K[Discriminator] : never]: Handler<Extract<T, { type: K[Discriminator] }>>;
      } & { onDefault: Handler<{ [d in Discriminator]: string }> }
    : never;

  export function of<T extends object>(discriminator: keyof T & string, matcher: ZodDiscriminatedUnion.Matcher<T, typeof discriminator>): z.Schema<T> {
    return z
      .custom<T>()
      .transform((val) => {
        const result = ZodDiscriminatedUnion.matchSafe<T, typeof discriminator>(val, matcher, discriminator);
        return { result, val };
      })
      .superRefine((prev, ctx) => {
        if (!prev.result.success) {
          ctx.addIssue({
            code: "custom",
            message: `Invalid discriminated union - expected '${discriminator}' of type string but received ${typeof prev}: ${JSON.stringify(prev.val)}`,
          });
        }
      })
      .transform((v) => (v.result.success ? v.result.data : v.val));
  }

  export function match<T extends object, D extends keyof T>(union: T, matcher: Matcher<T, D>, discriminator: D): T {
    const handlerKey = union[discriminator] as keyof typeof matcher;
    return (handlerKey in matcher ? (matcher[handlerKey] as z.Schema<T>).parse(union) : matcher.onDefault.parse(union)) as T;
  }
  export function matchSafe<T extends object, D extends keyof T>(
    union: T,
    matcher: Matcher<T, D>,
    discriminator: D,
  ): z.ZodSafeParseSuccess<T> | z.ZodSafeParseError<z.ZodError> {
    const handlerKey = union?.[discriminator] as keyof typeof matcher;
    return (handlerKey in matcher ? (matcher?.[handlerKey] as z.Schema<T>)?.safeParse(union) : matcher.onDefault.safeParse(union)) as
      | z.ZodSafeParseSuccess<T>
      | z.ZodSafeParseError<z.ZodError>;
  }
}
