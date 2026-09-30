import { createFileRoute } from "@tanstack/react-router";

import { SharedReportPage } from "@/pages/shared-report";

const SharedReportRoute = () => {
  const { reportId } = Route.useParams();
  return <SharedReportPage reportId={reportId} />;
};

export const Route = createFileRoute("/r/$reportId")({
  component: SharedReportRoute,
});
