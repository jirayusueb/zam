import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Placeholder } from "@tiptap/extensions";
import { EditorContent, useEditor } from "@tiptap/react";
import { MAX_TITLE_LENGTH } from "@zam/capture/domain/value-objects/title";
import { Button } from "@zam/ui/components/button";
import { Pencil } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { sharedBugReportQuery } from "@/entities/bug-report";
import { CommentMarkdown } from "@/entities/comment";
import { orpc } from "@/shared/api/orpc";
import { MARKDOWN_EXTENSIONS } from "@/shared/lib/markdown-extensions";

/** Summary card body: editable title + markdown description for the reporter, read-only otherwise. */
export const EditReportSummary = ({
  canEdit,
  description,
  reportId,
  title,
}: {
  canEdit: boolean;
  description: string;
  reportId: string;
  title: string;
}) => {
  const queryClient = useQueryClient();
  const [titleDraft, setTitleDraft] = useState(title);
  const [editingDescription, setEditingDescription] = useState(false);

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: sharedBugReportQuery(reportId).queryKey,
    });

  const update = useMutation(
    orpc.bugReport.update.mutationOptions({
      onError: (error) => {
        toast.error(`Couldn't save: ${error.message}`);
      },
      onSuccess: async () => {
        await invalidate();
        setEditingDescription(false);
      },
    })
  );

  const editor = useEditor(
    {
      content: description,
      editorProps: { attributes: { class: "min-h-24 px-3 py-2 text-sm" } },
      extensions: [
        ...MARKDOWN_EXTENSIONS,
        Placeholder.configure({
          placeholder: "Add details for the engineer who picks this up…",
        }),
      ],
      immediatelyRender: false,
    },
    // Remounts with a fresh draft each time editing starts, so Cancel reverts cleanly.
    [editingDescription]
  );

  const onTitleBlur = () => {
    const next = titleDraft.trim();
    if (next && next !== title) {
      update.mutate({ reportId, title: next });
    } else {
      setTitleDraft(title);
    }
  };

  const saveDescription = () => {
    if (editor) {
      update.mutate({ description: editor.getMarkdown(), reportId });
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {canEdit ? (
        // A wrapping, auto-sized field: long titles must stay readable, like the read-only h1.
        <textarea
          aria-label="Report title"
          className="font-display text-headline hover:bg-muted/50 focus-visible:bg-muted/50 -mx-2 field-sizing-content resize-none rounded-lg bg-transparent px-2 py-1 break-words outline-none"
          maxLength={MAX_TITLE_LENGTH}
          onBlur={onTitleBlur}
          onChange={(event) => setTitleDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              event.currentTarget.blur();
            }
          }}
          rows={1}
          value={titleDraft}
        />
      ) : (
        <h1 className="font-display text-headline text-balance break-words">
          {title}
        </h1>
      )}
      {canEdit && editingDescription ? (
        <div className="flex flex-col gap-2">
          <div className="rounded-xl border">
            <EditorContent editor={editor} />
          </div>
          <div className="flex gap-2">
            <Button
              disabled={update.isPending}
              onClick={saveDescription}
              size="sm"
              type="button"
            >
              {update.isPending ? "Saving…" : "Save"}
            </Button>
            <Button
              onClick={() => setEditingDescription(false)}
              size="sm"
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="group relative">
          {description ? (
            <CommentMarkdown body={description} />
          ) : (
            <p className="text-muted-foreground text-sm italic">
              No description yet.
            </p>
          )}
          {canEdit ? (
            <Button
              aria-label="Edit description"
              className="absolute top-0 right-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
              onClick={() => setEditingDescription(true)}
              size="icon-xs"
              type="button"
              variant="ghost"
            >
              <Pencil aria-hidden className="size-3.5" />
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
};
