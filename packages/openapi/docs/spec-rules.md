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
* A `discriminator property` `MUST` be of `type` `string` and `MUST` not declare `enum`
* A `discriminator property` `MUST` be `required` for every sub schema `referenced in` a `oneOf` array
* A `discriminator property` `MAY` declare multiple `discriminator values` only if the sub schema is used multiple times with different `discriminator mapping keys`
* Every `discriminator value` (mapping key) `MUST` be a possible and expected value in a respective `payload`

### allOf, oneOf, anyOf
* Every schema declaring a `oneOf`, `anyOf` or `allOf` `SHOULD` not have any sibling member `EXCEPT` a declared `discriminator`.
  * A schema declaring a `oneOf`/`anyOf` and further sibling members `MUST` only consider the `oneOf`/`anyOf` member and ignore everything else `EXCEPT` a declared `discriminator`.
  *  A schema declaring a `allOf` and sibling members `MUST` consider all siblings to `allOf` as a `new element` `EXCEPT` a declared `discriminator`.
#### allOf
* A schema declaring a `allOf` member `SHOULD NOT` declare `discriminator.mappings`
* Every schema declaring a `allOf` member `MUST ONLY` declare a `discriminator` if the schema is `referenced by` a sub schema of an `oneOf` array; 

#### oneOf
* Every schema declaring a `oneOf`  member `MUST` declare a `discriminator`
* Every schema declaring a `oneOf` member `MUST` declare explicit `discriminator.mappings` for every `sub schema` in the `oneOf` array
* A sub schema of an `oneOf` with `discriminator` `MUST` be a `RefObject` to a `schema component`

