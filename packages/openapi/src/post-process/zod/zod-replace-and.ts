import { SourceFile, SyntaxKind, PropertyAccessExpression, ts } from "ts-morph";

export function zodReplaceAnd(zodApi: SourceFile) {
  const mergeProperties = findMergeSignatureWithAnd(zodApi);
  mergeProperties.forEach((p) => {
    const identifier = p.getChildrenOfKind(SyntaxKind.Identifier).filter((id) => id.getText() === "and");
    identifier.forEach((id) => {
      id.replaceWithText("merge");
    });
  });
  return zodApi;
}

export function findMergeSignatureWithAnd(api: SourceFile):  PropertyAccessExpression<ts.PropertyAccessExpression>[] {
  return api.getDescendantsOfKind(SyntaxKind.VariableDeclaration).flatMap((n) => {
    const isMergeSignatureWithAnd = n.getText().includes(".and");
    if (!isMergeSignatureWithAnd) {
      return [];
    }
    return n.getDescendantsOfKind(SyntaxKind.PropertyAccessExpression).filter((f) => f.getName() === "and");
  });
}
