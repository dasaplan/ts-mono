"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Schemas = void 0;
var zod_1 = require("zod");
var Schemas;
(function (Schemas) {
    Schemas.Base = zod_1.z.object({ type: zod_1.z.string().optional() });
    Schemas.B = Schemas.Base.extend(zod_1.z.object({
        get children() {
            return zod_1.z.array(Schemas.Rec).optional();
        },
        type: zod_1.z.literal("B"),
    }));
    Schemas.Rec = zod_1.z.object({
        get a() {
            return Schemas.A.optional();
        },
        get b() {
            return Schemas.B.optional();
        },
        get child() {
            return Schemas.Child.optional();
        },
        get node() {
            return Schemas.Node.optional();
        },
    });
    Schemas.A = Schemas.Base.extend(zod_1.z.object({
        get children() {
            return zod_1.z.array(Schemas.Rec).optional();
        },
        type: zod_1.z.literal("A"),
    }));
    Schemas.Child = zod_1.z.discriminatedUnion("type", [Schemas.A, Schemas.B]);
    Schemas.Node = zod_1.z.object({
        id: zod_1.z.string().optional(),
        get parent() {
            return Schemas.Node.optional();
        },
        get children() {
            return zod_1.z.array(Schemas.Child).optional();
        },
    });
    var Unions;
    (function (Unions) {
        Unions.Child = zod_1.z.lazy(function () { return zod_1.z.union([Schemas.A, Schemas.B]); });
    })(Unions = Schemas.Unions || (Schemas.Unions = {}));
})(Schemas || (exports.Schemas = Schemas = {}));
