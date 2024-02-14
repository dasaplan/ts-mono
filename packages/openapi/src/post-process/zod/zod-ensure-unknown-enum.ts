import { SourceFile, SyntaxKind } from "ts-morph";

export function zodEnsureUnknownEnumVariant(zodApi: SourceFile) {
  const enums = findEnums(zodApi);
  enums.forEach((p) => {
    p.replaceWithText(`${p.getText()}.or(UNKNOWN_SCHEMA)`);
  });
  return zodApi;
}

export function findEnums(api: SourceFile) {
  return api.getDescendantsOfKind(SyntaxKind.CallExpression).flatMap((n) => {
    // eslint-disable-next-line no-useless-escape
    const isEnumExpression = /\.enum\s*\([\[\]\s\w,_\-"']+\)\s*$/u.test(n.getText());
    if (!isEnumExpression) {
      return [];
    }
    return [n];
  });
}
