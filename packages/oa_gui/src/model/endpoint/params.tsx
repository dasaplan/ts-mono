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
