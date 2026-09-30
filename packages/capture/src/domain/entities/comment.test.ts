import { expect, it } from "bun:test";

import { unwrap } from "../../shared/result";
import { parseAuthorId } from "../value-objects/author-id";
import { parseCommentId } from "../value-objects/comment-id";
import { parseReportId } from "../value-objects/report-id";
import { postComment } from "./comment";

const reportA = unwrap(parseReportId("11111111-1111-1111-1111-111111111111"));
const reportB = unwrap(parseReportId("22222222-2222-2222-2222-222222222222"));
const authorId = unwrap(parseAuthorId("u1"));
const deps = (id: string) => ({
  id: unwrap(parseCommentId(id)),
  now: () => new Date(),
});

it("rejects a reply to a comment on another report", () => {
  const onA = unwrap(
    postComment(
      { authorId, body: "root", replyTo: null, reportId: reportA },
      deps("33333333-3333-3333-3333-333333333333")
    )
  );

  const result = postComment(
    { authorId, body: "reply", replyTo: onA, reportId: reportB },
    deps("44444444-4444-4444-4444-444444444444")
  );

  expect(result).toMatchObject({
    error: { code: "INVALID_COMMENT" },
    ok: false,
  });
});
