import clsx from "clsx";

type Status = "open" | "funded" | "disputed" | "completed" | "cancelled" | "unknown";

const STYLES: Record<Status, { dot: string; bg: string; text: string }> = {
  open: {
    dot: "bg-amber-400",
    bg: "bg-amber-50 ring-amber-200",
    text: "text-amber-800",
  },
  funded: {
    dot: "bg-blue-500",
    bg: "bg-blue-50 ring-blue-200",
    text: "text-blue-800",
  },
  disputed: {
    dot: "bg-red-500",
    bg: "bg-red-50 ring-red-200",
    text: "text-red-800",
  },
  completed: {
    dot: "bg-emerald-500",
    bg: "bg-emerald-50 ring-emerald-200",
    text: "text-emerald-800",
  },
  cancelled: {
    dot: "bg-zinc-400",
    bg: "bg-zinc-100 ring-zinc-200",
    text: "text-zinc-700",
  },
  unknown: {
    dot: "bg-zinc-300",
    bg: "bg-zinc-50 ring-zinc-200",
    text: "text-zinc-600",
  },
};

export function StatusBadge({
  status,
  size = "md",
}: {
  status: string;
  size?: "sm" | "md";
}) {
  const key = (status?.toLowerCase() as Status) ?? "unknown";
  const s = STYLES[key] ?? STYLES.unknown;
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full ring-1 ring-inset font-medium capitalize",
        s.bg,
        s.text,
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs"
      )}
    >
      <span className={clsx("h-1.5 w-1.5 rounded-full", s.dot)} />
      {key}
    </span>
  );
}
