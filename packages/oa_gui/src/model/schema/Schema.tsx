export interface OaSchemaBase {
  id: string;
}

export interface Schema extends OaSchemaBase {
  operationId: string;
}
