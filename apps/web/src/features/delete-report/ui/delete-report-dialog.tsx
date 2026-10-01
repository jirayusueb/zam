import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@zam/ui/components/alert-dialog";
import { Button } from "@zam/ui/components/button";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { orpc } from "@/shared/api/orpc";

/** Reporter-only delete: removes the report row (comments/activities cascade); the Drive video is untouched. */
export const DeleteReportDialog = ({ reportId }: { reportId: string }) => {
  const navigate = useNavigate();

  const deleteReport = useMutation(
    orpc.bugReport.delete.mutationOptions({
      onError: (error) => {
        toast.error(`Couldn't delete the report: ${error.message}`);
      },
      onSuccess: async () => {
        toast.success("Report deleted");
        await navigate({ to: "/dashboard" });
      },
    })
  );

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button size="sm" variant="outline">
            <Trash2 aria-hidden />
            Delete
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this bug report?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes the report, its comments and its activity
            history. The recording stays in your Google Drive — Zam only deletes
            its own record, never the video file.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={deleteReport.isPending}
            onClick={() => deleteReport.mutate({ reportId })}
          >
            {deleteReport.isPending ? "Deleting…" : "Delete report"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
