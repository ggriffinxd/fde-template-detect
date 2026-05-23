"use client";
import { useState } from "react";
import { toast } from "sonner";
import {
  Upload,
  Globe,
  ShieldCheck,
  AlertCircle,
  KanbanSquare,
  TriangleAlert,
} from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileDropzone } from "./FileDropzone";
import { UrlInput } from "./UrlInput";
import { AnalysisProgress } from "./AnalysisProgress";
import { ResultHeader } from "./ResultHeader";
import { ScoreBreakdown } from "./ScoreBreakdown";
import { XPathResults } from "./XPathResults";
import { FindingsList } from "./FindingsList";
import { AllMatchesTable } from "./AllMatchesTable";
import { useVerification } from "@/hooks/useVerification";
import { trelloService } from "@/services/trello.service";
import { cn } from "@/lib/utils";

type Tab = "upload" | "url";

export function VerifyPanel() {
  const [tab, setTab] = useState<Tab>("upload");
  const [trelloLoading, setTrelloLoading] = useState(false);
  const [trelloUrl, setTrelloUrl] = useState<string | null>(null);

  const {
    uploadedFile,
    targetUrl,
    status,
    steps,
    progress,
    errorMessage,
    result,
    setUploadedFile,
    setTargetUrl,
    setSourceType,
    runVerification,
    reset,
  } = useVerification();

  const isRunning =
    status === "fetching" || status === "parsing" || status === "analyzing";
  const isDone = status === "complete";
  const isError = status === "error";

  const handleTabChange = (t: Tab) => {
    setTab(t);
    setSourceType(t === "upload" ? "upload" : "url");
    reset();
    setTrelloUrl(null);
  };

  const handleSendToTrello = async () => {
    if (!result?.topMatch) return;
    setTrelloLoading(true);
    try {
      const card = await trelloService.createVerificationCard({
        bankName: result.topMatch.template.name,
        probability: result.topMatch.overallScore,
        findings: result.topMatch.findings,
        similarityMetrics: result.topMatch.template.scoringWeights ?? {
          domStructure: result.topMatch.domResult.score,
          xpathValidation:
            result.topMatch.xpathResult.filter((r) => r.found).length > 0
              ? Math.round(
                  (result.topMatch.xpathResult.filter((r) => r.found).length /
                    result.topMatch.xpathResult.length) *
                    100,
                )
              : 0,
          urlSimilarity: result.topMatch.urlResult.score,
          semanticSimilarity: result.topMatch.semanticResult.score,
          visualSimilarity: result.topMatch.visualResult.score,
        },
        result: result.topMatch,
      });
      setTrelloUrl(card.url);
      toast.success("Trello card created");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create Trello card",
      );
    } finally {
      setTrelloLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Input panel */}
      {!isDone && (
        <Card>
          <CardHeader>
            <CardTitle>
              <span className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-400" />
                Analyze Page
              </span>
            </CardTitle>
          </CardHeader>

          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-lg bg-slate-900/50 border border-slate-700/50 mb-4 w-fit">
            {(
              [
                ["upload", Upload, "Upload File"],
                ["url", Globe, "From URL"],
              ] as const
            ).map(([id, Icon, label]) => (
              <button
                key={id}
                onClick={() => handleTabChange(id)}
                disabled={isRunning}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer",
                  tab === id
                    ? "bg-slate-700 text-slate-100 shadow-sm"
                    : "text-slate-400 hover:text-slate-200",
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          {tab === "upload" ? (
            <FileDropzone
              uploadedFile={uploadedFile}
              onFile={(f) => {
                setUploadedFile(f);
                setSourceType("upload");
              }}
              onClear={() => {
                setUploadedFile(null);
                reset();
              }}
            />
          ) : (
            <UrlInput
              value={targetUrl}
              onChange={(u) => {
                setTargetUrl(u);
                setSourceType("url");
              }}
              disabled={isRunning}
            />
          )}

          {/* Error */}
          {isError && errorMessage && (
            <div className="flex items-center gap-2 mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-xs text-red-300">{errorMessage}</p>
            </div>
          )}

          {/* CTA */}
          <div className="flex items-center gap-3 mt-4">
            <Button
              variant="primary"
              size="lg"
              className="flex-1"
              loading={isRunning}
              disabled={
                isRunning ||
                (tab === "upload" && !uploadedFile) ||
                (tab === "url" && !targetUrl)
              }
              onClick={runVerification}
            >
              <ShieldCheck className="w-4 h-4" />
              {isRunning ? "Analyzing..." : "Verify Bank Template"}
            </Button>
            {status !== "idle" && (
              <Button
                variant="ghost"
                size="lg"
                onClick={reset}
                disabled={isRunning}
              >
                Reset
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Progress */}
      {isRunning && (
        <Card>
          <CardHeader>
            <CardTitle>Analysis in Progress</CardTitle>
            <span className="text-xs text-slate-500">{progress}%</span>
          </CardHeader>
          <AnalysisProgress steps={steps} progress={progress} />
        </Card>
      )}

      {/* Results */}
      {isDone && result && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                reset();
                setTrelloUrl(null);
              }}
            >
              ← New Analysis
            </Button>

            {result.topMatch && (
              <div className="flex items-center gap-2">
                {trelloUrl ? (
                  <a
                    href={trelloUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-300 border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors"
                  >
                    <KanbanSquare className="w-3.5 h-3.5" />
                    View Trello Card
                  </a>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    loading={trelloLoading}
                    onClick={handleSendToTrello}
                    className="border border-blue-500/20 text-blue-400 hover:bg-blue-500/10"
                  >
                    <KanbanSquare className="w-3.5 h-3.5" />
                    Send to Trello
                  </Button>
                )}
              </div>
            )}
          </div>

          {result.warnings && result.warnings.length > 0 && (
            <div className="space-y-2">
              {result.warnings.map((w, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20"
                >
                  <TriangleAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-300">{w}</p>
                </div>
              ))}
            </div>
          )}

          {result.topMatch ? (
            <>
              <Card className="p-6">
                <ResultHeader match={result.topMatch} />
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ScoreBreakdown match={result.topMatch} />
                <XPathResults results={result.topMatch.xpathResult} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <FindingsList match={result.topMatch} />
                <AllMatchesTable matches={result.allMatches} />
              </div>
            </>
          ) : (
            <Card className="text-center py-10">
              <p className="text-slate-400">
                No templates available to compare against.
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Add templates in the Templates section.
              </p>
            </Card>
          )}

          <p className="text-xs text-slate-600 text-center">
            Analyzed in {result.processingTimeMs}ms · {result.allMatches.length}{" "}
            template(s) compared
            {result.topMatch?.visualResult.isMocked &&
              " · Visual analysis simulated"}
          </p>
        </div>
      )}
    </div>
  );
}
