import { File } from "@dasaplan/ts-sdk";
import { Endpoint, OpenApiBundled, Schema, Transpiler } from "@dasaplan/openapi-bundler";
import { pascalCase } from "pascal-case";
import { Project, ScriptKind, ts } from "ts-morph";
import { _ } from "@dasaplan/ts-sdk";

export interface TsTypeGenOptions {
  typeNameSuffix: string;
}

/** Generate TypeScript types and export to filesystem */
export async function generateTsTypes(openapiSpec: OpenApiBundled, outFile: string, options?: TsTypeGenOptions) {
  const outFilePath = File.of(outFile).absolutePath;
  const { project } = await generateTsSources(openapiSpec, File.resolve(outFile).absolutePath, options);
  project.saveSync();
  return outFilePath;
}

/** Generate TypeScript types and export to filesystem and keep a handle to the sources */
export async function generateTsSources(parsed: OpenApiBundled, filePath: string, params?: TsTypeGenOptions) {
  const options: TsTypeGenOptions = {
    typeNameSuffix: "",
    ...(params ?? {}),
  };
  const transpiler = Transpiler.of(parsed);
  const schemas = transpiler.schemasTopoSorted();
  const endpoints = transpiler.endpoints();

  const { imports, typesModule } = generateTsTypesFromParseModel(schemas, endpoints, options);

  const source = [...imports, typesModule].join("\n");
  const sourceSchema = createTsMorphSrcFile(filePath, source);

  return sourceSchema;
}

export function generateEndpointTypesFromParseModel(endpoints: Array<Endpoint>, options: TsTypeGenOptions) {
  const operations = endpoints.map((e) => {
    const parameters = createParametersType(e.parameters, options);
    const responses = createResponsesType(e.responses, options);
    const request = createRequestType(e.requestBody, options);

    return `"${e.alias}": {
      path: "${e.path}",
      method: "${e.method}",
      params: ${parameters},
      responses: ${responses},
      request: ${request}
    }`;
  });
  return `export namespace Endpoints {
    ${operations.join(",\n")}
  }`;
}

export function generateTsTypesFromParseModel(schemas: Array<Schema>, endpoints: Array<Endpoint>, options: TsTypeGenOptions) {
  const components = schemas.filter((s) => s.component.kind === "COMPONENT");
  const imports: string[] = [];

  const typeDeclarations = components.map((c) => createTypeDeclaration(c, options));

  const typesModule = createModule("Types", typeDeclarations, options);

  return { imports, typesModule, typeDeclarations };
}

function createTypeDeclaration(c: Schema, options: TsTypeGenOptions) {
  const name = `${pascalCase(c.getName())}${options.typeNameSuffix}`;
  const value = processSchema(c, options);
  return `export type ${name} = ${value};`;
}

function createUnionType(c: Extract<Schema, { kind: "UNION" }>, options: TsTypeGenOptions) {
  const name = `${pascalCase(c.getName())}${options.typeNameSuffix}`;
  // remove discriminator to create normal unions
  // todo: remember, why we needed this hack
  const cloned = _.cloneDeep(c);
  delete cloned.discriminator;
  const value = processSchema(cloned, options);
  return `export type ${name} = ${value};`;
}

function createParametersType(parameters: Array<Endpoint.Parameter> | undefined, options: TsTypeGenOptions): string {
  if (!parameters) {
    return "undefined";
  }

  const header = parameters.filter((p) => p.type === "header");
  const path = parameters.filter((p) => p.type === "path");
  const query = parameters.filter((p) => p.type === "query");
  const cookie = parameters.filter((p) => p.type === "cookie");

  const headerType = `header: { ${header.map((p) => processParameter(p, options)).join("; ")} }`;
  const pathType = `path: { ${path.map((p) => processParameter(p, options)).join("; ")} }`;
  const queryType = `query: { ${query.map((p) => processParameter(p, options)).join("; ")} }`;
  const cookieType = `cookie: { ${cookie.map((p) => processParameter(p, options)).join("; ")} }`;

  return `{ ${[headerType, pathType, queryType, cookieType].filter((t) => !t.includes("{ }")).join("; ")} }`;
}

function createResponsesType(responses: Endpoint["responses"] | undefined, options: TsTypeGenOptions): string {
  if (!responses) {
    return "undefined";
  }
  const responseDeclarations = responses.map((r) => processResponse(r, options));
  return `{ ${responseDeclarations.join("; ")} }`;
}

function createRequestType(request: Endpoint["requestBody"] | undefined, options: TsTypeGenOptions): string {
  if (!request || !request.schema) {
    return "undefined";
  }
  return processSubSchema(request.schema, options);
}

function createModule(name: string, members: string[], options: TsTypeGenOptions) {
  return `
export namespace ${name} {
    ${members.join("\n")}
}
  `;
}

function processParameter(p: Endpoint.Parameter, options: TsTypeGenOptions): string {
  let type = processSchema(p.schema, options);
  if (!p.isRequired) {
    type += " | undefined";
  }
  return `${p.name}: ${type}`;
}

function processResponse(r: Endpoint["responses"][0], options: TsTypeGenOptions): string {
  if (!r.schema) {
    return `${r.status}: false`;
  }
  const schema = processSubSchema(r.schema, options);
  return `${r.status}: ${schema}`;
}

function processSubSchema(c: Schema | Schema.DiscriminatorProperty, options: TsTypeGenOptions): string {
  switch (c.component.kind) {
    case "INLINE":
      return processSchema(c, options);
    case "COMPONENT": {
      return createEntityRef(c, options);
    }
  }
}

function isCircular(c: Schema | Schema.DiscriminatorProperty) {
  if (c.isCircular) {
    return true;
  }
  switch (c.kind) {
    case "UNION":
      return c.schemas.some((s) => s.isCircular);
    case "OBJECT":
      return c.parent?.isCircular || c.properties.some((p) => p.propertyValue.isCircular);
    case "ARRAY":
      return c.items.isCircular;
    case "BOX":
    case "PRIMITIVE":
    case "ENUM":
    case "DISCRIMINATOR":
      return c.isCircular;
  }
}

function processSchema(c: Schema | Schema.DiscriminatorProperty, options: TsTypeGenOptions): string {
  return isCircular(c) ? withRecursive(() => processSchemaInternal(c, options)) : processSchemaInternal(c, options);
}

function processSchemaInternal(c: Schema | Schema.DiscriminatorProperty, options: TsTypeGenOptions): string {
  switch (c.kind) {
    case "UNION": {
      if (_.isDefined(c.discriminator)) {
        const subTypes = c.discriminator.mappings.map((d) => processSubSchema(d, options));
        return subTypes.join(" | ");
      }
      const subSchemas = c.schemas.map((s) => processSubSchema(s, options));
      return subSchemas.join(" | ");
    }
    case "OBJECT": {
      const properties = c.properties.map((property) => {
        const name = property.propertyName;
        const type = processSubSchema(property.propertyValue, options);
        const withOptional = property.required ? type : `${type} | undefined`;
        return `${name}: ${withOptional}`;
      });
      const parent = _.isDefined(c.parent) ? `${processSubSchema(c.parent, options)} & ` : "";
      return `${parent}{ ${properties.join("; ")} }`;
    }
    case "PRIMITIVE": {
      return createPrimitive(c);
    }
    case "ENUM": {
      return createEnum(c.enum);
    }
    case "ARRAY": {
      const item = processSubSchema(c.items, options);
      return `Array<${item}>`;
    }
    case "DISCRIMINATOR": {
      return createDiscriminator(c.enum);
    }
    case "BOX": {
      throw new Error("boxed schemas are not supported");
    }
  }
}

function createEntityRef(c: Schema | Schema.DiscriminatorProperty, options: TsTypeGenOptions) {
  return `Types.${pascalCase(c.getName())}${options.typeNameSuffix}`;
}

function createPrimitive(c: Schema.Primitive): string {
  switch (c.type) {
    case "integer":
      return "number";
    case "number":
      return "number";
    case "string":
      return "string";
    case "boolean":
      return "boolean";
  }
}

function createEnum(values: string[]): string {
  return values.map((v) => `"${v}"`).join(" | ");
}

function createDiscriminator(values: string[]): string {
  if (values.length === 0) {
    return "never";
  }
  if (values.length === 1) {
    return `"${values[0]}"`;
  }
  return values.map((v) => `"${v}"`).join(" | ");
}

function withRecursive(fn: () => string): string {
  return fn();
}

function createTsMorphSrcFile(tsFilePath: string, source: string, project: Project = new Project()) {
  const sourceFile = project.createSourceFile(tsFilePath, source, {
    overwrite: true,
    scriptKind: ScriptKind.TS,
  });
  sourceFile.formatText({
    indentSwitchCase: true,
    indentStyle: ts.IndentStyle.Smart,
    indentMultiLineObjectLiteralBeginningOnBlankLine: true,
  });
  sourceFile.saveSync();
  return { project, sourceFile: sourceFile };
}
