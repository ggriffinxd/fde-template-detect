"use client";
import { useState } from "react";
import {
  Plus,
  Download,
  Upload as UploadIcon,
  RefreshCw,
  BookOpen,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { TemplateCard } from "@/app/templates/components/TemplateCard";
import { TemplateEditor } from "@/app/templates/components/TemplateEditor";
import { useTemplates } from "@/hooks/useTemplates";
import type { BankTemplate } from "@/types";

export default function TemplatesPage() {
  const [editorOpen, setEditorOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const {
    templates,
    isLoading,
    error,
    selectedTemplate,
    setSelectedTemplate,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
    exportTemplates,
    importTemplates,
    resetToDefaults,
  } = useTemplates();

  const handleSave = async (
    data: Omit<BankTemplate, "id" | "createdAt" | "updatedAt"> | BankTemplate,
  ) => {
    if ("id" in data) {
      await updateTemplate(data.id, data);
      toast.success("Template updated");
    } else {
      await createTemplate(data);
      toast.success("Template created");
    }
    setEditorOpen(false);
    setSelectedTemplate(null);
  };

  const handleEdit = (t: BankTemplate) => {
    setSelectedTemplate(t);
    setEditorOpen(true);
  };

  const handleDelete = (id: string) => setDeleteTarget(id);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteTemplate(deleteTarget);
    toast.success("Template deleted");
    setDeleteTarget(null);
  };

  const handleResetToDefaults = async () => {
    await resetToDefaults();
    toast.success("Templates reset to defaults");
    setResetConfirmOpen(false);
  };

  const handleExport = async () => {
    const json = await exportTemplates();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bank-templates.json";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Templates exported");
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const json = await file.text();
      try {
        await importTemplates(json);
        toast.success("Templates imported successfully");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Invalid template registry JSON");
      }
    };
    input.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-400" />
            Template Registry
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage bank page templates used for similarity detection
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => setResetConfirmOpen(true)}>
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </Button>
          <Button size="sm" variant="ghost" onClick={handleImport}>
            <UploadIcon className="w-3.5 h-3.5" />
            Import
          </Button>
          <Button size="sm" variant="ghost" onClick={handleExport}>
            <Download className="w-3.5 h-3.5" />
            Export
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={() => {
              setSelectedTemplate(null);
              setEditorOpen(true);
            }}
          >
            <Plus className="w-3.5 h-3.5" />
            New Template
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4 p-3 rounded-xl border border-slate-700/60 bg-slate-800/30 text-xs text-slate-400">
        <span className="font-medium text-slate-200">{templates.length}</span>{" "}
        templates registered
        <span>·</span>
        <span className="font-medium text-emerald-400">
          {templates.filter((t) => t.isActive).length}
        </span>{" "}
        active
        <span>·</span>
        <span>
          {templates.reduce((sum, t) => sum + t.xpaths.length, 0)} total XPath
          rules
        </span>
      </div>

      {/* States */}
      {isLoading && (
        <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading templates...</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-sm text-red-300">
          {error}
        </div>
      )}

      {!isLoading && !error && templates.length === 0 && (
        <div className="text-center py-16 space-y-3">
          <BookOpen className="w-10 h-10 text-slate-700 mx-auto" />
          <p className="text-slate-400 text-sm">No templates yet</p>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setEditorOpen(true)}
          >
            <Plus className="w-3.5 h-3.5" />
            Create First Template
          </Button>
        </div>
      )}

      {/* Grid */}
      {!isLoading && templates.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {templates.map((t) => (
            <TemplateCard
              key={t.id}
              template={t}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onDuplicate={duplicateTemplate}
            />
          ))}
        </div>
      )}

      {/* Editor modal */}
      <TemplateEditor
        open={editorOpen}
        template={selectedTemplate}
        onClose={() => {
          setEditorOpen(false);
          setSelectedTemplate(null);
        }}
        onSave={handleSave}
      />

      {/* Delete confirmation */}
      <ConfirmModal
        open={deleteTarget !== null}
        title="Delete Template"
        message="This template will be permanently removed. This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Reset to defaults confirmation */}
      <ConfirmModal
        open={resetConfirmOpen}
        title="Reset to Defaults"
        message="All custom templates will be replaced with the bundled defaults. Any templates you created or edited will be lost."
        confirmLabel="Reset"
        onConfirm={handleResetToDefaults}
        onCancel={() => setResetConfirmOpen(false)}
      />
    </div>
  );
}
