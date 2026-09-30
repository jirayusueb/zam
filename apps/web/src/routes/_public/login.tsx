import { createFileRoute } from "@tanstack/react-router";

import { LoginPage } from "@/pages/login";

const LoginRoute = () => {
  const { redirect } = Route.useSearch();
  return <LoginPage redirect={redirect} />;
};

export const Route = createFileRoute("/_public/login")({
  component: LoginRoute,
});
