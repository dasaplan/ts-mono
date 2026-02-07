import { z } from 'zod'
import * as zc from './zod-common.js'

export namespace Schemas {
    export const RegisterResponse = z.object({ token: z.string(), userId: z.string() });
    export const LoginResponse = z.object({ token: z.string() });
    export const LoginRequest = z.object({ username: z.string(), password: z.string() });
    export const InventoryStockItem = z.object({ quantity: z.number(), priceEuro: z.number(), purchaseDate: z.string(), stockId: z.string(), productId: z.string() });
    export const InventoryStockHistory = z.object({ eventDate: z.string(), eventPrice: z.number(), deltaRevenue: z.number(), event: z.enum(['GIFTED', 'SOLD', 'PURCHASED']).or(z.string().transform((s) => `unknown:${s}` as const)), quantity: z.number(), priceEuro: z.number(), purchaseDate: z.string(), stockId: z.string(), productId: z.string() });
    export const InventoryStock = z.object({ history: z.array(InventoryStockHistory), inventory: z.array(InventoryStockItem), quantity: z.number() });
    export const InventoryItemStats = z.object({ totalPurchase: z.number(), totalSells: z.number() });
    export const WeightUnit = z.enum(['kg', 'g', 'oz_tr']).or(z.string().transform((s) => `unknown:${s}` as const));
    export const Weight = z.object({ unit: WeightUnit, value: z.number() });
    export const ItemType = z.enum(['B', 'El', 'kA', 'Ka', 'KA', 'KR', 'Pa', 'LIII', 'ML', 'R', 'Phil', 'BR']).or(z.string().transform((s) => `unknown:${s}` as const));
    export const Product = z.object({ externalId: z.string().optional(), itemType: ItemType, weight: Weight, productId: z.string() });
    export const InventoryItem = z.object({ inventoryId: z.string(), product: Product.optional(), quantity: z.number(), invest: z.number().optional(), stats: InventoryItemStats.optional(), revenue: z.number().optional(), stock: InventoryStock.optional() });
    export const InventorySummaryResponse = z.object({ message: z.enum(['ok']).or(z.string().transform((s) => `unknown:${s}` as const)), items: z.array(InventoryItem) });
    export const ChangeItemDetails = z.object({ quantity: z.number().optional(), priceEuro: z.number().optional(), purchaseDate: z.string().optional() });
    export const ChangeItemRequest = z.object({ createdAt: z.string(), event: z.enum(['PURCHASED', 'GIFTED', 'SOLD']).or(z.string().transform((s) => `unknown:${s}` as const)), details: ChangeItemDetails });
    export const SuccessResponse = z.object({ message: z.enum(['ok']).or(z.string().transform((s) => `unknown:${s}` as const)) });
    export const UpdateItemRequestDetails = z.object({ quantity: z.number().optional(), priceEuro: z.number().optional(), purchaseDate: z.string().optional(), stockId: z.string(), productId: z.string() });
    export const UpdateItemRequest = z.object({ event: z.enum(['UPDATED']).or(z.string().transform((s) => `unknown:${s}` as const)), createdAt: z.string(), details: UpdateItemRequestDetails });
    export const PurchasedEventDetailBase = z.object({ kind: z.string().optional() });
    export const PurchasedEventDetailItemProduct = PurchasedEventDetailBase.merge(z.object({ kind: z.string().optional().default('PRODUCT_REF'), productId: z.string() }));
    export const PurchasedEventDetailItemSpecified = PurchasedEventDetailBase.merge(z.object({ kind: z.string().optional().default('SPECIFIED'), itemType: ItemType, weight: Weight }));
    export const PurchasedEventDetailItem = z.union([PurchasedEventDetailItemSpecified, PurchasedEventDetailItemProduct]);
    export const PurchasedEventDetail = z.object({ item: PurchasedEventDetailItem, quantity: z.number(), priceEuro: z.number(), purchaseDate: z.string().optional() });
    export const CreateItemDetails = z.object({ details: PurchasedEventDetail });
    export const CreateItem = z.object({ details: CreateItemDetails });
    export const InventoryItemList = z.object({ items: z.array(InventoryItem) });
    export const Error = z.object({ error: z.string().optional() });
    export const ChangeConstantBase = z.object({ event: z.string() });
    export const GoldPriceUpdateDetails = z.object({ unit: WeightUnit, price: z.number() });
    export const ChangeConstantUser = ChangeConstantBase.merge(z.object({ inventoryId: z.string(), details: GoldPriceUpdateDetails, event: z.literal('UPDATE_DOUGH_PRICE').default('UPDATE_DOUGH_PRICE') }));
    export const ChangeConstantGlobal = ChangeConstantBase.merge(z.object({ details: GoldPriceUpdateDetails, event: z.literal('GLOBAL_UPDATE_DOUGH_PRICE') }));
    export const ChangeConstant = zc.ZodUnionMatch.matcher("event", { 'UPDATE_DOUGH_PRICE': ChangeConstantUser, 'GLOBAL_UPDATE_DOUGH_PRICE': ChangeConstantGlobal, onDefault: z.object({ event: z.string().transform((s) => `unknown:${s}` as const) }).passthrough() });
    export const GoldPriceRates = z.object({ g: z.number(), kg: z.number(), oz_tr: z.number() });
    export const ConstantBase = z.object({ version: z.number(), updatedAt: z.string(), ratesByWeight: GoldPriceRates });
    export const Constant = z.object({ history: ConstantBase.optional(), version: z.number(), updatedAt: z.string(), ratesByWeight: GoldPriceRates });
    export const Constants = z.object({ doughPrices: Constant });

    export namespace Types {
        export type RegisterResponse = z.infer<typeof Schemas.RegisterResponse>;
        export type LoginResponse = z.infer<typeof Schemas.LoginResponse>;
        export type LoginRequest = z.infer<typeof Schemas.LoginRequest>;
        export type InventoryStockItem = z.infer<typeof Schemas.InventoryStockItem>;
        export type InventoryStockHistory = z.infer<typeof Schemas.InventoryStockHistory>;
        export type InventoryStock = z.infer<typeof Schemas.InventoryStock>;
        export type InventoryItemStats = z.infer<typeof Schemas.InventoryItemStats>;
        export type WeightUnit = z.infer<typeof Schemas.WeightUnit>;
        export type Weight = z.infer<typeof Schemas.Weight>;
        export type ItemType = z.infer<typeof Schemas.ItemType>;
        export type Product = z.infer<typeof Schemas.Product>;
        export type InventoryItem = z.infer<typeof Schemas.InventoryItem>;
        export type InventorySummaryResponse = z.infer<typeof Schemas.InventorySummaryResponse>;
        export type ChangeItemDetails = z.infer<typeof Schemas.ChangeItemDetails>;
        export type ChangeItemRequest = z.infer<typeof Schemas.ChangeItemRequest>;
        export type SuccessResponse = z.infer<typeof Schemas.SuccessResponse>;
        export type UpdateItemRequestDetails = z.infer<typeof Schemas.UpdateItemRequestDetails>;
        export type UpdateItemRequest = z.infer<typeof Schemas.UpdateItemRequest>;
        export type PurchasedEventDetailBase = z.infer<typeof Schemas.PurchasedEventDetailBase>;
        export type PurchasedEventDetailItemProduct = z.infer<typeof Schemas.PurchasedEventDetailItemProduct>;
        export type PurchasedEventDetailItemSpecified = z.infer<typeof Schemas.PurchasedEventDetailItemSpecified>;
        export type PurchasedEventDetailItem = z.infer<typeof Schemas.PurchasedEventDetailItem>;
        export type PurchasedEventDetail = z.infer<typeof Schemas.PurchasedEventDetail>;
        export type CreateItemDetails = z.infer<typeof Schemas.CreateItemDetails>;
        export type CreateItem = z.infer<typeof Schemas.CreateItem>;
        export type InventoryItemList = z.infer<typeof Schemas.InventoryItemList>;
        export type Error = z.infer<typeof Schemas.Error>;
        export type ChangeConstantBase = z.infer<typeof Schemas.ChangeConstantBase>;
        export type GoldPriceUpdateDetails = z.infer<typeof Schemas.GoldPriceUpdateDetails>;
        export type ChangeConstantUser = z.infer<typeof Schemas.ChangeConstantUser>;
        export type ChangeConstantGlobal = z.infer<typeof Schemas.ChangeConstantGlobal>;
        export type ChangeConstant = z.infer<typeof Schemas.ChangeConstant>;
        export type GoldPriceRates = z.infer<typeof Schemas.GoldPriceRates>;
        export type ConstantBase = z.infer<typeof Schemas.ConstantBase>;
        export type Constant = z.infer<typeof Schemas.Constant>;
        export type Constants = z.infer<typeof Schemas.Constants>;
    }


    export namespace Unions {
        export const PurchasedEventDetailItem = z.union([PurchasedEventDetailItemSpecified, PurchasedEventDetailItemProduct]);
        export const ChangeConstant = z.union([ChangeConstantGlobal, ChangeConstantUser]);
    }

    export const Endpoints = {
        "getConstants": {
            path: "/constants",
            method: "get",
            params: { header: z.object({}), path: z.object({}), query: z.object({}), cookie: z.object({}), },
            responses: {
                200: Constants
            },
            request: undefined
        },
        "upsertConstant": {
            path: "/constants",
            method: "post",
            params: { header: z.object({}), path: z.object({}), query: z.object({}), cookie: z.object({}), },
            responses: {
                200: Constants,
                400: Error
            },
            request: ChangeConstant
        },
        "getInventories": {
            path: "/inventory",
            method: "get",
            params: { header: z.object({}), path: z.object({}), query: z.object({}), cookie: z.object({}), },
            responses: {
                200: InventoryItemList
            },
            request: undefined
        },
        "createInventoryItem": {
            path: "/inventory",
            method: "post",
            params: { header: z.object({}), path: z.object({}), query: z.object({}), cookie: z.object({}), },
            responses: {
                201: InventoryItem,
                400: Error
            },
            request: CreateItem
        },
        "updateInventoryItem": {
            path: "/inventory/{productId}",
            method: "put",
            params: { header: z.object({}), path: z.object({ "productId": z.string() }), query: z.object({}), cookie: z.object({}), },
            responses: {
                201: SuccessResponse,
                400: Error,
                404: Error
            },
            request: UpdateItemRequest
        },
        "changeInventoryItem": {
            path: "/inventory/{productId}",
            method: "post",
            params: { header: z.object({}), path: z.object({ "productId": z.string() }), query: z.object({}), cookie: z.object({}), },
            responses: {
                201: SuccessResponse,
                400: Error,
                404: Error
            },
            request: ChangeItemRequest
        },
        "getInventorySummary": {
            path: "/inventory/summary",
            method: "get",
            params: { header: z.object({}), path: z.object({}), query: z.object({}), cookie: z.object({}), },
            responses: {
                200: InventorySummaryResponse,
                401: Error
            },
            request: undefined
        },
        "login": {
            path: "/login",
            method: "post",
            params: { header: z.object({}), path: z.object({}), query: z.object({}), cookie: z.object({}), },
            responses: {
                201: LoginResponse,
                400: Error,
                401: Error,
                404: Error
            },
            request: LoginRequest
        },
        "register": {
            path: "/register",
            method: "post",
            params: { header: z.object({}), path: z.object({}), query: z.object({}), cookie: z.object({}), },
            responses: {
                201: RegisterResponse,
                400: Error,
                401: Error
            },
            request: LoginRequest
        },
        "importInventory": {
            path: "/import/inventory",
            method: "post",
            params: { header: z.object({}), path: z.object({}), query: z.object({}), cookie: z.object({}), },
            responses: {
                500: Error
            },
            request: undefined
        },
        "saveInventory": {
            path: "/save/inventory",
            method: "post",
            params: { header: z.object({}), path: z.object({}), query: z.object({}), cookie: z.object({}), },
            responses: {
                500: Error
            },
            request: undefined
        }
    } as const
}
