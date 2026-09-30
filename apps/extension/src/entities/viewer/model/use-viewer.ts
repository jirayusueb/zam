import { authClient } from "@/shared/api/auth-client";

export const useViewer = () => {
  const { data: session, isPending } = authClient.useSession();
  return { isPending, user: session?.user ?? null };
};
