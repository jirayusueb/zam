declare const valueObjectBrand: unique symbol;

/**
 * Immutable, identity-less value, only obtainable through its validating
 * factory. Equality is by value (`===` for branded primitives).
 */
export type ValueObject<T, Name extends string> = T & {
  readonly [valueObjectBrand]: Name;
};
