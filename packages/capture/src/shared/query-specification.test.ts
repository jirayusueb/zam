import { describe, expect, it } from "bun:test";

import { and, not, or, translateCriteria } from "./query-specification";
import type { Criteria } from "./query-specification";

type Leaf = { kind: "eq"; field: string } | { kind: "flag" };

const toText = (criteria: Criteria<Leaf>): string =>
  translateCriteria(criteria, {
    and: (parts) => `(${parts.join(" AND ")})`,
    leaf: (leaf) => (leaf.kind === "eq" ? `${leaf.field}=?` : "flag"),
    not: (part) => `NOT ${part}`,
    or: (parts) => `(${parts.join(" OR ")})`,
  });

describe("translateCriteria", () => {
  it("folds nested composites depth-first, preserving operand order", () => {
    const criteria = and<Leaf>(
      { field: "a", kind: "eq" },
      or<Leaf>(not<Leaf>({ kind: "flag" }), { field: "b", kind: "eq" })
    );
    expect(toText(criteria)).toBe("(a=? AND (NOT flag OR b=?))");
  });

  it("hands a bare leaf straight to the leaf translator", () => {
    expect(toText({ kind: "flag" })).toBe("flag");
  });
});
