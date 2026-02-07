export function getZodCommon() {
  return `
import { z } from "zod";

export namespace ZodUnionMatch {
  export type DiscriminatorValue = string;
  export type Matcher = Record<DiscriminatorValue, z.ZodType>;

  export type Schemas<T extends Matcher> = T[keyof T];
  export type Discriminator<T extends Matcher> = RecDiscriminator<Schemas<T>>;
  /** recursively find discriminator values from nested ZodUnion */
  export type RecDiscriminator<T extends z.ZodType | z.core.SomeType> =
    T extends z.ZodUnion<infer Options> ? RecDiscriminator<Options[number]> : keyof z.output<T>;

  export function matcher<T extends Matcher>(discriminator: Discriminator<T>, matcher: T): Schemas<T> {
    return z
      .custom<z.output<Schemas<T>>>()
      .transform((val) => {
        const result = matchSafe<T>(val, matcher, discriminator);
        return { result, val };
      })
      .superRefine((prev, ctx) => {
        if (!prev.result.success) {
          // we need to extract the value for the discriminator { "foo": "bar"}
          // => "foo" is the discriminator and "bar" the value
          const discriminatorValue = prev.val?.[discriminator as keyof typeof prev.val];
          const discriminatorProp = JSON.stringify(discriminator);
          const discriminatorWithValue = \`\${discriminatorProp}: \${discriminatorValue}\`;
          const expected =
            typeof discriminatorValue === "string" && discriminatorValue in matcher
              ? "respective schema"
              : \`{\${discriminatorProp}: \${Object.keys(matcher).join(" | ")}}\`;
          ctx.addIssue({
            code: "invalid_union",
            input: ctx.value,
            errors: [prev.result.error.issues],
            message: \`Invalid discriminated union: expected input to match with discriminator \${expected} but received discriminator: (\${
              discriminatorWithValue ?? ""
            }) \`,
          });
        }
      })
      .transform((v) => (v.result.success ? v.result.data : v.val)) as unknown as Schemas<T>;
  }
  export function match<T extends Matcher>(union: z.output<Schemas<T>>, matcher: T, discriminator: Discriminator<T>): T {
    const handlerKey = union[discriminator] as keyof typeof matcher;
    return handlerKey in matcher ? (matcher[handlerKey] as z.Schema<T>).parse(union) : (matcher.onDefault.parse(union) as T);
  }
  export function matchSafe<T extends Matcher>(
    union: z.output<Schemas<T>>,
    matcher: T,
    discriminator: Discriminator<T>,
  ): z.ZodSafeParseSuccess<Schemas<T>> | z.ZodSafeParseError<z.ZodError> {
    const handlerKey = union?.[discriminator] as keyof typeof matcher;
    return (handlerKey in matcher ? (matcher?.[handlerKey] as z.Schema<T>)?.safeParse(union) : matcher.onDefault.safeParse(union)) as
      | z.ZodSafeParseSuccess<Schemas<T>>
      | z.ZodSafeParseError<z.ZodError>;
  }
}`;
}
