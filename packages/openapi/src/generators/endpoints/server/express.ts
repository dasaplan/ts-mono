import { Express, RequestHandler } from "express";
import { Endpoint } from "../Endpoint.js";

export module EndpointsExpressJs {
  export function fromEndpoint<
    Res extends Endpoint.DeserializedResponsesObject,
    Req extends Endpoint.DeserializedRequestObject,
    Params extends Endpoint.Parameters,
    T extends Endpoint<Res, Req, Params>
  >(endpoint: T) {
    const pathParams = Object.keys(endpoint.parameters?.path ?? {});
    const expressPath = pathParams.reduce((acc, param) => acc.replaceAll(`{:${param}}`, `:${param}`), endpoint.path);
    return {
      register: (
        router: Express,
        ...handler: RequestHandler<
          Endpoint.Parameters["path"],
          Endpoint.DeserializedResponsesObject,
          Endpoint.DeserializedRequestObject,
          Endpoint.Parameters["query"]
        >[]
      ) => {
        const operation: Extract<keyof Express, "get" | "put" | "delete" | "post" | "patch"> = endpoint.operation;
        router[operation](expressPath, handler);
        return router;
      },
    };
  }
}
