"use client";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { XPathValidationResult } from "@/types";
import { cn } from "@/lib/utils";

interface XPathResultsProps {
  results: XPathValidationResult[];
}

export function XPathResults({ results }: XPathResultsProps) {
  const passed = results.filter((r) => r.found);
  const failed = results.filter((r) => !r.found);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span className="flex items-center gap-2">
            <span className="text-orange-400 font-mono text-xs">{"{/}"}</span>
            XPath Validation
          </span>
        </CardTitle>
        <div className="flex gap-2">
          <Badge variant="success">{passed.length} passed</Badge>
          <Badge variant={failed.some((r) => r.rule.required) ? "danger" : "warning"}>
            {failed.length} failed
          </Badge>
        </div>
      </CardHeader>
      <div className="space-y-2">
        {results.map((r) => (
          <div
            key={r.rule.id}
            className={cn(
              "flex items-start gap-3 p-2.5 rounded-lg text-xs border",
              r.found
                ? "bg-emerald-500/5 border-emerald-500/20"
                : r.rule.required
                  ? "bg-red-500/10 border-red-500/20"
                  : "bg-slate-800/50 border-slate-700/50",
            )}
          >
            <div className="mt-0.5 shrink-0">
              {r.found ? (
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              ) : r.rule.required ? (
                <AlertCircle className="w-3.5 h-3.5 text-red-400" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-slate-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn("font-medium", r.found ? "text-slate-200" : "text-slate-400")}>
                  {r.rule.name}
                </span>
                {r.rule.required && (
                  <Badge variant="info" className="text-[10px] py-0">required</Badge>
                )}
                <span className="text-slate-500">weight: {r.rule.weight}</span>
              </div>
              <code className="block mt-1 text-[10px] font-mono text-slate-500 truncate">
                {r.rule.value}
              </code>
              {r.found && r.nodeValue && (
                <p className="mt-1 text-slate-400 truncate">Found: &ldquo;{r.nodeValue}&rdquo;</p>
              )}
              {r.found && (
                <p className="text-slate-500">{r.matchCount} node(s) matched</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
