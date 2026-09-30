/** Composite nodes; leaf `kind`s must not reuse these names. */
type CompositeCriteria<Leaf extends { readonly kind: string }> =
  | { readonly kind: "and"; readonly all: readonly Criteria<Leaf>[] }
  | { readonly kind: "or"; readonly any: readonly Criteria<Leaf>[] }
  | { readonly kind: "not"; readonly criteria: Criteria<Leaf> };

/** Persistence-agnostic filter tree; adapters translate it (e.g. to SQL). */
export type Criteria<Leaf extends { readonly kind: string }> =
  | Leaf
  | CompositeCriteria<Leaf>;

/** Filter + ordering + paging a read model executes as one query. */
export interface QuerySpecification<
  Leaf extends { readonly kind: string },
  Order,
> {
  readonly where: Criteria<Leaf>;
  readonly orderBy: Order;
  readonly limit: number;
  readonly offset: number;
}

export const and = <Leaf extends { readonly kind: string }>(
  ...all: readonly Criteria<Leaf>[]
): Criteria<Leaf> => ({ all, kind: "and" });

export const or = <Leaf extends { readonly kind: string }>(
  ...any: readonly Criteria<Leaf>[]
): Criteria<Leaf> => ({ any, kind: "or" });

export const not = <Leaf extends { readonly kind: string }>(
  criteria: Criteria<Leaf>
): Criteria<Leaf> => ({ criteria, kind: "not" });

export interface CriteriaTranslator<Leaf, Out> {
  readonly leaf: (leaf: Leaf) => Out;
  readonly and: (parts: Out[]) => Out;
  readonly or: (parts: Out[]) => Out;
  readonly not: (part: Out) => Out;
}

const COMPOSITE_KINDS: ReadonlySet<string> = new Set(["and", "or", "not"]);

const isComposite = <Leaf extends { readonly kind: string }>(
  criteria: Criteria<Leaf>
): criteria is CompositeCriteria<Leaf> => COMPOSITE_KINDS.has(criteria.kind);

export const translateCriteria = <Leaf extends { readonly kind: string }, Out>(
  criteria: Criteria<Leaf>,
  translator: CriteriaTranslator<Leaf, Out>
): Out => {
  if (!isComposite(criteria)) {
    return translator.leaf(criteria);
  }
  switch (criteria.kind) {
    case "and": {
      return translator.and(
        criteria.all.map((part) => translateCriteria(part, translator))
      );
    }
    case "or": {
      return translator.or(
        criteria.any.map((part) => translateCriteria(part, translator))
      );
    }
    case "not": {
      return translator.not(translateCriteria(criteria.criteria, translator));
    }
    default: {
      throw new Error("unreachable criteria kind");
    }
  }
};
