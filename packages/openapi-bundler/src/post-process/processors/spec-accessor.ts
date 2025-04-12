import { OpenApiBundled } from "../../bundle.js";
import { Resolver } from "../../resolver/index.js";
import { ApplicationError } from "@dasaplan/ts-sdk";

export namespace OpenapiApiDoc {
  type ApiDoc = OpenApiBundled;

  export function accessor(bundled: ApiDoc) {
    const resolver = Resolver.create(bundled);
    return {
      getSchemaByName: createGetSchemaByName(bundled, resolver),
      getSchemaByRef: createGetSchemaByRef(bundled, resolver),
      get schemas() {
        return Object.entries(bundled.components?.schemas ?? {}).map(([name, schema]) => ({ name, schema }));
      },
    };
  }

  function createGetSchemaByName(oa: ApiDoc, resolver: Resolver) {
    return (name: string) => {
      const schema = oa.components?.schemas?.[name];
      ApplicationError.assert(schema, `could not find schema.name in spec: ${name} `);
      return resolver.resolveRef(schema, { deleteRef: true });
    };
  }

  function createGetSchemaByRef(oa: ApiDoc, resolver: Resolver) {
    return (ref: string | { $ref: string }) => {
      const refObj = typeof ref === "string" ? { $ref: ref } : ref;
      const schema = resolver.resolveRef(refObj);
      ApplicationError.assert(schema, `could not find schema.$ref in spec`);
      return schema;
    };
  }
}
