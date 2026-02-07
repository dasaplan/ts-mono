import { z } from 'zod'
import * as zc from './zod-common.js'

export namespace Schemas {
    export const Node = z.object({ id: z.string(), name: z.string().optional().default('foo'), tel: z.number().optional().default(123456), isNice: z.boolean().optional().default(false), hobbies: z.enum(['a', 'b', 'c']).or(z.string().transform((s) => `unknown:${s}` as const)).optional().default('b') });

    export namespace Types {
        export type Node = z.infer<typeof Schemas.Node>;
    }

    export const Endpoints = {} as const
}
