import { Avatar, AvatarFallback, AvatarImage } from "@zam/ui/components/avatar";

interface ViewerSummaryProps {
  user: { name: string; email: string; image?: string | null };
}

export const ViewerSummary = ({ user }: ViewerSummaryProps) => (
  <div
    className="flex items-center gap-2"
    title={`${user.name} · ${user.email}`}
  >
    <Avatar className="size-7">
      {user.image ? <AvatarImage src={user.image} alt={user.name} /> : null}
      <AvatarFallback>{user.name.slice(0, 1).toUpperCase()}</AvatarFallback>
    </Avatar>
    <span className="max-w-28 truncate text-xs font-medium">{user.name}</span>
  </div>
);
