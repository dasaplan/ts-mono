import { z } from 'zod'
import * as zc from './zod-common.js'

export namespace Schemas {
    export const Base = z.object({ type: z.string().optional() });
    export const B: z.ZodTypeAny = Base.merge(z.object({ children: z.lazy(() => z.array(Rec)).optional(), type: z.literal('B') }));
    export const Rec: z.ZodTypeAny = z.lazy(() => z.object({ a: A.optional(), b: B.optional(), child: Child.optional(), node: Node.optional() }));
    export const A: z.ZodTypeAny = z.lazy(() => Base.merge(z.object({ children: z.lazy(() => z.array(Rec)).optional(), type: z.literal('A') })));
    export const Child: z.ZodTypeAny = z.lazy(() => zc.ZodUnionMatch.matcher("type", { 'A': A, 'B': B, onDefault: z.object({ type: z.string().transform((s) => `unknown:${s}` as const) }).passthrough() }));
    export const Node: z.ZodTypeAny = z.lazy(() => z.object({ id: z.string().optional(), parent: Node.optional(), children: z.lazy(() => z.array(Child)).optional() }));

    export namespace Types {
        export type Base = z.infer<typeof Schemas.Base>;
        export type B = z.infer<typeof Schemas.B>;
        export type Rec = z.infer<typeof Schemas.Rec>;
        export type A = z.infer<typeof Schemas.A>;
        export type Child = z.infer<typeof Schemas.Child>;
        export type Node = z.infer<typeof Schemas.Node>;
    }


    export namespace Unions {
        export const Child = z.lazy(() => z.union([A, B]));
    }

    export const Endpoints = {} as const
}
