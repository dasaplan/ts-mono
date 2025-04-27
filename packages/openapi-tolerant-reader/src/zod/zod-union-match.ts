import { z } from "zod";

export module ZodUnionMatch {
  // export type UNKNOWN = string & z.BRAND<"UNKNOWN">;
  export type Matcher = Record<string, z.ZodType>;

  export type Schemas<T extends Matcher> = T[keyof T];
  export type Discriminator<T extends Matcher> = RecDiscriminator<Schemas<T>>;
  export type RecDiscriminator<T extends z.ZodType> = T extends z.ZodUnion<infer Options> ? RecDiscriminator<Options[number]> : keyof z.infer<T>;

  export function matcher<T extends Matcher>(discriminator: Discriminator<T>, matcher: T): Schemas<T> {
    return z
      .custom<T>()
      .transform((val) => {
        const result = matchSafe(val, matcher, discriminator);
        return { result, val };
      })
      .superRefine((prev, ctx) => {
        if (!prev.result.success) {
          const discriminatorValue = prev.val?.[discriminator as keyof T];
          const discriminatorProp = JSON.stringify(discriminator);
          const discriminatorWithValue = `${discriminatorProp}: ${discriminatorValue}`;
          const expected =
            typeof discriminatorValue === "string" && discriminatorValue in matcher
              ? "respective schema"
              : `{${discriminatorProp}: ${Object.keys(matcher).join(" | ")}}`;
          ctx.issues.push({
            code: "invalid_union",
            input: ctx.value,
            errors: [prev.result.error.issues],
            message: `Invalid discriminated union: expected input to match with discriminator ${expected} but received discriminator: (${
              discriminatorWithValue ?? ""
            }) `,
          });
        }
      })
      .transform((v) => (v.result.success ? v.result.data : v.val)) as unknown as Schemas<T>;
  }
  export function match<T extends Matcher>(union: z.infer<Schemas<T>>, matcher: T, discriminator: Discriminator<T>): T {
    const handlerKey = union[discriminator] as keyof typeof matcher;
    return (handlerKey in matcher ? (matcher[handlerKey] as z.Schema<T>).parse(union) : matcher.onDefault.parse(union)) as T;
  }
  export function matchSafe<T extends Matcher>(
    union: z.infer<Schemas<T>>,
    matcher: T,
    discriminator: Discriminator<T>,
  ): z.ZodSafeParseSuccess<Schemas<T>> | z.ZodSafeParseError<z.ZodError> {
    const handlerKey = union?.[discriminator] as keyof typeof matcher;
    return (handlerKey in matcher ? (matcher?.[handlerKey] as z.Schema<T>)?.safeParse(union) : matcher.onDefault.safeParse(union)) as
      | z.ZodSafeParseSuccess<Schemas<T>>
      | z.ZodSafeParseError<z.ZodError>;
  }
}
