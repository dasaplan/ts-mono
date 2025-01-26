/* eslint-disable @typescript-eslint/no-explicit-any,@typescript-eslint/no-unused-vars */
// noinspection JSUnusedLocalSymbols,JSVoidFunctionReturnValueUsed

import oafmt, {OpenAPISortOptions} from "openapi-format";
import {File, _, ApplicationError, Folder} from "@dasaplan/ts-sdk";
import {AnySchema, Parsed, resolveSchemas, resolveSpec} from "./resolve.js";
import * as path from "node:path";
import {createSpecProcessor} from "./post-process/index.js";
import {appLog} from "./logger.js";
import {PostProcessingOptions} from "./post-process/post-process.js";
import {oas30} from "openapi3-ts";
import {sortOpenapi} from "./post-process/sort-openapi.js";

export interface FormatterOptions extends PostProcessingOptions {
    outFolder: Folder;
    sortSpec?: boolean;
}

export async function formatSpec(filePath: File, options: FormatterOptions): Promise<{ outFile: string }> {
    const log = appLog.childLog(formatSpec);
    const resolved = await resolveSpec(filePath);
    const common = findCommonPath(resolved.map((r) => r.refFile));
    log.info(`formatting in: ${common === "" ? filePath.absolutePath : common}`);

    const {schemasProcessor, documentProcessor} = createSpecProcessor(options);
    for (const r of resolved) {
        const fileWithoutRoot = common === "" ? r.refFile : common;
        log.info(`start: formatting: ${fileWithoutRoot}`);
        const file = r.getFile();

        if ("openapi" in file) {
            log.debug(`start: formatting document`);
            const processed = documentProcessor(file);
            const customSorted = options.sortSpec ? await sortOpenapi(processed) : processed;
            r.updateFile(customSorted);
        }

        // format openapi schemas
        log.debug(`start: formatting schemas`);
        const schemas = resolveSchemas(file);
        schemasProcessor(schemas);
        r.updateFile(file);

        log.debug(`done formatting: ${fileWithoutRoot}`);
        exportSpec(r, common, options.outFolder);
    }
    return {outFile: options.outFolder.absolutePath};
}

function exportSpec(r: { refFile: string; schemas: Parsed[]; getFile: () => any }, common: string, outFolder: Folder) {
    const log = appLog.childLog(exportSpec);
    log.info("start exporting formatted files");
    const file = File.of(r.refFile);
    if (common === "") {
        file.writeYml(r.getFile());
        return;
    }
    const commonPath = path.resolve(common);
    let current = file.absolutePath.replace(commonPath, "");
    current = current.startsWith(path.sep) ? current.slice(1) : current;
    const c = Folder.resolve(outFolder.absolutePath).makeFile(current);
    c.writeYml(r.getFile());
    log.info(`done: exporting ${c.absolutePath}`);
}

function findCommonPath(filePaths: Array<string>) {
    if (filePaths.length === 1) {
        // if we only have one file, the common path is the parent where the file lives in
        return Folder.of(filePaths[0]).absolutePath;
    }
    let commonPath = "";
    const [first, ...rest] = filePaths;
    const segments = first.split("/");
    for (const segment of segments) {
        const next = commonPath === "" ? segment : `${commonPath}/${segment}`;
        const isCommon = rest.every((f) => f.startsWith(next));
        if (isCommon) {
            commonPath = next;
            continue;
        }
        break;
    }
    return commonPath;
}


