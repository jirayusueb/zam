import { Markdown } from "@tiptap/markdown";
import { StarterKit } from "@tiptap/starter-kit";

/** One schema for writing and rendering comments, so markdown round-trips. */
export const MARKDOWN_EXTENSIONS = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    link: { openOnClick: false },
  }),
  Markdown,
];
