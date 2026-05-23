"use client";
import { useCallback, useState } from "react";
import { Upload, X, CheckCircle } from "lucide-react";
import { cn, formatBytes } from "@/lib/utils";
import type { UploadedFile } from "@/types";

interface FileDropzoneProps {
  onFile: (file: UploadedFile) => void;
  onClear: () => void;
  uploadedFile: UploadedFile | null;
}

export function FileDropzone({ onFile, onClear, uploadedFile }: FileDropzoneProps) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processFile = useCallback(
    async (file: File) => {
      setError(null);
      const isHtml = file.name.endsWith(".html") || file.type === "text/html";
      const isMhtml =
        file.name.endsWith(".mhtml") ||
        file.name.endsWith(".mht") ||
        file.type === "message/rfc822";

      if (!isHtml && !isMhtml) {
        setError("Only .html and .mhtml files are supported.");
        return;
      }

      try {
        const content = await file.text();
        const actualType =
          content.startsWith("MIME-Version:") || isMhtml ? "mhtml" : "html";
        onFile({ name: file.name, type: actualType, size: file.size, content });
      } catch {
        setError("Failed to read file.");
      }
    },
    [onFile],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
      e.target.value = "";
    },
    [processFile],
  );

  if (uploadedFile) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10">
        <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-200 truncate">{uploadedFile.name}</p>
          <p className="text-xs text-slate-400">
            {uploadedFile.type.toUpperCase()} · {formatBytes(uploadedFile.size)}
          </p>
        </div>
        <button
          onClick={onClear}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <label
      className={cn(
        "flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed cursor-pointer transition-colors",
        dragging
          ? "border-blue-500 bg-blue-500/10"
          : "border-slate-600 hover:border-slate-500 hover:bg-slate-800/50",
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <input
        type="file"
        accept=".html,.mhtml,.mht"
        className="sr-only"
        onChange={handleChange}
      />
      <div className="p-3 rounded-xl bg-slate-700/50">
        <Upload className="w-6 h-6 text-blue-400" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-slate-300">
          Drop your file here or <span className="text-blue-400">browse</span>
        </p>
        <p className="text-xs text-slate-500 mt-1">Supports .html and .mhtml files</p>
      </div>
      {error && <p className="text-xs text-red-400 text-center">{error}</p>}
    </label>
  );
}
