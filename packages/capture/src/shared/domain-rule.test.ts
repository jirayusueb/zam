import { describe, expect, it } from "bun:test";

import { checkRules } from "./domain-rule";

describe("checkRules", () => {
  it("fails with the first violated rule and never evaluates later ones", () => {
    const evaluated: string[] = [];
    const rule = (name: string, holds: boolean) => ({
      holds: () => {
        evaluated.push(name);
        return holds;
      },
      violation: () => new Error(name),
    });

    const result = checkRules(
      rule("a", true),
      rule("b", false),
      rule("c", false)
    );

    expect(result).toMatchObject({ error: { message: "b" }, ok: false });
    expect(evaluated).toEqual(["a", "b"]);
  });

  it("succeeds when every rule holds", () => {
    expect(checkRules({ holds: () => true, violation: () => 0 }).ok).toBe(true);
  });
});
