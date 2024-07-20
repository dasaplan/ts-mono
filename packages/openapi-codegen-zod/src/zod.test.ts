import { BundleMock, bundleOpenapi, createSpecProcessor, OpenApiBundled } from "@dasaplan/openapi-bundler";
import { ZodGenOptions } from "./zod-schemas.js";
import { resolveSpecPath } from "openapi-example-specs";
import { generateZodSources } from "./zod-generator.js";
import { describe, test, expect } from "vitest";

const options: () => ZodGenOptions = () => ({
  includeTsTypes: false,
});
describe("generateZod", () => {
  const { withSchemas, createApi } = BundleMock.create();

  test.each([
    "pets-simple/pets-api.yml",
    "pets-modular/pets-api.yml",
    "pets-modular-complex/petstore-api.yml",
    "generic/api.yml",
    "pets-recursive/pets-api.yml",
  ])("generates %s", async (spec) => {
    const api = resolveSpecPath(spec);
    const { parsed } = await bundleOpenapi(api, {
      postProcessor: createSpecProcessor({
        mergeAllOf: true,
        ensureDiscriminatorValues: true,
      }),
    });
    const name = spec.replace(".yml", "");
    const { sourceFile } = await generateZodSources(parsed, `test/out/zod/${name}.ts`, options());

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
      })
    );

    const { sourceFile } = await generateZodSources(openapi, `test/out/zod/circular.ts`, options());

    expect(sourceFile.getFullText()).toMatchSnapshot("circular");
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
      })
    );

    const { sourceFile } = await generateZodSources(openapi, `test/out/zod/circular.ts`, options());

    expect(sourceFile.getFullText().trim()).toMatchInlineSnapshot(`
        "import { z } from 'zod'
        import * as zc from './zod-common.js'
        
        export module Schemas {
            export const SomeEntity = z.object({ name: z.string().optional() });
            export const Node = z.object({ id: z.string().optional(), refEntity: SomeEntity.optional(), refEntity2: SomeEntity.optional() });
        
            export module Types {
                export type SomeEntity = z.infer<typeof Schemas.SomeEntity>;
                export type Node = z.infer<typeof Schemas.Node>;
            }
        
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
      })
    );
    const { sourceFile } = await generateZodSources(openapi, `test/out/zod/circular.ts`, { includeTsTypes: true });

    expect(sourceFile.getFullText().trim()).toMatchInlineSnapshot(`
      "import { z } from 'zod'
      import * as zc from './zod-common.js'
      import * as api from './api.js'

      export module Schemas {
          export const B = z.object({ id: z.string().optional(), type: z.literal('B_TYPE') });
          export const A = z.object({ id: z.string().optional(), type: z.enum(['A_TYPE', 'AA_TYPE']) });
          export const MultiUnion = zc.ZodUnionMatch.matcher("type", { 'A_TYPE': A, 'B_TYPE': B, onDefault: z.object({ type: z.string().brand("UNKNOWN") }).passthrough() }) as z.ZodType<api.MultiUnion>;
          export const Union = zc.ZodUnionMatch.matcher("type", { 'A_TYPE': A, 'AA_TYPE': A, onDefault: z.object({ type: z.string().brand("UNKNOWN") }).passthrough() }) as z.ZodType<api.Union>;
          export const SingleUnion = zc.ZodUnionMatch.matcher("type", { 'A_TYPE': A, onDefault: z.object({ type: z.string().brand("UNKNOWN") }).passthrough() }) as z.ZodType<api.SingleUnion>;

          export module Types {
              export type B = z.infer<typeof Schemas.B>;
              export type A = z.infer<typeof Schemas.A>;
              export type MultiUnion = z.infer<typeof Schemas.MultiUnion>;
              export type Union = z.infer<typeof Schemas.Union>;
              export type SingleUnion = z.infer<typeof Schemas.SingleUnion>;
          }


          export module Unions {
              export const MultiUnion = z.union([A, B]);
          }

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
      })
    );
    const { sourceFile } = await generateZodSources(openapi, `test/out/zod/circular.ts`, options());

    expect(sourceFile.getFullText().trim()).toMatchInlineSnapshot(`
      "import { z } from 'zod'
      import * as zc from './zod-common.js'

      export module Schemas {
          export const Base = z.object({ type: z.string().optional() });
          export const B: z.ZodTypeAny = z.lazy(() => Base.merge(z.object({ id: z.string().optional(), parent: Node.optional(), children: z.lazy(() => z.array(Node)).optional(), type: z.literal('B') })));
          export const A: z.ZodTypeAny = z.lazy(() => Base.merge(z.object({ id: z.string().optional(), parent: Node.optional(), children: z.lazy(() => z.array(Node)).optional(), type: z.literal('A') })));
          export const Child: z.ZodTypeAny = z.lazy(() => zc.ZodUnionMatch.matcher("type", { 'A': A, 'B': B, 'Node': Node, onDefault: z.object({ type: z.string().brand("UNKNOWN") }).passthrough() }));
          export const Node: z.ZodTypeAny = z.lazy(() => z.object({ id: z.string().optional(), parent: Node.optional(), children: z.array(Child).optional() }));

          export module Types {
              export type Base = z.infer<typeof Schemas.Base>;
              export type B = z.infer<typeof Schemas.B>;
              export type A = z.infer<typeof Schemas.A>;
              export type Child = z.infer<typeof Schemas.Child>;
              export type Node = z.infer<typeof Schemas.Node>;
          }


          export module Unions {
              export const Child = z.lazy(() => z.union([A, B, Node]));
          }

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
      })
    );
    const { sourceFile } = await generateZodSources(openapi, `test/out/zod/circular.ts`, options());

    expect(sourceFile.getFullText().trim()).toMatchInlineSnapshot(`
      "import { z } from 'zod'
      import * as zc from './zod-common.js'

      export module Schemas {
          export const Base = z.object({ type: z.string().optional() });
          export const B: z.ZodTypeAny = z.lazy(() => Base.merge(z.object({ parent: Child.optional(), children: z.lazy(() => z.array(Node)).optional(), type: z.literal('B') })));
          export const A: z.ZodTypeAny = z.lazy(() => Base.merge(z.object({ parent: Child.optional(), children: z.lazy(() => z.array(Node)).optional(), type: z.literal('A') })));
          export const Child: z.ZodTypeAny = z.lazy(() => zc.ZodUnionMatch.matcher("type", { 'A': A, 'B': B, 'Node': Node, onDefault: z.object({ type: z.string().brand("UNKNOWN") }).passthrough() }));
          export const Node: z.ZodTypeAny = z.lazy(() => z.object({ id: z.string().optional(), parent: Node.optional(), children: z.lazy(() => z.array(Child)).optional() }));

          export module Types {
              export type Base = z.infer<typeof Schemas.Base>;
              export type B = z.infer<typeof Schemas.B>;
              export type A = z.infer<typeof Schemas.A>;
              export type Child = z.infer<typeof Schemas.Child>;
              export type Node = z.infer<typeof Schemas.Node>;
          }


          export module Unions {
              export const Child = z.lazy(() => z.union([A, B, Node]));
          }

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
      })
    );
    const { sourceFile } = await generateZodSources(openapi, `test/out/zod/circular.ts`, options());

    expect(sourceFile.getFullText().trim()).toMatchInlineSnapshot(`
      "import { z } from 'zod'
      import * as zc from './zod-common.js'

      export module Schemas {
          export const Base = z.object({ type: z.string().optional() });
          export const B: z.ZodTypeAny = Base.merge(z.object({ children: z.lazy(() => z.array(Rec)).optional(), type: z.literal('B') }));
          export const Rec: z.ZodTypeAny = z.lazy(() => z.object({ a: A.optional(), b: B.optional(), child: Child.optional(), node: Node.optional() }));
          export const A: z.ZodTypeAny = z.lazy(() => Base.merge(z.object({ children: z.lazy(() => z.array(Rec)).optional(), type: z.literal('A') })));
          export const Child: z.ZodTypeAny = z.lazy(() => zc.ZodUnionMatch.matcher("type", { 'A': A, 'B': B, onDefault: z.object({ type: z.string().brand("UNKNOWN") }).passthrough() }));
          export const Node: z.ZodTypeAny = z.lazy(() => z.object({ id: z.string().optional(), parent: Node.optional(), children: z.lazy(() => z.array(Child)).optional() }));

          export module Types {
              export type Base = z.infer<typeof Schemas.Base>;
              export type B = z.infer<typeof Schemas.B>;
              export type Rec = z.infer<typeof Schemas.Rec>;
              export type A = z.infer<typeof Schemas.A>;
              export type Child = z.infer<typeof Schemas.Child>;
              export type Node = z.infer<typeof Schemas.Node>;
          }


          export module Unions {
              export const Child = z.lazy(() => z.union([A, B]));
          }

      }"
    `);
  });
});
