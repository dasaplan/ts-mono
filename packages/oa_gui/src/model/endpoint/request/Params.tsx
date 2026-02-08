export interface OaQueryParamBase {
  key: string;
}

export interface OaHeaderBase {
  key: string;
}

export interface OaPathParamBase {
  name: string;
}

export interface OaHeader extends OaHeaderBase {
  operationId: string;
}

export interface OaPathParam extends OaPathParamBase {
  operationId: string;
}

export interface OaQueryParam extends OaQueryParamBase {
  operationId: string;
}

export function PathParam() {
  return <div className={"path-param"}></div>;
}

export function PathParamList() {
  return <div className={"path-param-list"}></div>;
}

export function RequestHeader() {
  return <div className={"request-header"}></div>;
}

export function RequestHeaderList() {
  return <div className={"request-header-list"}></div>;
}

export function QueryParam() {
  return <div className={"query-param"}></div>;
}
export function QueryParamList() {
  return <div className={"query-param-list"}></div>;
}
