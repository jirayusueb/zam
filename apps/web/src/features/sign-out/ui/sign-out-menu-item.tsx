import { useNavigate } from "@tanstack/react-router";
import { DropdownMenuItem } from "@zam/ui/components/dropdown-menu";

import { authClient } from "@/shared/api/auth-client";

export const SignOutMenuItem = () => {
  const navigate = useNavigate();

  return (
    <DropdownMenuItem
      onClick={() => {
        authClient.signOut({
          fetchOptions: {
            onSuccess: () => {
              navigate({ to: "/" });
            },
          },
        });
      }}
      variant="destructive"
    >
      Sign out
    </DropdownMenuItem>
  );
};
