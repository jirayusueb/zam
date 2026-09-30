import { Avatar, AvatarFallback, AvatarImage } from "@zam/ui/components/avatar";

interface ViewerSummaryProps {
  user: { name: string; email: string; image?: string | null };
}

export const ViewerSummary = ({ user }: ViewerSummaryProps) => (
  <div className="flex items-center gap-2">
    <Avatar>
      {user.image ? <AvatarImage src={user.image} alt={user.name} /> : null}
      <AvatarFallback>{user.name.slice(0, 1).toUpperCase()}</AvatarFallback>
    </Avatar>
    <div className="flex flex-col">
      <span className="text-sm font-medium">{user.name}</span>
      <span className="text-muted-foreground text-xs">{user.email}</span>
    </div>
  </div>
);
