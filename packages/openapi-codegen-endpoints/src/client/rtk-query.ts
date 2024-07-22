import { generateApi } from "@rtk-query/codegen-openapi/src/generate.js";
import { File, Folder } from "@dasaplan/ts-sdk";

export async function generateRtkQuery(openapi: string, _params: { apiName: string }) {
  const out = Folder.of("out/rtk-query").makeFile("api.ts");
  const injectApi = await generateApi(File.of(openapi).absolutePath, {
    schemaFile: openapi,
    apiFile: out.absolutePath,
    apiImport: "test",
  });
  const emptyApi = emptyApiTemplate();
  const injectWithoutImport = injectApi.replace(/^\s*import.*$/m, "");
  const source = `
  ${emptyApi}
  ${injectWithoutImport}
  `.trim();
  return source;
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
