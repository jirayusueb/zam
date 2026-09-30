import { EditorContent, useEditor } from "@tiptap/react";

import { MARKDOWN_EXTENSIONS } from "@/shared/lib/markdown-extensions";

/** Read-only render through the editor's schema: raw HTML in the source is dropped, not injected. */
export const CommentMarkdown = ({ body }: { body: string }) => {
  const editor = useEditor(
    {
      content: body,
      contentType: "markdown",
      editable: false,
      extensions: MARKDOWN_EXTENSIONS,
      immediatelyRender: false,
    },
    [body]
  );

  return editor ? (
    <EditorContent className="comment-markdown" editor={editor} />
  ) : (
    <p className="text-sm whitespace-pre-wrap">{body}</p>
  );
};
