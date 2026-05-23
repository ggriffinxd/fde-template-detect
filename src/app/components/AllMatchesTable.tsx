"use client";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Badge } from "@/components/ui/badge";
import type { TemplateMatchResult } from "@/types";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { List } from "lucide-react";
import { cn } from "@/lib/utils";

interface AllMatchesTableProps {
  matches: TemplateMatchResult[];
}

const confidenceBadge = (c: TemplateMatchResult["confidence"]) => {
  switch (c) {
    case "very-high": return <Badge variant="success">Very High</Badge>;
    case "high":      return <Badge variant="success">High</Badge>;
    case "medium":    return <Badge variant="warning">Medium</Badge>;
    case "low":       return <Badge variant="warning">Low</Badge>;
    default:          return <Badge variant="danger">Very Low</Badge>;
  }
};

export function AllMatchesTable({ matches }: AllMatchesTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span className="flex items-center gap-2">
            <List className="w-4 h-4 text-purple-400" />
            All Template Matches
          </span>
        </CardTitle>
        <span className="text-xs text-slate-500">{matches.length} templates compared</span>
      </CardHeader>
      <div className="space-y-3">
        {matches.map((match, idx) => (
          <div
            key={match.template.id}
            className={cn(
              "p-3 rounded-lg border",
              idx === 0
                ? "border-blue-500/30 bg-blue-500/5"
                : "border-slate-700/40 bg-slate-800/30",
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {idx === 0 && (
                  <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">
                    Top Match
                  </span>
                )}
                <span className="text-xs font-semibold text-slate-200">{match.template.name}</span>
              </div>
              <div className="flex items-center gap-2">
                {confidenceBadge(match.confidence)}
                <span className="text-xs font-bold text-slate-200">{match.overallScore}%</span>
              </div>
            </div>
            <ProgressBar value={match.overallScore} size="xs" />
          </div>
        ))}
      </div>
    </Card>
  );
}
