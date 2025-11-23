export function createTsFnParam<const Name extends string, const Type extends string>(name: Name, type: Type) {
  return {
    toString: () => `${name}: ${type}` as const,
    name,
    type,
  };
}

export function createTsInterface<const Name extends string, const Type extends ReturnType<typeof createTypeObjectProperty>>(
  name: Name,
  ...props: Array<Type>
) {
  return {
    toString: () =>
      `export interface ${name}{
          ${props.map((p) => `${p.name}: ${p.type}` as const).join("\n")}
       }` as const,
    name,
    props,
  };
}

export function createTsExtendedInterface<
  const Name extends string,
  const Type extends ReturnType<typeof createTypeObjectProperty>,
  const Extension extends string = string,
>(name: Name, props: Array<Type>, opts: { extends: Extension }) {
  return {
    toString: () =>
      `export interface ${name} extends ${opts.extends}{
          ${props.map((p) => `${p.name}: ${p.type}` as const).join("\n")}
       }` as const,
    name,
    props,
  };
}

export function createTypeObjectProperty<const Name extends string, const Type extends string>(name: Name, type: Type) {
  return {
    toString: () => `${name}: ${type};` as const,
    name,
    type,
  };
}

export function createTsObjectProperty<const Name extends string, const Type extends string>(name: Name, type: Type) {
  return {
    toString: () => `${name}: ${type}` as const,
    name,
    type,
  };
}

export function createTsInlineObject<const Name extends string, const Type extends ReturnType<typeof createTsObjectProperty>[]>(name: Name, ...props: Type) {
  return {
    toString: () => `${name}: { ${props.join(",\n")} }` as const,
    name,
    props,
  };
}

export function createTsNestedInlineObject<
  const Name extends string,
  const Type extends ReturnType<typeof createTsObjectProperty | typeof createTsInlineObject>[],
>(name: Name, ...props: Type) {
  return {
    toString: () => `${name}: { ${props.map((p) => p.toString()).join(",\n")} }` as const,
    name,
    props,
  };
}

export function createTsConstObject<
  const Name extends string,
  const Type extends ReturnType<typeof createTsObjectProperty | typeof createTsNestedInlineObject>[],
>(name: Name, ...props: Type) {
  return {
    toString: () => `const ${name} = { ${props.map((p) => p.toString()).join(",")}};` as const,
    name,
    props,
  };
}

export function createImport<const Name extends string, const Type extends Array<string>>(from: Name, ...imports: Type) {
  return {
    toString: () => `import { ${imports.join(", ")} } from "${from}";` as const,
    from,
    imports: imports.reduce((acc, curr) => ({ ...acc, [curr]: curr }), {} as { [key in Type[number]]: key }),
  };
}
