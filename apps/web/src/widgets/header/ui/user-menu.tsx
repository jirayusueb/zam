import { Link } from "@tanstack/react-router";
import { Avatar, AvatarFallback, AvatarImage } from "@zam/ui/components/avatar";
import { Button, buttonVariants } from "@zam/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@zam/ui/components/dropdown-menu";
import { Skeleton } from "@zam/ui/components/skeleton";

import { SignOutMenuItem } from "@/features/sign-out";
import { authClient } from "@/shared/api/auth-client";

export const UserMenu = () => {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return <Skeleton className="h-8 w-20" />;
  }

  if (!session) {
    return (
      <Link className={buttonVariants({ size: "sm" })} to="/login">
        Sign in
      </Link>
    );
  }

  const { user } = session;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label={`Account menu for ${user.name}`}
            size="icon-sm"
            variant="ghost"
          />
        }
      >
        <Avatar className="size-7">
          {user.image ? <AvatarImage alt="" src={user.image} /> : null}
          <AvatarFallback>{user.name.slice(0, 1).toUpperCase()}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col gap-0.5">
            <span className="text-foreground text-sm font-medium">
              {user.name}
            </span>
            <span className="text-muted-foreground truncate text-xs">
              {user.email}
            </span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <SignOutMenuItem />
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
