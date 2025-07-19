import { _ } from "@dasaplan/ts-sdk";
import { KindToNodeMappings, SourceFile, StructureKind, SyntaxKind } from "ts-morph";
import { appLog } from "../../logger.js";

export function tsEnsureDiscriminatorValues(api: SourceFile) {
  const discriminatedUnions = findDiscriminatedUnions(api);
  const interfaces = api.getChildrenOfKind(SyntaxKind.InterfaceDeclaration);
  discriminatedUnions.forEach((findREsult, idx, array) => {
    recursivelyEnsureDiscriminatorValues(findREsult, interfaces, array);
  });
  return api;
}

function recursivelyEnsureDiscriminatorValues(
  currentFoundUnion: FindUnionResult,
  interfaces: KindToNodeMappings[SyntaxKind.InterfaceDeclaration][],
  allFoundUnions: FindUnionResult[],
) {
  const {
    discriminator,
    discriminator: { subTypes: _subTypes, mappingValues, propertyName },
    node,
  } = currentFoundUnion;

  _subTypes?.forEach((sub, idx) => {
    const unionName = node.getNameNode().getText();
    if (_.isNil(_subTypes) || _.isNil(mappingValues) || _subTypes.length !== mappingValues?.length) {
      throw `Error: Expected discriminated union ${unionName} to have mappings for all subtypes but found: subTypes: ${JSON.stringify(
        _subTypes,
      )}, mappings: ${JSON.stringify(mappingValues)}`;
    }
    const mappingValue = mappingValues[idx];
    const declaredSubType = interfaces.find((i) => i.getNameNode().getText() === sub);
    if (_.isNil(declaredSubType)) {
      const nestedSubTypeNames = allFoundUnions.find((n) => n.node.getNameNode().getText() === sub)?.discriminator.subTypes ?? [];
      if (nestedSubTypeNames.length > 0) {
        // we need to recurse and expect an 1:N mapping because all union elements need to have the same mappingValue
        return recursivelyEnsureDiscriminatorValues(
          {
            ...currentFoundUnion,
            discriminator: {
              // subTypes of the nested union
              subTypes: nestedSubTypeNames,
              // all nested unions must declare the parent discriminator
              propertyName,
              // all nested unions must have the same mappingValue
              mappingValues: nestedSubTypeNames.map(() => mappingValue) ?? [],
            },
          },
          interfaces,
          allFoundUnions,
        );
      }
    }
    // support nested oneOf.... if declaredSubType is again and again and again a union...
    if (_.isNil(mappingValue) || _.isNil(declaredSubType) || _.isNil(propertyName)) {
      throw `Error: Could not resolve discriminator mapping for union '${unionName}' and discriminatorProperty '${
        propertyName ?? "UNKNOWN"
      }' : ${JSON.stringify(mappingValue)}, discriminator: ${JSON.stringify(discriminator)}`;
    }
    const discriminatorProperty = declaredSubType.getProperty(propertyName);
    // ensure discriminatorProperty
    if (_.isNil(discriminatorProperty)) {
      declaredSubType.addProperty({
        name: propertyName!,
        kind: StructureKind.PropertySignature,
        type: mappingValue ? `'${mappingValue}'` : "string",
      });
      return;
    }
    const propertyValue = discriminatorProperty.getType();
    // ensure allowed discriminator on unsupported type - only literal or union types expected
    if (!propertyValue.isLiteral() && !propertyValue.isUnion()) {
      discriminatorProperty.setType(`'${mappingValue}'`);
      appLog.log.debug(`fixed missing discriminator value on subtype ${declaredSubType.getName()}.${propertyName} - setting it with ${mappingValue}`);
    }
    // make union if allowed value literal does not match it
    else if (propertyValue.isLiteral() && propertyValue.getLiteralValue() !== mappingValue) {
      discriminatorProperty.setType(`'${propertyValue.getLiteralValue()}' | '${mappingValue}'`);
      appLog.log.debug(
        `fixed missing discriminator value on subtype ${declaredSubType.getName()}.${propertyName} - extending ${propertyValue.getText()} with ${mappingValue}`,
      );
    }
    // add allowed discriminator to union value if not present
    else if (!propertyValue.getUnionTypes().some((u) => u.getLiteralValue() === mappingValue)) {
      const unions = propertyValue.getUnionTypes().map((u) => u.getText());
      unions.push(`'${mappingValue}'`);
      const newType = unions.join(" | ");
      discriminatorProperty.setType(newType);
      appLog.log.debug(`fixed missing discriminator value on subtype ${declaredSubType.getName()}.${propertyName} - extending %j with ${mappingValue}`, unions);
    }
    return;
  });
}

type FindUnionResult = ReturnType<typeof findDiscriminatedUnions>[number];
function findDiscriminatedUnions(api: SourceFile) {
  return api.getDescendantsOfKind(SyntaxKind.TypeAliasDeclaration).flatMap((n) => {
    const tags = n.getJsDocs().flatMap((d) => d.getTags());
    const isDiscriminatedUnion = tags.some((t) => t.getTagNameNode().getText() === "discriminatedUnion");
    if (!isDiscriminatedUnion) {
      return [];
    }
    const propertyName = tags.find((t) => t.getTagNameNode().getText() === "discriminatorProperty")?.getCommentText();
    const mappingValues = tags.find((t) => t.getTagNameNode().getText() === "discriminatorValues")?.getCommentText();
    const subTypes = tags.find((t) => t.getTagNameNode().getText() === "subTypes")?.getCommentText();
    return isDiscriminatedUnion
      ? [
          {
            node: n,
            discriminator: {
              propertyName,
              mappingValues: parseUnionFromJsDoc(mappingValues),
              subTypes: parseUnionFromJsDoc(subTypes),
            },
          },
        ]
      : [];
  });
}

function isDefined<T>(v: T | undefined): v is NonNullable<T> {
  return !_.isNil(v);
}

function parseUnionFromJsDoc(mappingValues: string | undefined) {
  return mappingValues?.split("|").filter(isDefined).map(_.trim);
}
