import { z } from 'zod'
import * as zc from './zod-common.js'

export namespace Schemas {
    export const FluffLevel = z.enum(['A', 'B', 'C']).or(z.string().transform((s) => `unknown:${s}` as const));
    export const SchemasToy = z.object({ id: z.string(), price: z.string(), kind: z.string(), someEnum: z.enum(['FOO', 'BAR']).or(z.string().transform((s) => `unknown:${s}` as const)).optional(), fluffLevel: FluffLevel.optional(), targetGroup: z.string().optional().default('CHILDREN') });
    export const FluffyTeddy = z.object({ fluffLevel: FluffLevel.optional(), id: z.string(), price: z.string(), kind: z.literal('TEDDY'), targetGroup: z.string().optional().default('CHILDREN') });
    export const Ball = z.object({ id: z.string(), price: z.string(), kind: z.literal('BALL'), fluffLevel: FluffLevel.optional(), targetGroup: z.string().optional().default('CHILDREN') });
    export const PetToy = zc.ZodUnionMatch.matcher("kind", { 'BALL': Ball, 'TEDDY': FluffyTeddy, onDefault: z.object({ kind: z.string().transform((s) => `unknown:${s}` as const) }).passthrough() });
    export const TargetGroup = z.string();
    export const SchemaUntitled = z.object({ untitledProp: z.string().optional() });
    export const Color = z.object({ colorId: z.string().optional(), untitled: SchemaUntitled.optional(), untitledProp: z.string().optional() });
    export const ComponentsSchemasToy = z.object({ name: z.string().optional(), color: Color.optional(), targetGroup: TargetGroup.optional().default('CHILDREN'), relates: PetToy.optional(), subId: z.string().optional(), id: z.string(), price: z.string(), kind: z.string(), someEnum: z.enum(['FOO', 'BAR']).or(z.string().transform((s) => `unknown:${s}` as const)).optional(), fluffLevel: FluffLevel.optional() });
    export const Pet = z.object({ id: z.number().int(), toy: ComponentsSchemasToy.optional(), leastFavToy: SchemasToy.optional(), favFluffLevel: FluffLevel.optional(), tag: z.string().optional(), name: z.string() });
    export const Pets = z.array(Pet).max(100);
    export const SchemaTitled = z.object({ titledProp: z.string().optional() });
    export const HttpErrorCode = z.number().int();
    export const Error = z.object({ code: HttpErrorCode, message: z.string(), titledSchema: SchemaTitled.optional() });

    export namespace Types {
        export type FluffLevel = z.infer<typeof Schemas.FluffLevel>;
        export type SchemasToy = z.infer<typeof Schemas.SchemasToy>;
        export type FluffyTeddy = z.infer<typeof Schemas.FluffyTeddy>;
        export type Ball = z.infer<typeof Schemas.Ball>;
        export type PetToy = z.infer<typeof Schemas.PetToy>;
        export type TargetGroup = z.infer<typeof Schemas.TargetGroup>;
        export type SchemaUntitled = z.infer<typeof Schemas.SchemaUntitled>;
        export type Color = z.infer<typeof Schemas.Color>;
        export type ComponentsSchemasToy = z.infer<typeof Schemas.ComponentsSchemasToy>;
        export type Pet = z.infer<typeof Schemas.Pet>;
        export type Pets = z.infer<typeof Schemas.Pets>;
        export type SchemaTitled = z.infer<typeof Schemas.SchemaTitled>;
        export type HttpErrorCode = z.infer<typeof Schemas.HttpErrorCode>;
        export type Error = z.infer<typeof Schemas.Error>;
    }


    export namespace Unions {
        export const PetToy = z.union([Ball, FluffyTeddy]);
    }

    export const Endpoints = {
        "listPets": {
            path: "/pets",
            method: "get",
            params: { header: z.object({}), path: z.object({ "petId": z.string() }), query: z.object({}), cookie: z.object({}), },
            responses: {
                200: Pets
            },
            request: undefined
        },
        "createPets": {
            path: "/pets",
            method: "post",
            params: { header: z.object({}), path: z.object({}), query: z.object({}), cookie: z.object({}), },
            responses: {

            },
            request: Pet
        },
        "showPetById": {
            path: "/pets/{petId}",
            method: "get",
            params: { header: z.object({}), path: z.object({ "petId": z.string() }), query: z.object({}), cookie: z.object({}), },
            responses: {
                200: Pet
            },
            request: undefined
        },
        "patchPet": {
            path: "/pets/{petId}",
            method: "patch",
            params: { header: z.object({}), path: z.object({ "petId": z.string() }), query: z.object({}), cookie: z.object({}), },
            responses: {
                200: Pet
            },
            request: Pet
        }
    } as const
}
