import { cn } from "@zam/ui/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-muted animate-pulse rounded-lg", className)}
      {...props}
    />
  );
}

export { Skeleton };
