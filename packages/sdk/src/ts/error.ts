import { _ } from "./lodash-extended.js";

export class ApplicationError extends Error {
  public static readonly NAME = "ApplicationError";

  private constructor(message: string) {
    super(message);
    this.name = ApplicationError.NAME;
  }

  chainUnknown(error: unknown): ApplicationError {
    const parsed = parseError(error);
    switch (parsed.type) {
      case "ApplicationError":
      case "ERROR":
        return this.chain(parsed.error);
      case "UNKNOWN_ERROR":
        return this.chain(ApplicationError.from(parsed.error));
    }
  }

  chain(error: Error | ApplicationError): ApplicationError {
    return new ApplicationError(
      `${this.message}\n ::causedBy ${createOutMessageOfUnknownError(error)}`
    );
  }

  static create(message: string): ApplicationError {
    return new ApplicationError(message);
  }

  static from(error: unknown): ApplicationError {
    const parsed = parseError(error);
    switch (parsed.type) {
      case "ApplicationError":
        return parsed.error;
      case "ERROR":
        return ApplicationError.create(parsed.error.message);
      case "UNKNOWN_ERROR":
        return new ApplicationError(parsed.error);
    }
  }

  public toString(): string {
    return createOutMessage(this.name, this.message);
  }
}

function parseError(
  error: unknown
):
  | { type: typeof ApplicationError.NAME; error: ApplicationError }
  | { type: "ERROR"; error: Error }
  | { type: "UNKNOWN_ERROR"; error: string } {
  if (error instanceof ApplicationError) {
    return { type: ApplicationError.NAME, error: error };
  }

  if (error instanceof Error) {
    return { type: "ERROR", error: error };
  }
  // instanceOf did not work for AssertionError - still not sure why
  if (isLikelyError(error)) {
    return { type: "ERROR", error: error };
  }

  return { type: "UNKNOWN_ERROR", error: JSON.stringify(error) };
}

function isLikelyError(error: unknown): error is Error {
  const cast = error as Error;
  return (
    _.isDefined(cast) &&
    _.isDefined(cast.stack) &&
    _.isDefined(cast.message) &&
    typeof cast.stack === "string" &&
    typeof cast.message === "string"
  );
}

function createOutMessageOfUnknownError(error: Error | ApplicationError) {
  if (error instanceof ApplicationError) {
    return error.toString();
  }

  return createOutMessage(error.name, error.message);
}

function createOutMessage(name: string, message: string) {
  return `[${name}] ${message};`;
}
