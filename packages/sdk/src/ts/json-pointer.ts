export module JsonPointer {
  export function pathToJsonPath(pathSegments: Array<string>) {
    return pathSegments.map(encodeSegmentToJsonPath).join("/");
  }

  function encodeSegmentToJsonPath(segment: string): string {
    return segment.replace(/~/g, "~0").replace(/\//g, "~1");
  }
}
