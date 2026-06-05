import { AVATAR_COLORS, type Debtor } from "@/lib/debtStore";
import { cn } from "@/lib/utils";

interface AvatarProps {
  debtor: Debtor;
  size?: "sm" | "md";
}

export function DebtorAvatar({ debtor, size = "sm" }: AvatarProps) {
  if (debtor.avatar) {
    return (
      <img
        src={debtor.avatar}
        alt={debtor.name}
        className={cn(
          "rounded-full object-cover shrink-0",
          size === "sm" ? "w-6 h-6" : "w-8 h-8"
        )}
      />
    );
  }
  const color = AVATAR_COLORS[debtor.colorIndex % AVATAR_COLORS.length];
  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center font-medium shrink-0",
        color.bg,
        color.text,
        size === "sm" ? "w-6 h-6 text-[11px]" : "w-8 h-8 text-xs",
      )}
    >
      {debtor.name[0]}
    </div>
  );
}