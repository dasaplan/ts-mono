BUG: when generating zod schemas for this, duplicated schemas will be generated
```yaml
    ChangeConstant:
      oneOf:
        - $ref: '#/components/schemas/ChangeConstantGlobal'
        - $ref: '#/components/schemas/ChangeConstantUser'
      discriminator:
        propertyName: event
        mapping:
          UPDATE_GOLD_PRICE: "#/components/schemas/ChangeConstantUser"
          GLOBAL_UPDATE_GOLD_PRICE: "#/components/schemas/ChangeConstantGlobal"
          UPDATE_SILVER_PRICE: "#/components/schemas/ChangeConstantUser"
          GLOBAL_UPDATE_SILVER_PRICE: "#/components/schemas/ChangeConstantGlobal"
```
```typescript
export const ChangeConstantUser = ChangeConstantBase.merge(z.object({ details: ConstantUpdateDetails, event: z.enum(['UPDATE_GOLD_PRICE', 'UPDATE_SILVER_PRICE']) }));
export const ChangeConstantGlobal = ChangeConstantBase.merge(z.object({ details: ConstantUpdateDetails, event: z.enum(['GLOBAL_UPDATE_GOLD_PRICE', 'GLOBAL_UPDATE_SILVER_PRICE']) }));
export const ChangeConstant = z.discriminatedUnion("event", [ChangeConstantUser, ChangeConstantGlobal, ChangeConstantUser, ChangeConstantGlobal]);
```
----
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
