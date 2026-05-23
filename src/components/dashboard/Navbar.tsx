"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield, LayoutDashboard, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/", label: "Verify", icon: LayoutDashboard },
  { href: "/templates", label: "Templates", icon: BookOpen },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-700/60 bg-slate-900/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="p-1.5 rounded-lg bg-blue-500/15 border border-blue-500/20 group-hover:bg-blue-500/25 transition-colors">
              <Shield className="w-4 h-4 text-blue-400" />
            </div>
            <span className="text-sm font-bold text-slate-100 tracking-tight">
              Bank<span className="text-blue-400">Verify</span>
            </span>
            <span className="hidden sm:inline text-[10px] text-slate-500 bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded font-mono">
              v1.0
            </span>
          </Link>

          {/* Nav links */}
          <nav className="flex items-center gap-1">
            {navLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                  pathname === href
                    ? "bg-slate-700/70 text-slate-100"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
