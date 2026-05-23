import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info" | "ghost";
  className?: string;
}

const variants = {
  default: "bg-slate-700 text-slate-200 border-slate-600",
  success: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  warning: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
  danger: "bg-red-500/20 text-red-300 border-red-500/40",
  info: "bg-blue-500/20 text-blue-300 border-blue-500/40",
  ghost: "bg-transparent text-slate-400 border-slate-700",
};

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
