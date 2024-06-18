# Guideline for Writing OpenApi Specification
The ruleset should be applicable for the versions:
- https://spec.openapis.org/oas/v3.0.3 
- https://spec.openapis.org/oas/v3.1.0

The ruleset `MUST NOT` contradict the official rules.

### Inheritance and Polymorphism
* Inheritance and Polymorphism `MUST` be expressed individually with  `allOf` and `oneOf`
* Inheritance `MUST` be expressed with the keyword `allOf`
* Polymorphism `MUST` be expressed with the keyword `oneOf`

### Discriminator
* A `discriminator property` `MUST` be of `type` `string` and `MUST NOT` declare `enum`
* A `discriminator property` `MUST` be `required` for every sub schema `referenced in` a `oneOf` array
* A `discriminator property` `MAY` declare multiple `discriminator values` only if the sub schema is used multiple times with different `discriminator mapping keys`
* Every `discriminator value` (mapping key) `MUST` be a _possible_ and _expected_ value in a respective `payload`

### allOf, oneOf, anyOf
* Every schema declaring a `oneOf`, `anyOf` or `allOf` `SHOULD` not declare any other properties `EXCEPT` a `discriminator` object.
  * A schema declaring a `oneOf`/`anyOf` and further properties `MUST` only consider the `oneOf`/`anyOf` member while ignoring every other property.
  *  A schema declaring a `allOf` and further properties `MUST` consider all siblings to `allOf` as a `new element` of the `allOf` array.

#### allOf
* A schema declaring a `allOf` property `SHOULD NOT` declare `discriminator.mappings`
* Every schema declaring a `allOf` property `MUST ONLY` declare a `discriminator` if the schema is `referenced by` a sub schema of an `oneOf` array; 

#### oneOf
* Every schema declaring a `oneOf`  property `MUST` declare a `discriminator`
* Every schema declaring a `oneOf` property `MUST` declare explicit `discriminator.mappings` for every `sub schema` in the `oneOf` array
* A sub schema of an `oneOf` with `discriminator` `MUST` be a `RefObject` to a `schema component`

