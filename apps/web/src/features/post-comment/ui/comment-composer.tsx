import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Placeholder } from "@tiptap/extensions";
import { EditorContent, useEditor } from "@tiptap/react";
import { Button } from "@zam/ui/components/button";
import { toast } from "sonner";

import { orpc } from "@/shared/api/orpc";
import { MARKDOWN_EXTENSIONS } from "@/shared/lib/markdown-extensions";

interface CommentComposerProps {
  reportId: string;
  /** Comment being replied to; omit to start a new thread. */
  replyToId?: string;
  placeholder: string;
  autoFocus?: boolean;
  onPosted?: () => void;
  onCancel?: () => void;
}

export const CommentComposer = ({
  reportId,
  replyToId,
  placeholder,
  autoFocus = false,
  onPosted,
  onCancel,
}: CommentComposerProps) => {
  const queryClient = useQueryClient();

  const editor = useEditor({
    autofocus: autoFocus ? "end" : false,
    editorProps: {
      attributes: {
        "aria-label": placeholder,
        class: "min-h-20 px-3 py-2",
      },
      // Runs before StarterKit's Mod-Enter hard break.
      handleKeyDown: (view, event) => {
        if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
          view.dom.closest("form")?.requestSubmit();
          return true;
        }
        return false;
      },
    },
    extensions: [
      ...MARKDOWN_EXTENSIONS,
      Placeholder.configure({ placeholder }),
    ],
    immediatelyRender: false,
  });

  const post = useMutation(
    orpc.bugReport.postComment.mutationOptions({
      onError: (error) => {
        toast.error(`Couldn't post the comment: ${error.message}`);
      },
      onSuccess: async () => {
        editor?.commands.clearContent();
        await queryClient.invalidateQueries({
          queryKey: orpc.bugReport.listComments.key({ input: { reportId } }),
        });
        onPosted?.();
      },
    })
  );

  const submit = () => {
    if (!editor || editor.isEmpty || post.isPending) {
      return;
    }
    post.mutate({ body: editor.getMarkdown(), replyToId, reportId });
  };

  return (
    <form
      className="border-input focus-within:border-ring focus-within:ring-ring/50 rounded-lg border bg-transparent focus-within:ring-3"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <EditorContent className="comment-markdown" editor={editor} />
      <div className="flex items-center justify-between gap-2 border-t px-3 py-2">
        <span className="text-muted-foreground text-xs">
          Markdown supported · ⌘↵ to send
        </span>
        <div className="flex gap-2">
          {onCancel ? (
            <Button onClick={onCancel} size="sm" type="button" variant="ghost">
              Cancel
            </Button>
          ) : null}
          <Button disabled={post.isPending} size="sm" type="submit">
            {replyToId ? "Reply" : "Comment"}
          </Button>
        </div>
      </div>
    </form>
  );
};
