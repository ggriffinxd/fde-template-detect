import { VerifyPanel } from "./components/VerifyPanel";
import { Shield, Cpu, Globe, BarChart2 } from "lucide-react";

export default function Home() {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-3 py-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue-500/20 bg-blue-500/5 text-xs text-blue-400 font-medium mb-2">
          <Shield className="w-3.5 h-3.5" />
          Bank Template Verifier
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 tracking-tight">
          Detect Bank Page Templates{" "}
          <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-400 to-cyan-400">
            with Confidence
          </span>
        </h1>
        <p className="text-slate-400 text-sm max-w-2xl mx-auto">
          Upload HTML/MHTML files or enter a URL to analyze DOM structure, XPath
          rules, URL patterns, and semantic content against registered bank
          templates.
        </p>
      </div>

      {/* Feature chips */}
      <div className="flex flex-wrap justify-center gap-2">
        {[
          { icon: Shield, label: "XPath Validation" },
          { icon: Cpu, label: "DOM Fingerprinting" },
          { icon: Globe, label: "URL Pattern Analysis" },
          { icon: BarChart2, label: "Weighted Scoring" },
        ].map(({ icon: Icon, label }) => (
          <span
            key={label}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs text-slate-400 border border-slate-700/60 bg-slate-800/40"
          >
            <Icon className="w-3 h-3 text-slate-500" />
            {label}
          </span>
        ))}
      </div>

      {/* Main panel */}
      <VerifyPanel />
    </div>
  );
}
