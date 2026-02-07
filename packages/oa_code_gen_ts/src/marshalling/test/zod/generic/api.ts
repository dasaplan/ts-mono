import { z } from 'zod'
import * as zc from './zod-common.js'

export namespace Schemas {
    export const PetBase = z.object({ id: z.number().int().min(1), type: z.string() });
    export const GenericPet = PetBase.merge(z.object({ name: z.string().optional(), type: z.enum(['BIRD', 'HAMSTER']) }));
    export const Dog = PetBase.merge(z.object({ bark: z.string(), type: z.literal('DOG') }));
    export const ShortHair = PetBase.merge(z.object({ catType: z.literal('SHORT').default('SHORT'), angryLevel: z.string().optional(), color: z.string(), type: z.literal('CAT') }));
    export const Seam = PetBase.merge(z.object({ catType: z.literal('SEAM').default('SEAM'), angryLevel: z.string().regex(/\w+/).optional(), color: z.string(), type: z.literal('CAT') }));
    export const Cat = zc.ZodUnionMatch.matcher("catType", { 'SEAM': Seam, 'SHORT': ShortHair, onDefault: z.object({ catType: z.string().transform((s) => `unknown:${s}` as const) }).passthrough() });
    export const Pet = zc.ZodUnionMatch.matcher("type", { 'DOG': Dog, 'CAT': Cat, 'BIRD': GenericPet, 'HAMSTER': GenericPet, onDefault: z.object({ type: z.string().transform((s) => `unknown:${s}` as const) }).passthrough() });
    export const Pets = z.array(Pet).max(100);
    export const CatBase = PetBase.merge(z.object({ color: z.string(), catType: z.enum(['SEAM', 'SHORT']).or(z.string().transform((s) => `unknown:${s}` as const)).optional() }));

    export namespace Types {
        export type PetBase = z.infer<typeof Schemas.PetBase>;
        export type GenericPet = z.infer<typeof Schemas.GenericPet>;
        export type Dog = z.infer<typeof Schemas.Dog>;
        export type ShortHair = z.infer<typeof Schemas.ShortHair>;
        export type Seam = z.infer<typeof Schemas.Seam>;
        export type Cat = z.infer<typeof Schemas.Cat>;
        export type Pet = z.infer<typeof Schemas.Pet>;
        export type Pets = z.infer<typeof Schemas.Pets>;
        export type CatBase = z.infer<typeof Schemas.CatBase>;
    }


    export namespace Unions {
        export const Cat = z.union([Seam, ShortHair]);
        export const Pet = z.union([Cat, Dog, GenericPet]);
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
        },
        "getPet": {
            path: "/pets/{petId}",
            method: "get",
            params: { header: z.object({}), path: z.object({ "petId": z.string() }), query: z.object({}), cookie: z.object({}), },
            responses: {
                200: Pet
            },
            request: undefined
        }
    } as const
}
