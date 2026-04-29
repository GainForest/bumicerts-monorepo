import { format, formatDistanceToNow } from "date-fns";
import QuickTooltip from "@/components/ui/quick-tooltip";
import { UserChip } from "@/components/ui/user-chip";
import { cn } from "@/lib/utils";

interface TimelineFeedHeaderProps {
  actorDid?: string | null;
  actorName?: string | null;
  itemCount: number;
  noun: string;
  createdAt?: string | null;
  className?: string;
}

function formatRelative(createdAt?: string | null): string | null {
  if (!createdAt) {
    return null;
  }
  const parsed = new Date(createdAt);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return formatDistanceToNow(parsed, { addSuffix: true });
}

function formatExact(createdAt?: string | null): string | null {
  if (!createdAt) {
    return null;
  }
  const parsed = new Date(createdAt);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return format(parsed, "PPpp");
}

export function TimelineFeedHeader({
  actorDid,
  actorName,
  itemCount,
  noun,
  createdAt,
  className,
}: TimelineFeedHeaderProps) {
  const relativeTime = formatRelative(createdAt);
  const exactTime = formatExact(createdAt);

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-1 gap-y-1 text-sm leading-5",
        className,
      )}
    >
      {actorDid ? (
        <UserChip
          did={actorDid}
          avatarSize={24}
          showCopyButton="never"
          linkMode="none"
          className="rounded-md"
        />
      ) : (
        <span className="font-medium text-foreground">
          {actorName ?? "Organization"}
        </span>
      )}
      <span className="text-foreground/90">added</span>
      <span className="font-medium text-foreground lowercase">
        {itemCount} {noun}
      </span>
      {relativeTime && exactTime ? (
        <QuickTooltip content={exactTime} asChild>
          <span className="font-normal text-muted-foreground/95">
            {relativeTime}
          </span>
        </QuickTooltip>
      ) : (
        relativeTime && (
          <span className="text-xs text-muted-foreground/95">
            {relativeTime}
          </span>
        )
      )}
    </div>
  );
}
