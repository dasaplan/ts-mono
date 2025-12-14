/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextFunction, Request, Response } from "express";

/** helper utilities not for public use - may change frequently */
export namespace __exp_util {
  export type Complete<obj> = obj extends undefined
    ? undefined
    : obj extends Array<infer E>
      ? Array<E extends object ? { [key in keyof obj]-?: obj[key] extends undefined ? obj[key] | undefined : obj[key] } : obj>
      : obj extends object
        ? { [key in keyof obj]-?: obj[key] extends undefined ? obj[key] | undefined : obj[key] }
        : obj;

  export type CompleteDeep<obj, Depth extends number = 20> = Depth extends 0
    ? obj
    : obj extends Array<infer E>
      ? Array<CompleteDeep<E, Prev<Depth>>>
      : obj extends object
        ? { [key in keyof obj]: CompleteDeep<obj[key], Prev<Depth>> }
        : Complete<obj>;

  type Prev<T extends number> = T extends 5 ? 4 : T extends 4 ? 3 : T extends 3 ? 2 : T extends 2 ? 1 : 0;

  export function asCompleteDeep<T>(obj: T): CompleteDeep<T> {
    return obj as CompleteDeep<T>;
  }
}

/** Extending status which may not be documented in the API spec, but they are very common and expected by all clients*/
export type WithCommonHttpStatus<T> = T extends number ? T & (500 | 400) : never;
export type HttpErrorStatus<T> = T extends number ? (`${T}` extends `${4 | 5}${string}` ? T : never) : never;

export type ExpressHandler<Req extends Request = Request, Res extends Response = Response, Next extends NextFunction = NextFunction> = (
  req: Req,
  res: Res,
  next: Next,
) => unknown | void;

export type ControllerResult<ResponseMap extends { [status: number]: object | unknown } = { [status: number]: object }> =
  | ({ headers?: Record<string, string | number | Array<string>> } & (
      | { [K in keyof ResponseMap]: { status: WithCommonHttpStatus<K>; json: ResponseMap[K] } }[keyof ResponseMap]
      | { [K in keyof ResponseMap]: { status: HttpErrorStatus<K>; error: Error } }[keyof ResponseMap]
      | { status: number; kind: "CUSTOM_SENDER"; sender: (res: Response, next: NextFunction) => void }
    ))
  | undefined;

export type ControllerFn<
  ResponseMap extends { [status: number]: object } = { [status: number]: object },
  RequestBody = object,
  PathParams = object,
  QueryParams = object,
  Locals extends Record<string, any> = Record<string, any>,
> = (req: Request<PathParams, ResponseMap[number], RequestBody, QueryParams, Locals>) => ControllerResult<ResponseMap> | Promise<ControllerResult<ResponseMap>>;
