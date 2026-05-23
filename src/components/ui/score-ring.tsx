"use client";
import { cn } from "@/lib/utils";

interface ScoreRingProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  label?: string;
  sublabel?: string;
}

function scoreColor(v: number) {
  if (v >= 85) return "#10b981";
  if (v >= 70) return "#22c55e";
  if (v >= 50) return "#eab308";
  if (v >= 30) return "#f97316";
  return "#ef4444";
}

export function ScoreRing({
  value,
  size = 140,
  strokeWidth = 10,
  className,
  label,
  sublabel,
}: ScoreRingProps) {
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset =
    circumference - (Math.min(100, Math.max(0, value)) / 100) * circumference;
  const color = scoreColor(value);
  const cx = size / 2;

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center",
        className,
      )}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={cx}
          cy={cx}
          r={radius}
          fill="none"
          stroke="#334155"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={cx}
          cy={cx}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{
            transition: "stroke-dashoffset 1s ease-out, stroke 0.5s ease",
          }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-bold text-white">
          {Math.round(value)}%
        </span>
        {label && (
          <span className="text-[0.6rem] text-slate-400 mt-0.5">{label}</span>
        )}
      </div>
    </div>
  );
}
