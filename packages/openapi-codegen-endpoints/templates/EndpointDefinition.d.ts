/**
 * Framework agnostic endpoint definition intended to be consumed more detailed workflow specific tooling
 * */
export interface EndpointDefinition<
  DeserializedResponse extends EndpointDefinition.DeserializedResponsesObject = string,
  DeserializedRequest extends EndpointDefinition.DeserializedRequestObject = undefined,
  Params extends EndpointDefinition.Parameters | undefined = undefined
> {
  path: EndpointDefinition.Path;
  /** operation id */
  name: string;
  operation: EndpointDefinition.Operation;
  parameters?: Params;
  response: EndpointDefinition.Response<DeserializedResponse>;
  request?: EndpointDefinition.Request<DeserializedRequest>;
}

export module EndpointDefinition {
  type PathSegment = `${string}`;

  type PathParam = `{:${string}}`;

  /** @example '/pets', '/pets/{:petId}' , '/pets/{:petId}/inner-resources' */
  export type Path = `/${PathSegment}` | `/${PathSegment}/${PathSegment | PathParam}`;

  type DtoTypes = object | string | number | undefined;

  export type DeserializedResponsesObject = { [status: number]: DtoTypes };

  export type Operation = "get" | "post" | "put" | "delete" | "patch";

  export type Parameters = {
    path: { [name: string]: DtoTypes };
    query: { [name: string]: DtoTypes };
    header: { [headerKey: string]: DtoTypes };
    cookie: { [cookieKey: string]: DtoTypes };
  };
  export type DeserializedRequestObject = DtoTypes;

  export interface Request<DeserializedRequest = DeserializedRequestObject> {
    /** meta information */
    format?: string;
    /** deserialize payload */
    payload: DeserializedRequest;
    /** transform dto to model object */
    transform?: <Model, Dto extends DeserializedRequest>(payload: Dto) => Model | undefined;
    deserialize?: (payload: string | number | undefined) => DeserializedRequest;
  }

  export type Response<DeserializedResponse = DeserializedResponsesObject> = {
    [status in keyof DeserializedResponse]: {
      /** meta information */
      format?: string;
      /** deserialize payload */
      payload: DeserializedResponse[status];
      /** transform model object to dto */
      transform?: <Model>(model: Model) => DeserializedResponse[status];
    };
  };
}
