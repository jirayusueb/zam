import { createFileRoute } from "@tanstack/react-router";
import { serveBugReportVideo } from "@zam/api/http/bug-report-video";

import {
  buildCaptureUseCases,
  createAuth,
  getDb,
} from "@/shared/api/server/services";

export const Route = createFileRoute("/api/reports/$reportId/video")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const db = getDb();
        const auth = await createAuth(db);
        return await serveBugReportVideo(
          buildCaptureUseCases(db, auth),
          params.reportId,
          request
        );
      },
    },
  },
});
