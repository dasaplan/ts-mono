import { oas30 } from "openapi3-ts";

export type OaComponent =
  | oas30.SchemaObject
  | oas30.ResponseObject
  | oas30.ParameterObject
  | oas30.ExampleObject
  | oas30.RequestBodyObject
  | oas30.HeaderObject
  | oas30.SecuritySchemeObject
  | oas30.CallbackObject
  | oas30.ISpecificationExtension;

export type SchemaObjectFormat =
  | "int32"
  | "int64"
  | "float"
  | "double"
  | "byte"
  | "binary"
  | "date"
  | "date-time"
  | "password"
  | (string & Record<never, never>);
