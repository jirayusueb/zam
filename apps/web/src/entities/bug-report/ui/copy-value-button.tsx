import { useClipboard } from "@shined/react-use";
import { Button } from "@zam/ui/components/button";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";

// useClipboard falls back to execCommand where the Clipboard API is missing; `copied` resets after 1.5s.
/** Icon-only button that copies `value`, e.g. next to an Info-tab row. */
export const CopyValueButton = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => {
  const { copied, copy } = useClipboard();

  const onCopy = async () => {
    try {
      await copy(value);
    } catch {
      toast.error(`Couldn't copy ${label.toLowerCase()}.`);
    }
  };

  return (
    <Button
      aria-label={`Copy ${label.toLowerCase()}`}
      className="shrink-0"
      onClick={onCopy}
      size="icon-xs"
      type="button"
      variant="ghost"
    >
      {copied ? (
        <Check aria-hidden className="size-3.5" />
      ) : (
        <Copy aria-hidden className="size-3.5" />
      )}
    </Button>
  );
};
