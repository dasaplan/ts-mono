/* eslint-disable @typescript-eslint/no-unused-vars */
// noinspection JSUnusedLocalSymbols

import { ILogObj, Logger } from "tslog";

export module AppLogger {
  export const logLevels = {
    silly: 0,
    trace: 1,
    debug: 2,
    info: 3,
    warn: 4,
    error: 5,
    fatal: 6,
  } as const;

  export type LogLevel = keyof typeof logLevels;

  export function from(appLogger: ReturnType<typeof doCreate>) {
    return doCreate(appLogger.log);
  }

  export function create(name?: string) {
    const logger = doCreate(createDefaultLogger());
    if (name) {
      return logger.childLogger(name);
    }
    return logger;
  }

  function doCreate(_log: Logger<ILogObj>) {
    return {
      childLog(n: string | { name: string }) {
        return _log.getSubLogger({
          name: typeof n === "string" ? n : n.name,
        });
      },
      childLogger(n: string | { name: string }) {
        return doCreate(
          _log.getSubLogger({
            name: typeof n === "string" ? n : n.name,
          })
        );
      },
      setLogLevel(level: number | keyof typeof logLevels) {
        _log.settings.minLevel = parseLogLevel(level);
        return this;
      },
      get log() {
        return _log;
      },
    };
  }

  function parseLogLevel(level: number | LogLevel) {
    if (typeof level === "number") {
      return level;
    }
    return logLevels[level];
  }

  export function createDefaultLogger(): Logger<ILogObj> {
    return new Logger<ILogObj>({
      name: "dsp-openapi",
      minLevel: logLevels.info,
      type: "pretty",
      prettyLogTemplate: "{{yyyy}}.{{mm}}.{{dd}} {{hh}}:{{MM}}:{{ss}}:{{ms}}\t{{logLevelName}}\t[{{name}}]\t",
      // stylePrettyLogs: true,
    });
  }
}

function makePretty() {
  return {
    prettyLogTemplate: "{{yyyy}}.{{mm}}.{{dd}} {{hh}}:{{MM}}:{{ss}}:{{ms}}\t{{logLevelName}}\t[{{filePathWithLine}}{{name}}]\t",
    prettyErrorTemplate: "\n{{errorName}} {{errorMessage}}\nerror stack:\n{{errorStack}}",
    prettyErrorStackTemplate: "  • {{fileName}}\t{{method}}\n\t{{filePathWithLine}}",
    prettyErrorParentNamesSeparator: ":",
    prettyErrorLoggerNameDelimiter: "\t",
    stylePrettyLogs: true,
    prettyLogTimeZone: "UTC",
    prettyLogStyles: {
      logLevelName: {
        "*": ["bold", "black", "bgWhiteBright", "dim"],
        SILLY: ["bold", "white"],
        TRACE: ["bold", "whiteBright"],
        DEBUG: ["bold", "green"],
        INFO: ["bold", "blue"],
        WARN: ["bold", "yellow"],
        ERROR: ["bold", "red"],
        FATAL: ["bold", "redBright"],
      },
      dateIsoStr: "white",
      filePathWithLine: "white",
      name: ["white", "bold"],
      nameWithDelimiterPrefix: ["white", "bold"],
      nameWithDelimiterSuffix: ["white", "bold"],
      errorName: ["bold", "bgRedBright", "whiteBright"],
      fileName: ["yellow"],
    },
  };
}
