/** Reusable, composable business predicate over a candidate. */
export interface Specification<T> {
  readonly isSatisfiedBy: (candidate: T) => boolean;
}

export const and = <T>(
  ...specs: readonly Specification<T>[]
): Specification<T> => ({
  isSatisfiedBy: (candidate) =>
    specs.every((spec) => spec.isSatisfiedBy(candidate)),
});

export const or = <T>(
  ...specs: readonly Specification<T>[]
): Specification<T> => ({
  isSatisfiedBy: (candidate) =>
    specs.some((spec) => spec.isSatisfiedBy(candidate)),
});

export const not = <T>(spec: Specification<T>): Specification<T> => ({
  isSatisfiedBy: (candidate) => !spec.isSatisfiedBy(candidate),
});
