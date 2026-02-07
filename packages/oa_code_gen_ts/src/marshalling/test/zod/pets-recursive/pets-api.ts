import { z } from 'zod'
import * as zc from './zod-common.js'

export namespace Schemas {
    export const PetBase = z.object({ type: z.string() });
    export const Dog: z.ZodTypeAny = z.lazy(() => PetBase.merge(z.object({ friends: Pets.optional(), type: z.literal('DOG') })));
    export const Cat: z.ZodTypeAny = z.lazy(() => PetBase.merge(z.object({ enemies: Pets.optional(), type: z.literal('CAT') })));
    export const Pet = zc.ZodUnionMatch.matcher("type", { 'CAT': Cat, 'DOG': Dog, onDefault: z.object({ type: z.string().transform((s) => `unknown:${s}` as const) }).passthrough() });
    export const Pets: z.ZodTypeAny = z.lazy(() => z.object({ pets: z.array(Pet).max(100).optional() }));

    export namespace Types {
        export type PetBase = z.infer<typeof Schemas.PetBase>;
        export type Dog = z.infer<typeof Schemas.Dog>;
        export type Cat = z.infer<typeof Schemas.Cat>;
        export type Pet = z.infer<typeof Schemas.Pet>;
        export type Pets = z.infer<typeof Schemas.Pets>;
    }


    export namespace Unions {
        export const Pet = z.union([Cat, Dog]);
    }

    export const Endpoints = {
        "listPets": {
            path: "/pets",
            method: "get",
            params: { header: z.object({}), path: z.object({}), query: z.object({}), cookie: z.object({}), },
            responses: {
                200: Pets
            },
            request: undefined
        }
    } as const
}
