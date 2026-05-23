"use client";
import { Copy, Edit, Trash2, ExternalLink, Shield } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { BankTemplate } from "@/types";

interface TemplateCardProps {
  template: BankTemplate;
  onEdit: (t: BankTemplate) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
}

export function TemplateCard({ template, onEdit, onDelete, onDuplicate }: TemplateCardProps) {
  return (
    <Card className="group hover:border-slate-600 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-500/10">
            <Shield className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-200 leading-tight">{template.name}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{template.id}</p>
          </div>
        </div>
        <Badge variant={template.isActive ? "success" : "ghost"}>
          {template.isActive ? "Active" : "Inactive"}
        </Badge>
      </div>

      {template.description && (
        <p className="text-xs text-slate-400 mb-3 line-clamp-2">{template.description}</p>
      )}

      <div className="flex flex-wrap gap-1.5 mb-3">
        {template.tags?.map((tag) => (
          <Badge key={tag} variant="ghost">{tag}</Badge>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3 py-2.5 border-t border-b border-slate-700/50">
        <Stat label="XPath Rules" value={template.xpaths.length} />
        <Stat label="URL Patterns" value={template.urlPatterns.length} />
        <Stat label="CSS Indicators" value={template.cssIndicators.length} />
      </div>

      {template.referenceUrls.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">Reference URLs</p>
          {template.referenceUrls.slice(0, 2).map((url) => (
            <a
              key={url}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 truncate mb-1"
            >
              <ExternalLink className="w-3 h-3 shrink-0" />
              <span className="truncate">{url}</span>
            </a>
          ))}
          {template.referenceUrls.length > 2 && (
            <p className="text-xs text-slate-500">+{template.referenceUrls.length - 2} more</p>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 pt-2">
        <Button size="sm" variant="ghost" onClick={() => onEdit(template)} className="flex-1">
          <Edit className="w-3.5 h-3.5" />
          Edit
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onDuplicate(template.id)}>
          <Copy className="w-3.5 h-3.5" />
        </Button>
        <Button size="sm" variant="danger" onClick={() => onDelete(template.id)}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <p className="text-sm font-bold text-slate-200">{value}</p>
      <p className="text-[10px] text-slate-500">{label}</p>
    </div>
  );
}
