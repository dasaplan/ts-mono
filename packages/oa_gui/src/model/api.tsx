import type { Endpoint } from "./endpoint/endpoint.js";

export interface OaApi {
  name: string;
  endpoints: Array<Endpoint>;
}
