
BUG: when generating endpoints with a path param "productId" it is missing
FIX: 
  "global" paths.*.parameters must be merged with paths.*.(get|post|put|*).parameters
  global parameters can be overridden from concrete parameters for a method. 
```typescript
    export interface ChangeInventoryItem<Error extends EndpointDefinition.DtoTypes, ChangeItemRequest extends EndpointDefinition.DtoTypes> extends EndpointDefinition<
        { "404": Error },
        ChangeItemRequest,
        { "path": undefined, "query": undefined, "header": undefined, "cookie": undefined }
    > {
        name: "changeInventoryItem";
        operation: "post";
        path: "/inventory/{productId}"
    }
```
-- from the specification 3.0.3
```
parameters 	[Parameter Object | Reference Object] 	A list of parameters that are applicable for all the operations described under this path. These parameters can be overridden at the operation level, but cannot be removed there. The list MUST NOT include duplicated parameters. A unique parameter is defined by a combination of a name and location. The list can use the Reference Object to link to parameters that are defined at the OpenAPI Object’s components/parameters.
```
