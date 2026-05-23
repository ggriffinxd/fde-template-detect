"use client";
import { CheckCircle, AlertTriangle, XCircle, Info } from "lucide-react";
import { ScoreRing } from "@/components/ui/score-ring";
import { Badge } from "@/components/ui/badge";
import type { TemplateMatchResult } from "@/types";

interface ResultHeaderProps {
  match: TemplateMatchResult;
}

const confidenceConfig = {
  "very-high": { label: "Very High", variant: "success" as const, Icon: CheckCircle },
  "high":      { label: "High",      variant: "success" as const, Icon: CheckCircle },
  "medium":    { label: "Medium",    variant: "warning" as const, Icon: Info },
  "low":       { label: "Low",       variant: "warning" as const, Icon: AlertTriangle },
  "very-low":  { label: "Very Low",  variant: "danger"  as const, Icon: XCircle },
};

function scoreToHex(v: number): string {
  if (v >= 85) return "#10b981";
  if (v >= 70) return "#22c55e";
  if (v >= 50) return "#eab308";
  if (v >= 30) return "#f97316";
  return "#ef4444";
}

export function ResultHeader({ match }: ResultHeaderProps) {
  const conf = confidenceConfig[match.confidence];
  const { Icon } = conf;

  return (
    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
      <ScoreRing
        value={match.overallScore}
        size={148}
        strokeWidth={11}
        label="Match Probability"
      />

      <div className="flex-1 text-center sm:text-left space-y-3">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-widest font-medium mb-1">Top Match</p>
          <h2 className="text-xl font-bold text-slate-100">{match.template.name}</h2>
          {match.template.description && (
            <p className="text-sm text-slate-400 mt-1">{match.template.description}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
          <Badge variant={conf.variant}>
            <Icon className="w-3 h-3" />
            {conf.label} Confidence
          </Badge>
          {match.template.tags?.map((tag) => (
            <Badge key={tag} variant="ghost">{tag}</Badge>
          ))}
        </div>

        <p className="text-sm font-semibold text-slate-300">
          <span className="text-2xl font-bold" style={{ color: scoreToHex(match.overallScore) }}>
            {match.overallScore}%
          </span>{" "}
          probability this page belongs to{" "}
          <span className="text-white">{match.template.name}</span>
        </p>
      </div>
    </div>
  );
}
