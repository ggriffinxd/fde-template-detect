import { create } from "zustand";
import type {
  AnalysisStep,
  UploadedFile,
  VerificationResult,
  VerificationStatus,
} from "@/types";

interface VerificationState {
  // Input
  uploadedFile: UploadedFile | null;
  targetUrl: string;
  sourceType: "upload" | "url";

  // Analysis progress
  status: VerificationStatus;
  steps: AnalysisStep[];
  progress: number;
  errorMessage: string | null;

  // Results
  result: VerificationResult | null;

  // Actions
  setUploadedFile: (file: UploadedFile | null) => void;
  setTargetUrl: (url: string) => void;
  setSourceType: (type: "upload" | "url") => void;
  setStatus: (status: VerificationStatus) => void;
  setSteps: (steps: AnalysisStep[]) => void;
  updateStep: (id: string, patch: Partial<AnalysisStep>) => void;
  setProgress: (progress: number) => void;
  setErrorMessage: (msg: string | null) => void;
  setResult: (result: VerificationResult | null) => void;
  reset: () => void;
}

const INITIAL_STEPS: AnalysisStep[] = [
  { id: "fetch", label: "Fetching page content", status: "pending" },
  { id: "parse", label: "Parsing HTML/MHTML structure", status: "pending" },
  { id: "xpath", label: "Validating XPath rules", status: "pending" },
  { id: "dom", label: "Analyzing DOM structure", status: "pending" },
  { id: "url", label: "Comparing URL patterns", status: "pending" },
  { id: "semantic", label: "Semantic analysis", status: "pending" },
  { id: "visual", label: "Visual fingerprint comparison", status: "pending" },
  { id: "score", label: "Computing confidence score", status: "pending" },
];

export const useVerificationStore = create<VerificationState>((set) => ({
  uploadedFile: null,
  targetUrl: "",
  sourceType: "upload",
  status: "idle",
  steps: INITIAL_STEPS,
  progress: 0,
  errorMessage: null,
  result: null,

  setUploadedFile: (file) => set({ uploadedFile: file }),
  setTargetUrl: (url) => set({ targetUrl: url }),
  setSourceType: (type) => set({ sourceType: type }),
  setStatus: (status) => set({ status }),
  setSteps: (steps) => set({ steps }),
  updateStep: (id, patch) =>
    set((state) => ({
      steps: state.steps.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    })),
  setProgress: (progress) => set({ progress }),
  setErrorMessage: (errorMessage) => set({ errorMessage }),
  setResult: (result) => set({ result }),
  reset: () =>
    set({
      status: "idle",
      steps: INITIAL_STEPS.map((s) => ({ ...s, status: "pending" })),
      progress: 0,
      errorMessage: null,
      result: null,
    }),
}));
