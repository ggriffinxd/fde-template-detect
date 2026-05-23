"use client";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import type { TemplateMatchResult } from "@/types";
import { BarChart2 } from "lucide-react";

interface ScoreBreakdownProps {
  match: TemplateMatchResult;
}

export function ScoreBreakdown({ match }: ScoreBreakdownProps) {
  const xpathPassed = match.xpathResult.filter((r) => r.found).length;
  const metrics = [
    {
      label: "DOM Structure Similarity",
      value: match.domResult.score,
      detail: `${match.domResult.fingerprintMatches} fingerprint(s) matched`,
    },
    {
      label: "XPath Validation",
      value: match.xpathResult.length > 0
        ? Math.round((xpathPassed / match.xpathResult.length) * 100)
        : 0,
      detail: `${xpathPassed}/${match.xpathResult.length} rules passed`,
    },
    {
      label: "URL Pattern Similarity",
      value: match.urlResult.score,
      detail: match.urlResult.hostnameMatch
        ? "Hostname matched"
        : `Path match: ${match.urlResult.pathMatch}%`,
    },
    {
      label: "Semantic Similarity",
      value: match.semanticResult.score,
      detail: `${match.semanticResult.keywordMatches.length} keyword(s) matched`,
    },
    {
      label: "Visual Similarity",
      value: match.visualResult.score,
      detail: match.visualResult.isMocked ? "Simulated (backend pending)" : "Real comparison",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-blue-400" />
            Score Breakdown
          </span>
        </CardTitle>
        <span className="text-2xl font-bold text-white">{match.overallScore}%</span>
      </CardHeader>
      <div className="space-y-4">
        {metrics.map((m) => (
          <div key={m.label}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-slate-300">{m.label}</span>
              <span className="text-xs font-bold text-slate-200">{Math.round(m.value)}%</span>
            </div>
            <ProgressBar value={m.value} size="sm" />
            <p className="text-xs text-slate-500 mt-1">{m.detail}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
