import { Express, RequestHandler } from "express";
import { EndpointDefinition } from "../EndpointDefinition.js";

export module EndpointsExpressJs {
  export function fromEndpoint<
    Res extends EndpointDefinition.DeserializedResponsesObject,
    Req extends EndpointDefinition.DeserializedRequestObject,
    Params extends EndpointDefinition.Parameters,
    T extends EndpointDefinition<Res, Req, Params>
  >(EndpointDefinition: T) {
    const pathParams = Object.keys(EndpointDefinition.parameters?.path ?? {});
    const expressPath = pathParams.reduce((acc, param) => acc.replaceAll(`{:${param}}`, `:${param}`), EndpointDefinition.path);
    return {
      register: (
        router: Express,
        ...handler: RequestHandler<
          EndpointDefinition.Parameters["path"],
          EndpointDefinition.DeserializedResponsesObject,
          EndpointDefinition.DeserializedRequestObject,
          EndpointDefinition.Parameters["query"]
        >[]
      ) => {
        const operation: Extract<keyof Express, "get" | "put" | "delete" | "post" | "patch"> = EndpointDefinition.operation;
        router[operation](expressPath, handler);
        return router;
      },
    };
  }
}
