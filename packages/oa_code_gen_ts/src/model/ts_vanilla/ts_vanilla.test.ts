import { OpenapiBundledMock, bundleOpenapi, createSpecProcessor, OpenApiBundled } from "@dasaplan/openapi-bundler";
import { ExampleSpec, resolveSpecPath } from "openapi-example-specs";
import { generateTsSources, TsTypeGenOptions } from "./ts_generator.js";
import { describe, test, expect } from "vitest";

const options: () => TsTypeGenOptions = () => ({
  typeNameSuffix: "",
});

describe("generatets_vanilla", () => {
  const { withSchemas, createApi } = OpenapiBundledMock.create();

  test.each([
    "pets-simple/pets-api.yml",
    "pets-modular/pets-api.yml",
    "pets-modular-complex/petstore-api.yml",
    "generic/api.yml",
    "pets-recursive/pets-api.yml",
  ] satisfies Array<ExampleSpec>)("generates %s", async (spec) => {
    const api = resolveSpecPath(spec);
    const { parsed } = await bundleOpenapi(api, {
      postProcessor: createSpecProcessor({
        mergeAllOf: true,
        ensureDiscriminatorValues: true,
        xOmit: true,
      }),
    });
    const name = spec.replace(".yml", "");
    const { sourceFile } = await generateTsSources(parsed, `tmp/ts_vanilla/${name}.ts`, options());

    expect(sourceFile.getFullText()).toMatchSnapshot(name);
  });

  test("fullmetal", async () => {
    const spec = "fullmetal/openapi.yml";
    const api = resolveSpecPath(spec);
    const { parsed } = await bundleOpenapi(api, {
      postProcessor: createSpecProcessor({
        mergeAllOf: true,
        ensureDiscriminatorValues: true,
        xOmit: true,
      }),
    });
    const name = spec.replace(".yaml", "");
    const { sourceFile } = await generateTsSources(parsed, `tmp/ts_vanilla/${name}.ts`, options());

    expect(sourceFile.getFullText()).toMatchSnapshot(name);
  });

  test("circular schema", async () => {
    const openapi: OpenApiBundled = createApi(
      withSchemas({
        Node: {
          type: "object",
          properties: {
            id: { type: "string" },
            parent: { $ref: "#/components/schemas/Node" },
            children: { type: "array", items: { $ref: "#/components/schemas/Node" } },
          },
        },
      }),
    );

    const { sourceFile } = await generateTsSources(openapi, `tmp/ts_vanilla/circular.ts`, options());

    expect(sourceFile.getFullText()).toMatchSnapshot("circular");
  });

  test("default", async () => {
    const openapi: OpenApiBundled = createApi(
      withSchemas({
        Node: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string" },
            name: { type: "string", default: "foo" },
            tel: { type: "number", default: 123456 },
            isNice: { type: "boolean", default: false },
            hobbies: { type: "string", enum: ["a", "b", "c"], default: "b" },
          },
        },
      }),
    );

    const { sourceFile } = await generateTsSources(openapi, `tmp/ts_vanilla/defaults.ts`, options());

    expect(sourceFile.getFullText()).toMatchInlineSnapshot(`
      "import { z } from 'ts_vanilla'
      import * as zc from './ts_vanilla-common.js'

      export namespace Schemas {
          export const Node = z.object({ id: z.string(), name: z.string().optional().default('foo'), tel: z.number().optional().default(123456), isNice: z.boolean().optional().default(false), hobbies: z.enum(['a', 'b', 'c']).or(z.string().transform((s) => \`unknown:\${s}\` as const)).optional().default('b') });

          export namespace Types {
              export type Node = z.infer<typeof Schemas.Node>;
          }

          export const Endpoints = {} as const
      }
      "
    `);
  });

  test("property name does not change when entity is referenced", async () => {
    const openapi: OpenApiBundled = createApi(
      withSchemas({
        Node: {
          type: "object",
          properties: {
            id: { type: "string" },
            refEntity: { $ref: "#/components/schemas/SomeEntity" },
            refEntity2: { $ref: "#/components/schemas/SomeEntity" },
          },
        },
        SomeEntity: {
          type: "object",
          properties: { name: { type: "string" } },
        },
      }),
    );

    const { sourceFile } = await generateTsSources(openapi, `tmp/ts_vanilla/circular.ts`, options());

    expect(sourceFile.getFullText().trim()).toMatchInlineSnapshot(`
      "import { z } from 'ts_vanilla'
      import * as zc from './ts_vanilla-common.js'

      export namespace Schemas {
          export const SomeEntity = z.object({ name: z.string().optional() });
          export const Node = z.object({ id: z.string().optional(), refEntity: SomeEntity.optional(), refEntity2: SomeEntity.optional() });

          export namespace Types {
              export type SomeEntity = z.infer<typeof Schemas.SomeEntity>;
              export type Node = z.infer<typeof Schemas.Node>;
          }

          export const Endpoints = {} as const
      }"
    `);
  });
  test("unions have discriminator property required and have at least two schemas", async () => {
    const openapi: OpenApiBundled = createApi(
      withSchemas({
        A: {
          title: "A",
          properties: {
            id: { type: "string" },
            type: { type: "string" },
          },
        },
        B: {
          title: "B",
          properties: {
            id: { type: "string" },
            type: { type: "string" },
          },
        },
        SingleUnion: {
          oneOf: [{ $ref: "#/components/schemas/A" }],
          discriminator: { propertyName: "type", mapping: { A_TYPE: "#/components/schemas/A" } },
        },
        Union: {
          oneOf: [{ $ref: "#/components/schemas/A" }],
          discriminator: { propertyName: "type", mapping: { A_TYPE: "#/components/schemas/A", AA_TYPE: "#/components/schemas/A" } },
        },
        MultiUnion: {
          oneOf: [{ $ref: "#/components/schemas/A" }, { $ref: "#/components/schemas/B" }],
          discriminator: { propertyName: "type", mapping: { A_TYPE: "#/components/schemas/A", B_TYPE: "#/components/schemas/B" } },
        },
      }),
    );
    const { sourceFile } = await generateTsSources(openapi, `tmp/ts_vanilla/circular.ts`, options());

    expect(sourceFile.getFullText().trim()).toMatchInlineSnapshot(`
      "import { z } from 'ts_vanilla'
      import * as zc from './ts_vanilla-common.js'
      import * as api from './api.js'

      export namespace Schemas {
          export const B = z.object({ id: z.string().optional(), type: z.literal('B_TYPE') });
          export const A = z.object({ id: z.string().optional(), type: z.enum(['A_TYPE', 'AA_TYPE']) });
          export const MultiUnion = zc.ts_vanillaUnionMatch.matcher("type", { 'A_TYPE': A, 'B_TYPE': B, onDefault: z.object({ type: z.string().transform((s) => \`unknown:\${s}\` as const) }).passthrough() }) as z.ts_vanillaType<api.MultiUnion>;
          export const Union = zc.ts_vanillaUnionMatch.matcher("type", { 'A_TYPE': A, 'AA_TYPE': A, onDefault: z.object({ type: z.string().transform((s) => \`unknown:\${s}\` as const) }).passthrough() }) as z.ts_vanillaType<api.Union>;
          export const SingleUnion = zc.ts_vanillaUnionMatch.matcher("type", { 'A_TYPE': A, onDefault: z.object({ type: z.string().transform((s) => \`unknown:\${s}\` as const) }).passthrough() }) as z.ts_vanillaType<api.SingleUnion>;

          export namespace Types {
              export type B = z.infer<typeof Schemas.B>;
              export type A = z.infer<typeof Schemas.A>;
              export type MultiUnion = z.infer<typeof Schemas.MultiUnion>;
              export type Union = z.infer<typeof Schemas.Union>;
              export type SingleUnion = z.infer<typeof Schemas.SingleUnion>;
          }


          export namespace Unions {
              export const MultiUnion = z.union([A, B]);
          }

          export const Endpoints = {} as const
      }"
    `);
  });

  test("deeply nested circular schema", async () => {
    const openapi: OpenApiBundled = createApi(
      withSchemas({
        Node: {
          title: "Node",
          type: "object",
          properties: {
            id: { type: "string" },
            parent: { $ref: "#/components/schemas/Node" },
            children: { type: "array", items: { $ref: "#/components/schemas/Child" } },
          },
        },
        Child: {
          title: "Child",
          oneOf: [{ $ref: "#/components/schemas/A" }, { $ref: "#/components/schemas/B" }, { $ref: "#/components/schemas/Node" }],
          discriminator: {
            propertyName: "type",
            mapping: {
              A: "#/components/schemas/A",
              B: "#/components/schemas/B",
              Node: "#/components/schemas/Node",
            },
          },
        },
        Base: {
          type: "object",
          discriminator: { propertyName: "type" },
          properties: { type: { type: "string" } },
        },
        A: {
          allOf: [
            { $ref: "#/components/schemas/Base" },
            {
              title: "A",
              properties: {
                id: { type: "string" },
                parent: { $ref: "#/components/schemas/Node" },
                children: { type: "array", items: { $ref: "#/components/schemas/Node" } },
              },
            },
          ],
        },
        B: {
          title: "B",
          allOf: [
            { $ref: "#/components/schemas/Base" },
            {
              properties: {
                id: { type: "string" },
                parent: { $ref: "#/components/schemas/Node" },
                children: { type: "array", items: { $ref: "#/components/schemas/Node" } },
              },
            },
          ],
        },
      }),
    );
    const { sourceFile } = await generateTsSources(openapi, `tmp/ts_vanilla/circular.ts`, options());

    expect(sourceFile.getFullText().trim()).toMatchInlineSnapshot(`
      "export namespace Types {
          export type Base = { type: string | undefined };
          export type B = Types.Base & { id: string | undefined; parent: Types.Node | undefined; children: Array<Types.Node> | undefined; type: "B" };
          export type A = Types.Base & { id: string | undefined; parent: Types.Node | undefined; children: Array<Types.Node> | undefined; type: "A" };
          export type Child = Types.A | Types.B | Types.Node;
          export type Node = { id: string | undefined; parent: Types.Node | undefined; children: Array<Types.Child> | undefined };
          export type Child = Types.A | Types.B | Types.Node;
      }"
    `);
  });

  test("deeply nested multi circular schema", async () => {
    const openapi: OpenApiBundled = createApi(
      withSchemas({
        Node: {
          title: "Node",
          type: "object",
          properties: {
            id: { type: "string" },
            parent: { $ref: "#/components/schemas/Node" },
            children: { type: "array", items: { $ref: "#/components/schemas/Child" } },
          },
        },
        Child: {
          title: "Child",
          oneOf: [{ $ref: "#/components/schemas/A" }, { $ref: "#/components/schemas/B" }, { $ref: "#/components/schemas/Node" }],
          discriminator: {
            propertyName: "type",
            mapping: {
              A: "#/components/schemas/A",
              B: "#/components/schemas/B",
              Node: "#/components/schemas/Node",
            },
          },
        },
        Base: {
          type: "object",
          discriminator: { propertyName: "type" },
          properties: { type: { type: "string" } },
        },
        A: {
          allOf: [
            { $ref: "#/components/schemas/Base" },
            {
              title: "A",
              properties: {
                parent: { $ref: "#/components/schemas/Child" },
                children: { type: "array", items: { $ref: "#/components/schemas/Node" } },
              },
            },
          ],
        },
        B: {
          title: "B",
          allOf: [
            { $ref: "#/components/schemas/Base" },
            {
              properties: {
                parent: { $ref: "#/components/schemas/Child" },
                children: { type: "array", items: { $ref: "#/components/schemas/Node" } },
              },
            },
          ],
        },
      }),
    );
    const { sourceFile } = await generateTsSources(openapi, `tmp/ts_vanilla/circular.ts`, options());

    expect(sourceFile.getFullText().trim()).toMatchInlineSnapshot(`
      "import { z } from 'ts_vanilla'
      import * as zc from './ts_vanilla-common.js'

      export namespace Schemas {
          export const Base = z.object({ type: z.string().optional() });
          export const B: z.ts_vanillaTypeAny = z.lazy(() => Base.merge(z.object({ parent: Child.optional(), children: z.lazy(() => z.array(Node)).optional(), type: z.literal('B') })));
          export const A: z.ts_vanillaTypeAny = z.lazy(() => Base.merge(z.object({ parent: Child.optional(), children: z.lazy(() => z.array(Node)).optional(), type: z.literal('A') })));
          export const Child: z.ts_vanillaTypeAny = z.lazy(() => zc.ts_vanillaUnionMatch.matcher("type", { 'A': A, 'B': B, 'Node': Node, onDefault: z.object({ type: z.string().transform((s) => \`unknown:\${s}\` as const) }).passthrough() }));
          export const Node: z.ts_vanillaTypeAny = z.lazy(() => z.object({ id: z.string().optional(), parent: Node.optional(), children: z.lazy(() => z.array(Child)).optional() }));

          export namespace Types {
              export type Base = z.infer<typeof Schemas.Base>;
              export type B = z.infer<typeof Schemas.B>;
              export type A = z.infer<typeof Schemas.A>;
              export type Child = z.infer<typeof Schemas.Child>;
              export type Node = z.infer<typeof Schemas.Node>;
          }


          export namespace Unions {
              export const Child = z.lazy(() => z.union([A, B, Node]));
          }

          export const Endpoints = {} as const
      }"
    `);
  });

  test("deeply 3 deep nested multi circular schema", async () => {
    const openapi: OpenApiBundled = createApi(
      withSchemas({
        Node: {
          title: "Node",
          type: "object",
          properties: {
            id: { type: "string" },
            parent: { $ref: "#/components/schemas/Node" },
            children: { type: "array", items: { $ref: "#/components/schemas/Child" } },
          },
        },
        Child: {
          title: "Child",
          oneOf: [{ $ref: "#/components/schemas/A" }, { $ref: "#/components/schemas/B" }],
          discriminator: {
            propertyName: "type",
            mapping: {
              A: "#/components/schemas/A",
              B: "#/components/schemas/B",
            },
          },
        },
        Base: {
          type: "object",
          discriminator: { propertyName: "type" },
          properties: { type: { type: "string" } },
        },
        A: {
          allOf: [
            { $ref: "#/components/schemas/Base" },
            {
              title: "A",
              properties: {
                children: { type: "array", items: { $ref: "#/components/schemas/Rec" } },
              },
            },
          ],
        },
        B: {
          title: "B",
          allOf: [
            { $ref: "#/components/schemas/Base" },
            {
              properties: {
                children: { type: "array", items: { $ref: "#/components/schemas/Rec" } },
              },
            },
          ],
        },
        Rec: {
          title: "Rec",
          properties: {
            a: { $ref: "#/components/schemas/A" },
            b: { $ref: "#/components/schemas/B" },
            child: { $ref: "#/components/schemas/Child" },
            node: { $ref: "#/components/schemas/Node" },
          },
        },
      }),
    );
    const { sourceFile } = await generateTsSources(openapi, `tmp/ts_vanilla/circular.ts`, options());

    expect(sourceFile.getFullText().trim()).toMatchInlineSnapshot(`
      "import { z } from 'ts_vanilla'
      import * as zc from './ts_vanilla-common.js'

      export namespace Schemas {
          export const Base = z.object({ type: z.string().optional() });
          export const B: z.ts_vanillaTypeAny = Base.merge(z.object({ children: z.lazy(() => z.array(Rec)).optional(), type: z.literal('B') }));
          export const Rec: z.ts_vanillaTypeAny = z.lazy(() => z.object({ a: A.optional(), b: B.optional(), child: Child.optional(), node: Node.optional() }));
          export const A: z.ts_vanillaTypeAny = z.lazy(() => Base.merge(z.object({ children: z.lazy(() => z.array(Rec)).optional(), type: z.literal('A') })));
          export const Child: z.ts_vanillaTypeAny = z.lazy(() => zc.ts_vanillaUnionMatch.matcher("type", { 'A': A, 'B': B, onDefault: z.object({ type: z.string().transform((s) => \`unknown:\${s}\` as const) }).passthrough() }));
          export const Node: z.ts_vanillaTypeAny = z.lazy(() => z.object({ id: z.string().optional(), parent: Node.optional(), children: z.lazy(() => z.array(Child)).optional() }));

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
      }"
    `);
  });
});
