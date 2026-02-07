import { z } from 'zod'
import * as zc from './zod-common.js'

export namespace Schemas {
    export const PetBase = z.object({ type: z.string(), name: z.string().optional() });
    export const DogEnum = z.enum(['DOG_A', 'DOG_B']).or(z.string().transform((s) => `unknown:${s}` as const));
    export const Dog = PetBase.merge(z.object({ fluffy: z.boolean().optional(), breed: DogEnum.optional(), type: z.literal('DOG') }));
    export const Cat = PetBase.merge(z.object({ breed: z.enum(['CAT_A', 'CAT_B']).or(z.string().transform((s) => `unknown:${s}` as const)).optional(), type: z.literal('CAT') }));
    export const Pet = zc.ZodUnionMatch.matcher("type", { 'DOG': Dog, 'CAT': Cat, onDefault: z.object({ type: z.string().transform((s) => `unknown:${s}` as const) }).passthrough() });

    export namespace Types {
        export type PetBase = z.infer<typeof Schemas.PetBase>;
        export type DogEnum = z.infer<typeof Schemas.DogEnum>;
        export type Dog = z.infer<typeof Schemas.Dog>;
        export type Cat = z.infer<typeof Schemas.Cat>;
        export type Pet = z.infer<typeof Schemas.Pet>;
    }


    export namespace Unions {
        export const Pet = z.union([Cat, Dog]);
    }

    export const Endpoints = {
        "getPets": {
            path: "/v1/pets",
            method: "get",
            params: { header: z.object({}), path: z.object({}), query: z.object({}), cookie: z.object({}), },
            responses: {
                200: Pet
            },
            request: undefined
        }
    } as const
}
