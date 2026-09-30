import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@zam/ui/components/collapsible";
import { useState } from "react";

type ParsedJson = Record<string, unknown> | unknown[];

const tryParseJsonValue = (value: string): ParsedJson | undefined => {
  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
};

/** Pretty-prints a JSON object/array as a collapsible tree; anything else renders verbatim. */
export const JsonValue = ({ value }: { value: string }) => {
  const [expanded, setExpanded] = useState(false);
  const parsed = tryParseJsonValue(value);

  if (parsed === undefined) {
    return <pre className="break-all whitespace-pre-wrap">{value}</pre>;
  }

  const summary = Array.isArray(parsed)
    ? `Array(${parsed.length})`
    : `Object(${Object.keys(parsed).length})`;

  return (
    <Collapsible onOpenChange={setExpanded} open={expanded}>
      <CollapsibleTrigger className="text-muted-foreground hover:text-foreground font-mono text-xs">
        {expanded ? "▾" : "▸"} {summary}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <pre className="break-all whitespace-pre-wrap">
          {JSON.stringify(parsed, null, 2)}
        </pre>
      </CollapsibleContent>
    </Collapsible>
  );
};
