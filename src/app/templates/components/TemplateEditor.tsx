"use client";
import { useState } from "react";
import { Plus, Trash2, Save, X } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { BankTemplate, XPathRule, UrlPattern } from "@/types";
import { generateId, nowIso } from "@/lib/utils";

interface TemplateEditorProps {
  template?: BankTemplate | null;
  open: boolean;
  onClose: () => void;
  onSave: (template: Omit<BankTemplate, "id" | "createdAt" | "updatedAt"> | BankTemplate) => Promise<void>;
}

const BLANK_TEMPLATE: Omit<BankTemplate, "id" | "createdAt" | "updatedAt"> = {
  name: "",
  description: "",
  referenceUrls: [],
  urlPatterns: [],
  xpaths: [],
  cssIndicators: [],
  semanticKeywords: [],
  visualFingerprints: [],
  domFingerprints: [],
  tags: [],
  isActive: true,
};

export function TemplateEditor({ template, open, onClose, onSave }: TemplateEditorProps) {
  const [form, setForm] = useState<Omit<BankTemplate, "id" | "createdAt" | "updatedAt">>(
    template ?? BLANK_TEMPLATE
  );
  const [saving, setSaving] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [newKeyword, setNewKeyword] = useState("");
  const [newCss, setNewCss] = useState("");
  const [newXpathName, setNewXpathName] = useState("");
  const [newXpathValue, setNewXpathValue] = useState("");

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (template) {
        await onSave({ ...template, ...form });
      } else {
        await onSave(form);
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const addUrl = () => {
    if (newUrl.trim()) {
      setForm((f) => ({ ...f, referenceUrls: [...f.referenceUrls, newUrl.trim()] }));
      setNewUrl("");
    }
  };

  const addKeyword = () => {
    if (newKeyword.trim()) {
      setForm((f) => ({ ...f, semanticKeywords: [...f.semanticKeywords, newKeyword.trim()] }));
      setNewKeyword("");
    }
  };

  const addCss = () => {
    if (newCss.trim()) {
      setForm((f) => ({ ...f, cssIndicators: [...f.cssIndicators, newCss.trim()] }));
      setNewCss("");
    }
  };

  const addXpath = () => {
    if (newXpathName.trim() && newXpathValue.trim()) {
      const rule: XPathRule = {
        id: generateId("xp"),
        name: newXpathName.trim(),
        value: newXpathValue.trim(),
        weight: 10,
        required: false,
      };
      setForm((f) => ({ ...f, xpaths: [...f.xpaths, rule] }));
      setNewXpathName("");
      setNewXpathValue("");
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={template ? `Edit: ${template.name}` : "New Template"}
      size="xl"
    >
      <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
        {/* Basic Info */}
        <section className="space-y-3">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Basic Info</h4>
          <Input
            label="Template Name *"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Generic Bank Login Portal"
          />
          <Input
            label="Description"
            value={form.description ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Brief description of this template"
          />
        </section>

        {/* Reference URLs */}
        <section className="space-y-2">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Reference URLs</h4>
          <div className="flex gap-2">
            <input
              type="url"
              placeholder="https://bank.com/login"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addUrl()}
              className="flex-1 px-3 py-2 text-sm rounded-lg bg-slate-900/60 border border-slate-700 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <Button size="sm" onClick={addUrl}><Plus className="w-3.5 h-3.5" /></Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {form.referenceUrls.map((url) => (
              <Badge key={url} variant="info" className="gap-1.5 max-w-full">
                <span className="truncate text-[10px]">{url}</span>
                <button onClick={() => setForm((f) => ({ ...f, referenceUrls: f.referenceUrls.filter((u) => u !== url) }))}>
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        </section>

        {/* XPath Rules */}
        <section className="space-y-2">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">XPath Rules</h4>
          <div className="space-y-2">
            <Input
              placeholder="Rule name (e.g. Login Button)"
              value={newXpathName}
              onChange={(e) => setNewXpathName(e.target.value)}
            />
            <div className="flex gap-2">
              <input
                placeholder="XPath value (e.g. //button[@type='submit'])"
                value={newXpathValue}
                onChange={(e) => setNewXpathValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addXpath()}
                className="flex-1 px-3 py-2 text-xs font-mono rounded-lg bg-slate-900/60 border border-slate-700 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <Button size="sm" onClick={addXpath}><Plus className="w-3.5 h-3.5" /></Button>
            </div>
          </div>
          <div className="space-y-1.5">
            {form.xpaths.map((xp) => (
              <div key={xp.id} className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/50 border border-slate-700/50">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-300">{xp.name}</p>
                  <code className="text-[10px] text-slate-500 font-mono truncate block">{xp.value}</code>
                </div>
                <button onClick={() => setForm((f) => ({ ...f, xpaths: f.xpaths.filter((r) => r.id !== xp.id) }))}
                  className="text-slate-500 hover:text-red-400 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* CSS Indicators */}
        <section className="space-y-2">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">CSS Indicators</h4>
          <div className="flex gap-2">
            <input
              placeholder=".login-form, #auth-container"
              value={newCss}
              onChange={(e) => setNewCss(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCss()}
              className="flex-1 px-3 py-2 text-sm font-mono rounded-lg bg-slate-900/60 border border-slate-700 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <Button size="sm" onClick={addCss}><Plus className="w-3.5 h-3.5" /></Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {form.cssIndicators.map((css) => (
              <Badge key={css} variant="info" className="gap-1 font-mono">
                <span className="text-[10px]">{css}</span>
                <button onClick={() => setForm((f) => ({ ...f, cssIndicators: f.cssIndicators.filter((c) => c !== css) }))}>
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        </section>

        {/* Semantic Keywords */}
        <section className="space-y-2">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Semantic Keywords</h4>
          <div className="flex gap-2">
            <input
              placeholder="login, password, secure..."
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addKeyword()}
              className="flex-1 px-3 py-2 text-sm rounded-lg bg-slate-900/60 border border-slate-700 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <Button size="sm" onClick={addKeyword}><Plus className="w-3.5 h-3.5" /></Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {form.semanticKeywords.map((kw) => (
              <Badge key={kw} variant="ghost" className="gap-1">
                {kw}
                <button onClick={() => setForm((f) => ({ ...f, semanticKeywords: f.semanticKeywords.filter((k) => k !== kw) }))}>
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        </section>
      </div>

      <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-slate-700">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={handleSave} loading={saving} disabled={!form.name.trim()}>
          <Save className="w-3.5 h-3.5" />
          {template ? "Save Changes" : "Create Template"}
        </Button>
      </div>
    </Modal>
  );
}
