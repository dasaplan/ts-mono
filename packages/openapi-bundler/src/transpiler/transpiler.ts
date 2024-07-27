import { OpenApiBundled } from "../bundle.js";
import { Endpoint, TranspileEndpointCtx } from "./transpile-endpoint.js";
import { Schema } from "./transpile-schema.js";
import { TranspileContext } from "./transpile-context.js";
import { Toposort } from "./toposort/toposort.js";
import { _ } from "@dasaplan/ts-sdk";

export module Transpiler {
  export function of(bundled: OpenApiBundled) {
    const transpiler = TranspileContext.create(_.cloneDeep(bundled));
    const endpointTranspiler = TranspileEndpointCtx.create(transpiler);
    return {
      ctx: transpiler,
      endpoints() {
        return transpiler.endpoints.length > 0
          ? transpiler.endpoints
          : Endpoint.transpileAll(endpointTranspiler);
      },
      schemas() {
        return transpiler.schemas.size > 0
          ? Array.from(transpiler.schemas.values())
          : Schema.transpileAll(transpiler) ?? [];
      },
      schemasTopoSorted(): Array<Schema> {
        const schemas = this.schemas();
        return Toposort.sortSchemas(schemas);
      },
    };
  }
}
