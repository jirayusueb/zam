import { useQuery } from "@tanstack/react-query";
import type { CommentView } from "@zam/capture/application/ports/comment-read-model";
import type { ReportActivityView } from "@zam/capture/application/ports/report-activity-read-model";
import type {
  ReportPriority,
  ReportStatus,
} from "@zam/capture/domain/value-objects/triage";
import { Avatar, AvatarFallback, AvatarImage } from "@zam/ui/components/avatar";
import { Button } from "@zam/ui/components/button";
import { Skeleton } from "@zam/ui/components/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@zam/ui/components/toggle-group";
import { useMemo, useState } from "react";

import {
  PRIORITY_LABELS,
  reportActivitiesQuery,
  reportParticipantsQuery,
  STATUS_LABELS,
} from "@/entities/bug-report";
import { CommentMarkdown, reportCommentsQuery } from "@/entities/comment";
import { CommentComposer } from "@/features/post-comment";
import { GoogleSignInButton } from "@/features/sign-in-with-google";
import { authClient } from "@/shared/api/auth-client";

type TimelineFilter = "all" | "comments" | "activity";

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

/** "changed status Open → Resolved" style summary; falls back to the raw value for unknown shapes. */
const activityLabel = (
  activity: ReportActivityView,
  participantName: (id: string) => string
): string => {
  const { from, to } = activity;
  switch (activity.kind) {
    case "created": {
      return "created this report";
    }
    case "published": {
      return "published this report";
    }
    case "title_changed": {
      return "changed the title";
    }
    case "description_changed": {
      return "updated the description";
    }
    case "status_changed": {
      return `changed status ${STATUS_LABELS[from as ReportStatus] ?? from} → ${STATUS_LABELS[to as ReportStatus] ?? to}`;
    }
    case "priority_changed": {
      return `changed priority ${PRIORITY_LABELS[from as ReportPriority] ?? from} → ${PRIORITY_LABELS[to as ReportPriority] ?? to}`;
    }
    case "assignee_changed": {
      return to
        ? `assigned this to ${participantName(to as string)}`
        : `unassigned ${participantName(from as string)}`;
    }
    case "tags_changed": {
      return "updated tags";
    }
    case "metadata_changed": {
      return "updated metadata";
    }
    default: {
      return "updated this report";
    }
  }
};

const ActivityItem = ({
  activity,
  participantName,
}: {
  activity: ReportActivityView;
  participantName: (id: string) => string;
}) => (
  <article className="flex gap-3">
    <Avatar className="size-7 shrink-0">
      {activity.actor.image ? (
        <AvatarImage alt="" src={activity.actor.image} />
      ) : null}
      <AvatarFallback>
        {activity.actor.name.slice(0, 1).toUpperCase()}
      </AvatarFallback>
    </Avatar>
    <div className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
      <p>
        <span className="font-medium">{activity.actor.name}</span>{" "}
        <span className="text-muted-foreground">
          {activityLabel(activity, participantName)}
        </span>
      </p>
      <time
        className="text-muted-foreground font-mono text-xs tabular-nums"
        dateTime={activity.createdAt.toISOString()}
      >
        {activity.createdAt.toLocaleString()}
      </time>
    </div>
  </article>
);

type TimelineItem =
  | { kind: "comment"; timestamp: number; thread: Thread }
  | { kind: "activity"; timestamp: number; activity: ReportActivityView };

const Timeline = ({ reportId }: { reportId: string }) => {
  const { data: comments, isLoading: commentsLoading } = useQuery(
    reportCommentsQuery(reportId)
  );
  const { data: activities, isLoading: activitiesLoading } = useQuery(
    reportActivitiesQuery(reportId)
  );
  const { data: participants } = useQuery(reportParticipantsQuery(reportId));
  const [filter, setFilter] = useState<TimelineFilter>("all");

  const participantName = (id: string) =>
    participants?.find((participant) => participant.id === id)?.name ??
    "someone";

  const threads = useMemo(() => groupThreads(comments ?? []), [comments]);

  const items = useMemo((): TimelineItem[] => {
    const commentItems: TimelineItem[] = threads.map((thread) => ({
      kind: "comment",
      thread,
      timestamp: thread.root.createdAt.getTime(),
    }));
    const activityItems: TimelineItem[] = (activities ?? []).map(
      (activity) => ({
        activity,
        kind: "activity",
        timestamp: activity.createdAt.getTime(),
      })
    );
    let merged: TimelineItem[];
    if (filter === "comments") {
      merged = commentItems;
    } else if (filter === "activity") {
      merged = activityItems;
    } else {
      merged = [...commentItems, ...activityItems];
    }
    return merged.toSorted((a, b) => a.timestamp - b.timestamp);
  }, [threads, activities, filter]);

  if (commentsLoading || activitiesLoading) {
    return <Skeleton className="h-24 w-full" />;
  }

  return (
    <>
      <ToggleGroup
        onValueChange={(next) => {
          const [value] = next;
          if (value) {
            setFilter(value as TimelineFilter);
          }
        }}
        value={[filter]}
      >
        <ToggleGroupItem value="all">All</ToggleGroupItem>
        <ToggleGroupItem value="comments">
          Comments ({threads.length})
        </ToggleGroupItem>
        <ToggleGroupItem value="activity">
          Activity ({activities?.length ?? 0})
        </ToggleGroupItem>
      </ToggleGroup>
      {items.length > 0 ? (
        <ul className="flex flex-col gap-6">
          {items.map((item) =>
            item.kind === "comment" ? (
              <CommentThread
                key={`comment-${item.thread.root.id}`}
                reportId={reportId}
                thread={item.thread}
              />
            ) : (
              <li key={`activity-${item.activity.id}`}>
                <ActivityItem
                  activity={item.activity}
                  participantName={participantName}
                />
              </li>
            )
          )}
        </ul>
      ) : (
        <p className="text-muted-foreground text-sm">Nothing here yet.</p>
      )}
      {filter === "activity" ? null : (
        <CommentComposer placeholder="Add a comment" reportId={reportId} />
      )}
    </>
  );
};

export const ReportComments = ({ reportId }: { reportId: string }) => {
  const { data: session, isPending } = authClient.useSession();

  let content = <Skeleton className="h-24 w-full" />;
  if (!isPending && session) {
    content = <Timeline reportId={reportId} />;
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
        Comments &amp; activity
      </h2>
      {content}
    </section>
  );
};
