import { bundleParseOpenapi, Endpoint, OpenApiBundled, Transpiler } from "@dasaplan/openapi-bundler";
import { EndpointInterfaceGeneratorOptions, generateEndpointInterface, toObjectMap } from "../endpoint-interfaces.js";
import { EndpointDefinitionGeneratorOptions } from "../endpoint-generator.js";
import { Folder } from "@dasaplan/ts-sdk";
import { createTsMorphSrcFileFromText } from "../ts-sources.js";
import { appLog } from "../logger.js";

export async function generateRtkQueryDsp(openapiSpec: string, params: EndpointDefinitionGeneratorOptions) {
  appLog.childLog(generateRtkQueryDsp).info(`start generate:`, openapiSpec);
  const bundled = await bundleParseOpenapi(openapiSpec, { mergeAllOf: true, ensureDiscriminatorValues: true });
  return await generateRtkQueryDspTextFromBundled(bundled, params);
}

export async function generateRtkQueryDspTextFromBundled(bundled: OpenApiBundled, options: EndpointDefinitionGeneratorOptions) {
  const sourceText = await generateRtkQueryDspText(Transpiler.of(bundled).endpoints(), options);
  const out = Folder.of(options.outDir).makeFile("rtkQuery.ts");
  // add export to index.ts
  const { project, sourceFile } = createTsMorphSrcFileFromText(out.absolutePath, sourceText);
  await project.save();
  return { outFile: out.absolutePath, sourceText: sourceFile.getText() };
}

export async function generateRtkQueryDspText(endpoints: Array<Endpoint>, options: EndpointInterfaceGeneratorOptions = {}) {
  const rtks = endpoints
    .map((e) => {
      const { path, name, parameters, operation, response, request } = generateEndpointInterface(e, options);
      const queryArg = "queryArg";
      const pathParams = parameters["path"] ?? {};
      const transformedPath = Object.keys(pathParams).reduce((acc, curr) => acc.replace(`{${curr}}`, `\${${queryArg}["${curr}"]}`), path);
      const url = `\`${transformedPath}\``;

      const method = `"${operation.toUpperCase()}"`;

      const queryArgs = toObjectMap({ ...pathParams, body: request });
      const okResponse = response?.[200];
      switch (operation) {
        case "get":
          return `
    ${name}: build.query<${okResponse}, ${queryArgs}>({
      query: ${queryArg} =>  ({ url: ${url} })
    })`;
        case "post":
          return `
    ${name}: build.mutation<${okResponse}, ${queryArgs}>({
      query: ${queryArg} =>  ({ url:  ${url} , method: ${method} ,  body: ${queryArg}?.body})
    })`;
        case "put":
        case "patch":
          return `
    ${name}: build.mutation<${okResponse}, ${queryArgs}>({
      query: ${queryArg} =>  ({ url:  ${url} , method: ${method} , body: ${queryArg}?.body})
    })`;
        case "delete":
          return `
    ${name}: build.mutation<${okResponse}, ${queryArgs}>({
      query: ${queryArg} =>  ({ url:  ${url} , method: ${method}})
    })`;
      }
      return "";
    })
    .map((e) => e.trim());

  const injected = `
  export const injectedRtkApi = api.injectEndpoints({
      endpoints: (build) => ({
            ${rtks.join(",\n")}
        }),
    overrideExisting: false,
  });
`;
  const maybeTypeImport =
    options.tsApiTypesModule?.kind === "IMPORT_AND_NAMESPACE"
      ? `import * as ${options.tsApiTypesModule.namespace} from '${options.tsApiTypesModule.moduleName}'`
      : "";
  return `
  ${maybeTypeImport}
  ${emptyApiTemplate()}
  ${injected}`.trim();
}

function emptyApiTemplate() {
  return `
// Or from '@reduxjs/toolkit/query' if not using the auto-generated hooks
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

// initialize an empty api service that we'll inject endpoints into later as needed
export const api = createApi({
  baseQuery: fetchBaseQuery({ baseUrl: '/' }),
  endpoints: () => ({}),
})
  `;
}
