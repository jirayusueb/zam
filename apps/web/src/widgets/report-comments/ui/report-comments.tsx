import { useQuery } from "@tanstack/react-query";
import type { CommentView } from "@zam/capture/application/ports/comment-read-model";
import { Avatar, AvatarFallback, AvatarImage } from "@zam/ui/components/avatar";
import { Button } from "@zam/ui/components/button";
import { Skeleton } from "@zam/ui/components/skeleton";
import { useState } from "react";

import { CommentMarkdown, reportCommentsQuery } from "@/entities/comment";
import { CommentComposer } from "@/features/post-comment";
import { GoogleSignInButton } from "@/features/sign-in-with-google";
import { authClient } from "@/shared/api/auth-client";

interface Thread {
  root: CommentView;
  replies: CommentView[];
}

/** Input is oldest first, so roots and replies stay chronological. */
const groupThreads = (comments: CommentView[]): Thread[] => {
  const threads = new Map<string, Thread>();
  for (const comment of comments) {
    if (comment.parentId === null) {
      threads.set(comment.id, { replies: [], root: comment });
    } else {
      threads.get(comment.parentId)?.replies.push(comment);
    }
  }
  return [...threads.values()];
};

const CommentItem = ({ comment }: { comment: CommentView }) => (
  <article className="flex gap-3">
    <Avatar className="size-7 shrink-0">
      {comment.author.image ? (
        <AvatarImage alt="" src={comment.author.image} />
      ) : null}
      <AvatarFallback>
        {comment.author.name.slice(0, 1).toUpperCase()}
      </AvatarFallback>
    </Avatar>
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <header className="flex flex-wrap items-baseline gap-x-2 text-sm">
        <span className="font-medium">{comment.author.name}</span>
        <time
          className="text-muted-foreground font-mono text-xs tabular-nums"
          dateTime={comment.createdAt.toISOString()}
        >
          {comment.createdAt.toLocaleString()}
        </time>
      </header>
      <CommentMarkdown body={comment.body} />
    </div>
  </article>
);

const CommentThread = ({
  reportId,
  thread,
}: {
  reportId: string;
  thread: Thread;
}) => {
  const [replying, setReplying] = useState(false);
  const closeReply = () => setReplying(false);

  return (
    <li className="flex flex-col gap-3">
      <CommentItem comment={thread.root} />
      <div className="ml-10 flex flex-col gap-3">
        {thread.replies.length > 0 ? (
          <ul className="flex flex-col gap-3 border-l pl-4">
            {thread.replies.map((reply) => (
              <li key={reply.id}>
                <CommentItem comment={reply} />
              </li>
            ))}
          </ul>
        ) : null}
        {replying ? (
          <CommentComposer
            autoFocus
            onCancel={closeReply}
            onPosted={closeReply}
            placeholder={`Reply to ${thread.root.author.name}`}
            replyToId={thread.root.id}
            reportId={reportId}
          />
        ) : (
          <Button
            className="self-start"
            onClick={() => setReplying(true)}
            size="sm"
            variant="ghost"
          >
            Reply
          </Button>
        )}
      </div>
    </li>
  );
};

const CommentList = ({ reportId }: { reportId: string }) => {
  const { data, isLoading } = useQuery(reportCommentsQuery(reportId));

  if (isLoading) {
    return <Skeleton className="h-24 w-full" />;
  }

  const threads = groupThreads(data ?? []);

  return (
    <>
      {threads.length > 0 ? (
        <ul className="flex flex-col gap-6">
          {threads.map((thread) => (
            <CommentThread
              key={thread.root.id}
              reportId={reportId}
              thread={thread}
            />
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground text-sm">No comments yet.</p>
      )}
      <CommentComposer placeholder="Add a comment" reportId={reportId} />
    </>
  );
};

export const ReportComments = ({ reportId }: { reportId: string }) => {
  const { data: session, isPending } = authClient.useSession();

  let content = <Skeleton className="h-24 w-full" />;
  if (!isPending && session) {
    content = <CommentList reportId={reportId} />;
  } else if (!isPending) {
    content = (
      <div className="flex flex-col items-start gap-3">
        <p className="text-muted-foreground text-sm">
          Sign in to read and join the discussion on this report.
        </p>
        <GoogleSignInButton callbackURL={`/r/${reportId}`} />
      </div>
    );
  }

  return (
    <section aria-labelledby="report-comments" className="flex flex-col gap-4">
      <h2 className="font-display text-headline" id="report-comments">
        Comments
      </h2>
      {content}
    </section>
  );
};
