/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextFunction, Request, Response } from "express";

/** helper utilities not for public use - may change frequently */
export namespace __exp_util {
  /**
   * Transforms optional properties into explicit undefined unions.
   * Example: {a?: string} → {a: string | undefined}
   */
  export type CompleteDeep<T> = T extends object ? { [K in keyof Required<T>]: CompleteDeep<T[K]> } : T;

  export function asCompleteDeep<T>(obj: T): CompleteDeep<T> {
    return obj as CompleteDeep<T>;
  }
}

/** Extend ResponseMap with common HTTP status codes that may not be in the API spec */
type ExtendedResponseMap<ResponseMap extends { [status: number]: object | unknown }> = ResponseMap & {
  500: object | unknown;
  400: object | unknown;
  201: object | unknown;
};

/** Extending status which may not be documented in the API spec, but they are very common and expected by all clients*/
export type WithCommonHttpStatus<T> = T | 500 | 400;
export type HttpErrorStatus<T> = T extends number ? (`${T}` extends `${4 | 5}${string}` ? T : never) : never;

export type ExpressHandler<Req extends Request = Request, Res extends Response = Response, Next extends NextFunction = NextFunction> = (
  req: Req,
  res: Res,
  next: Next,
) => unknown | void;

export type ControllerResult<ResponseMap extends { [status: number]: object | unknown } = { [status: number]: object }> = {
  headers?: Record<string, string | number | Array<string>>;
} & (
  | { [K in keyof ExtendedResponseMap<ResponseMap>]: { status: K; json: ExtendedResponseMap<ResponseMap>[K] } }[keyof ExtendedResponseMap<ResponseMap>]
  | { [K in keyof ExtendedResponseMap<ResponseMap>]: { status: HttpErrorStatus<K>; error: Error } }[HttpErrorStatus<keyof ExtendedResponseMap<ResponseMap>>]
  | { status: number; kind: "CUSTOM_SENDER"; sender: (res: Response, next: NextFunction) => void }
  | { status: 204 }
);

export type ControllerFn<
  ResponseMap extends { [status: number]: object } = { [status: number]: object },
  RequestBody = object,
  PathParams = object,
  QueryParams = object,
  Locals extends Record<string, any> = Record<string, any>,
> = (req: Request<PathParams, ResponseMap[number], RequestBody, QueryParams, Locals>) => Promise<ControllerResult<ResponseMap>> | ControllerResult<ResponseMap>;
