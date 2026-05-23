"use client";
import { useState } from "react";
import { Globe, ExternalLink } from "lucide-react";

interface UrlInputProps {
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
}

export function UrlInput({ value, onChange, disabled }: UrlInputProps) {
  const [error, setError] = useState<string | null>(null);

  const validate = (url: string) => {
    if (!url) { setError(null); return; }
    try {
      new URL(url.startsWith("http") ? url : `https://${url}`);
      setError(null);
    } catch {
      setError("Please enter a valid URL (e.g. https://bank.com/login)");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    onChange(v);
    validate(v);
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
        <input
          type="url"
          placeholder="https://bank.com/login"
          value={value}
          onChange={handleChange}
          disabled={disabled}
          className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-slate-900/60 border border-slate-700 text-slate-100 placeholder:text-slate-500 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
        />
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex flex-wrap gap-2">
        {["https://example-bank.com/login", "https://secure-bank.com/auth"].map((url) => (
          <button
            key={url}
            onClick={() => { onChange(url); setError(null); }}
            disabled={disabled}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-blue-400 border border-blue-500/20 hover:border-blue-500/40 hover:bg-blue-500/10 transition-colors disabled:opacity-50"
          >
            <ExternalLink className="w-3 h-3" />
            {url.replace("https://", "")}
          </button>
        ))}
      </div>
      <p className="text-xs text-slate-500">
        The page will be fetched and analyzed automatically. CORS restrictions may apply — server-side capture coming soon.
      </p>
    </div>
  );
}
