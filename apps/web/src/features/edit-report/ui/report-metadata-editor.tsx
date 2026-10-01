import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ReportMetadata } from "@zam/capture/domain/value-objects/report-metadata";
import {
  MAX_METADATA_ENTRIES,
  MAX_METADATA_KEY_LENGTH,
  MAX_METADATA_VALUE_LENGTH,
} from "@zam/capture/domain/value-objects/report-metadata";
import { Button } from "@zam/ui/components/button";
import { Empty, EmptyDescription, EmptyTitle } from "@zam/ui/components/empty";
import { Input } from "@zam/ui/components/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@zam/ui/components/table";
import { Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { CopyValueButton, sharedBugReportQuery } from "@/entities/bug-report";
import { orpc } from "@/shared/api/orpc";

interface MetadataRow {
  id: string;
  key: string;
  value: string;
}

const rowsFromMetadata = (metadata: ReportMetadata): MetadataRow[] =>
  Object.entries(metadata).map(([key, value]) => ({
    id: crypto.randomUUID(),
    key,
    value,
  }));

const draftToMetadata = (rows: MetadataRow[]): Record<string, string> =>
  Object.fromEntries(
    rows
      .filter((row) => row.key.trim() !== "")
      .map((row) => [
        row.key.trim().slice(0, MAX_METADATA_KEY_LENGTH),
        row.value.slice(0, MAX_METADATA_VALUE_LENGTH),
      ])
  );

const SNIPPET = `window.zam.setMetadata({\n  userId: "123",\n  plan: "pro",\n});`;

const MetadataSnippet = () => (
  <>
    <EmptyDescription>
      Custom key/value context the page sets during capture. Call this from the
      page under test, before or during the recording:
    </EmptyDescription>
    <pre className="bg-muted mt-2 w-full max-w-md rounded-lg p-3 text-left font-mono text-xs break-all whitespace-pre-wrap">
      {SNIPPET}
    </pre>
  </>
);

/** MetaData tab: key/value table the reporter can edit, read-only table otherwise. */
export const ReportMetadataEditor = ({
  canEdit,
  metadata,
  reportId,
}: {
  canEdit: boolean;
  metadata: ReportMetadata;
  reportId: string;
}) => {
  const queryClient = useQueryClient();
  const [syncedMetadata, setSyncedMetadata] = useState(metadata);
  const [rows, setRows] = useState<MetadataRow[]>(() =>
    rowsFromMetadata(metadata)
  );
  if (metadata !== syncedMetadata) {
    setSyncedMetadata(metadata);
    setRows(rowsFromMetadata(metadata));
  }

  const save = useMutation(
    orpc.bugReport.update.mutationOptions({
      onError: (error) => {
        toast.error(`Couldn't save metadata: ${error.message}`);
      },
      onSuccess: async () => {
        toast.success("Metadata saved");
        await queryClient.invalidateQueries({
          queryKey: sharedBugReportQuery(reportId).queryKey,
        });
      },
    })
  );

  const dirty = useMemo(
    () => JSON.stringify(draftToMetadata(rows)) !== JSON.stringify(metadata),
    [rows, metadata]
  );

  const addRow = () => {
    setRows((previous) =>
      previous.length >= MAX_METADATA_ENTRIES
        ? previous
        : [...previous, { id: crypto.randomUUID(), key: "", value: "" }]
    );
  };
  const removeRow = (index: number) => {
    setRows((previous) => previous.filter((_, i) => i !== index));
  };
  const updateRow = (index: number, patch: Partial<MetadataRow>) => {
    setRows((previous) =>
      previous.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  };

  const onSave = () => {
    save.mutate({ metadata: draftToMetadata(rows), reportId });
  };

  if (rows.length === 0) {
    return (
      <Empty>
        <EmptyTitle>No metadata yet</EmptyTitle>
        <MetadataSnippet />
        {canEdit ? (
          <Button className="mt-3" onClick={addRow} size="sm" type="button">
            <Plus aria-hidden />
            Add metadata
          </Button>
        ) : null}
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-1">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Key</TableHead>
            <TableHead>Value</TableHead>
            {canEdit ? <TableHead className="w-10" /> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow key={row.id}>
              <TableCell className="font-mono text-xs">
                {canEdit ? (
                  <Input
                    maxLength={MAX_METADATA_KEY_LENGTH}
                    onChange={(event) =>
                      updateRow(index, { key: event.target.value })
                    }
                    value={row.key}
                  />
                ) : (
                  row.key
                )}
              </TableCell>
              <TableCell className="font-mono text-xs">
                <div className="flex items-center gap-1">
                  {canEdit ? (
                    <Input
                      maxLength={MAX_METADATA_VALUE_LENGTH}
                      onChange={(event) =>
                        updateRow(index, { value: event.target.value })
                      }
                      value={row.value}
                    />
                  ) : (
                    <span className="min-w-0 flex-1 truncate">{row.value}</span>
                  )}
                  <CopyValueButton
                    label={row.key || "value"}
                    value={row.value}
                  />
                </div>
              </TableCell>
              {canEdit ? (
                <TableCell>
                  <Button
                    aria-label={`Remove ${row.key || "row"}`}
                    onClick={() => removeRow(index)}
                    size="icon-xs"
                    type="button"
                    variant="ghost"
                  >
                    <Trash2 aria-hidden className="size-3.5" />
                  </Button>
                </TableCell>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {canEdit ? (
        <div className="flex items-center gap-2">
          <Button
            disabled={rows.length >= MAX_METADATA_ENTRIES}
            onClick={addRow}
            size="sm"
            type="button"
            variant="outline"
          >
            <Plus aria-hidden />
            Add row
          </Button>
          <Button
            disabled={!dirty || save.isPending}
            onClick={onSave}
            size="sm"
            type="button"
          >
            {save.isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      ) : null}
    </div>
  );
};
