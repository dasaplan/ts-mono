import type { Schema } from "../schema.js";
import type { OaHeader, OaPathParam, OaQueryParam } from "./params.js";

export interface OaRequest {
  params: Array<OaPathParam>;
  query: Array<OaQueryParam>;
  headers: Array<OaHeader>;
  body: Schema;
}

export interface OaResponse {
  status: number;
  body: Schema;
}

export interface Endpoint {
  operationId: string;
  request: OaRequest | undefined;
  defaults: {
    response: OaResponse;
  };
  responses: Array<OaResponse>;
}
