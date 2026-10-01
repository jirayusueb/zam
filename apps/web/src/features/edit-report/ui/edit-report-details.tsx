import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ReportPriority,
  ReportStatus,
  Triage,
} from "@zam/capture/domain/value-objects/triage";
import {
  MAX_TAG_LENGTH,
  MAX_TAGS,
  REPORT_PRIORITIES,
  REPORT_STATUSES,
} from "@zam/capture/domain/value-objects/triage";
import { Badge } from "@zam/ui/components/badge";
import { Input } from "@zam/ui/components/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@zam/ui/components/native-select";
import { X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  PRIORITY_LABELS,
  reportParticipantsQuery,
  sharedBugReportQuery,
  STATUS_LABELS,
} from "@/entities/bug-report";
import { authClient } from "@/shared/api/auth-client";
import { orpc } from "@/shared/api/orpc";

/** Details card body: status/priority/assignee/tags, editable by the reporter, badges otherwise. */
export const EditReportDetails = ({
  canEdit,
  reportId,
  triage,
}: {
  canEdit: boolean;
  reportId: string;
  triage: Triage;
}) => {
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();
  const { data: participants } = useQuery({
    ...reportParticipantsQuery(reportId),
    enabled: Boolean(session),
  });
  const [tagDraft, setTagDraft] = useState("");

  const update = useMutation(
    orpc.bugReport.update.mutationOptions({
      onError: (error) => {
        toast.error(`Couldn't save: ${error.message}`);
      },
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: sharedBugReportQuery(reportId).queryKey,
        });
      },
    })
  );

  const assigneeName = (id: string | null) => {
    if (!id) {
      return "Unassigned";
    }
    return (
      participants?.find((participant) => participant.id === id)?.name ??
      "Unknown"
    );
  };

  const addTag = () => {
    const next = tagDraft.trim();
    if (!next || triage.tags.length >= MAX_TAGS) {
      return;
    }
    const alreadyTagged = triage.tags.some(
      (tag) => tag.toLowerCase() === next.toLowerCase()
    );
    setTagDraft("");
    if (alreadyTagged) {
      return;
    }
    update.mutate({
      reportId,
      tags: [...triage.tags, next.slice(0, MAX_TAG_LENGTH)],
    });
  };

  const removeTag = (tag: string) => {
    update.mutate({ reportId, tags: triage.tags.filter((t) => t !== tag) });
  };

  if (!canEdit) {
    return (
      <dl className="grid grid-cols-[5rem_1fr] gap-y-2 text-sm">
        <dt className="text-muted-foreground">Status</dt>
        <dd>
          <Badge variant="outline">{STATUS_LABELS[triage.status]}</Badge>
        </dd>
        <dt className="text-muted-foreground">Priority</dt>
        <dd>
          <Badge variant="outline">{PRIORITY_LABELS[triage.priority]}</Badge>
        </dd>
        <dt className="text-muted-foreground">Assignee</dt>
        <dd>{assigneeName(triage.assigneeId)}</dd>
        <dt className="text-muted-foreground">Tags</dt>
        <dd className="flex flex-wrap gap-1">
          {triage.tags.length > 0 ? (
            triage.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))
          ) : (
            <span className="text-muted-foreground italic">None</span>
          )}
        </dd>
      </dl>
    );
  }

  return (
    <div className="flex flex-col gap-3 text-sm">
      <label className="flex flex-col gap-1">
        <span className="text-muted-foreground text-xs">Status</span>
        <NativeSelect
          onChange={(event) =>
            update.mutate({
              reportId,
              status: event.target.value as ReportStatus,
            })
          }
          size="sm"
          value={triage.status}
        >
          {REPORT_STATUSES.map((status) => (
            <NativeSelectOption key={status} value={status}>
              {STATUS_LABELS[status]}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-muted-foreground text-xs">Priority</span>
        <NativeSelect
          onChange={(event) =>
            update.mutate({
              priority: event.target.value as ReportPriority,
              reportId,
            })
          }
          size="sm"
          value={triage.priority}
        >
          {REPORT_PRIORITIES.map((priority) => (
            <NativeSelectOption key={priority} value={priority}>
              {PRIORITY_LABELS[priority]}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-muted-foreground text-xs">Assignee</span>
        <NativeSelect
          onChange={(event) =>
            update.mutate({
              assigneeId: event.target.value || null,
              reportId,
            })
          }
          size="sm"
          value={triage.assigneeId ?? ""}
        >
          <NativeSelectOption value="">Unassigned</NativeSelectOption>
          {(participants ?? []).map((participant) => (
            <NativeSelectOption key={participant.id} value={participant.id}>
              {participant.name}
              {participant.isReporter ? " (reporter)" : ""}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </label>
      <div className="flex flex-col gap-1.5">
        <span className="text-muted-foreground text-xs">Tags</span>
        {triage.tags.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1">
            {triage.tags.map((tag) => (
              <Badge className="gap-1 pr-1" key={tag} variant="secondary">
                {tag}
                <button
                  aria-label={`Remove tag ${tag}`}
                  onClick={() => removeTag(tag)}
                  type="button"
                >
                  <X aria-hidden className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
        ) : null}
        {triage.tags.length < MAX_TAGS ? (
          <Input
            maxLength={MAX_TAG_LENGTH}
            onChange={(event) => setTagDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addTag();
              }
            }}
            placeholder="Add a tag, press Enter"
            value={tagDraft}
          />
        ) : null}
      </div>
    </div>
  );
};
