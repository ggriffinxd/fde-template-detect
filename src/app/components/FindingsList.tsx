"use client";
import { CheckCircle, AlertTriangle, Info } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import type { TemplateMatchResult } from "@/types";

interface FindingsListProps {
  match: TemplateMatchResult;
}

export function FindingsList({ match }: FindingsListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span className="flex items-center gap-2">
            <Info className="w-4 h-4 text-cyan-400" />
            Analysis Findings
          </span>
        </CardTitle>
      </CardHeader>

      {match.findings.length > 0 && (
        <div className="space-y-1.5 mb-4">
          {match.findings.map((finding, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
              <span className="text-slate-300">{finding}</span>
            </div>
          ))}
        </div>
      )}

      {match.missingCritical.length > 0 && (
        <div className="space-y-1.5 pt-3 border-t border-slate-700">
          <p className="text-xs font-semibold text-red-400 mb-2">Missing Critical Elements</p>
          {match.missingCritical.map((item, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />
              <span className="text-slate-400">{item}</span>
            </div>
          ))}
        </div>
      )}

      {match.findings.length === 0 && match.missingCritical.length === 0 && (
        <p className="text-xs text-slate-500 text-center py-3">No specific findings recorded.</p>
      )}
    </Card>
  );
}
