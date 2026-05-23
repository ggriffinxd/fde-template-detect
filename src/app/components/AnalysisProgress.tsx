"use client";
import { CheckCircle, Circle, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AnalysisStep } from "@/types";
import { ProgressBar } from "@/components/ui/progress-bar";

interface AnalysisProgressProps {
  steps: AnalysisStep[];
  progress: number;
}

const stepIcon = (status: AnalysisStep["status"]) => {
  switch (status) {
    case "done":    return <CheckCircle className="w-4 h-4 text-emerald-400" />;
    case "running": return <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />;
    case "error":   return <AlertCircle className="w-4 h-4 text-red-400" />;
    default:        return <Circle className="w-4 h-4 text-slate-600" />;
  }
};

export function AnalysisProgress({ steps, progress }: AnalysisProgressProps) {
  return (
    <div className="space-y-4">
      <ProgressBar
        value={progress}
        size="md"
        fillClassName="bg-linear-to-r from-blue-500 to-cyan-400"
        animated={progress < 100}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {steps.map((step) => (
          <div
            key={step.id}
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors",
              step.status === "running" && "bg-blue-500/10 border border-blue-500/20",
              step.status === "done"    && "bg-emerald-500/5",
              step.status === "error"   && "bg-red-500/10 border border-red-500/20",
              step.status === "pending" && "opacity-50",
            )}
          >
            {stepIcon(step.status)}
            <span
              className={cn(
                "text-xs font-medium",
                step.status === "done"    ? "text-slate-400" :
                step.status === "running" ? "text-blue-300"  :
                step.status === "error"   ? "text-red-300"   : "text-slate-600",
              )}
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
