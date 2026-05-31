import { cn } from "@/lib/utils";

type TrendMode = "higher-is-better" | "lower-is-better";

interface MetricCardProps {
  label: string;
  value: string;
  sub: string;
  trendMode?: TrendMode;
  baseline?: number;
  current?: number;
  valueClassName?: string;
  className?: string;
}

export function MetricCard({
  label,
  value,
  sub,
  trendMode,
  baseline,
  current,
  valueClassName,
  className,
}: MetricCardProps) {
  const trend = (() => {
    if (baseline != null && current != null) {
      if (current === baseline) return undefined;
      return current > baseline ? "up" : "down";
    }
    if (trendMode != null && current != null && current !== 0) {
      return trendMode === "higher-is-better"
        ? current > 0
          ? "up"
          : "down"
        : current > 0
          ? "down"
          : "up";
    }
    return undefined;
  })();

  return (
    <div className={cn("bg-muted rounded-xl px-6 py-5", className)}>
      <p className="text-xs text-muted-foreground mb-2">{label}</p>
      <p
        className={cn(
          "text-[28px] font-medium leading-none mb-1.5",
          valueClassName ?? "text-foreground",
        )}
      >
        {value}
      </p>
      <p
        className={cn(
          "text-xs",
          trend === "up" && "text-emerald-600 dark:text-emerald-400",
          trend === "down" && "text-destructive",
          !trend && "text-muted-foreground",
        )}
      >
        {trend === "up" && "↑ "}
        {trend === "down" && "↓ "}
        {sub}
      </p>
    </div>
  );
}
