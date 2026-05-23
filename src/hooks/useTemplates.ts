"use client";
import { useEffect, useCallback } from "react";
import { useTemplatesStore } from "@/store/templates.store";
import { templateRegistryService } from "@/services/template-registry.service";
import type { BankTemplate } from "@/types";

export function useTemplates() {
  const store = useTemplatesStore();

  const loadTemplates = useCallback(async () => {
    store.setLoading(true);
    store.setError(null);
    try {
      const templates = await templateRegistryService.getAll();
      store.setTemplates(templates);
    } catch (err) {
      store.setError(err instanceof Error ? err.message : "Failed to load templates");
    } finally {
      store.setLoading(false);
    }
  }, [store]);

  useEffect(() => {
    loadTemplates();
  }, []);

  const createTemplate = useCallback(
    async (input: Omit<BankTemplate, "id" | "createdAt" | "updatedAt">) => {
      const template = await templateRegistryService.create(input);
      store.addTemplate(template);
      return template;
    },
    [store]
  );

  const updateTemplate = useCallback(
    async (id: string, patch: Partial<BankTemplate>) => {
      const updated = await templateRegistryService.update(id, patch);
      store.updateTemplate(id, updated);
      return updated;
    },
    [store]
  );

  const deleteTemplate = useCallback(
    async (id: string) => {
      await templateRegistryService.delete(id);
      store.removeTemplate(id);
    },
    [store]
  );

  const duplicateTemplate = useCallback(
    async (id: string) => {
      const copy = await templateRegistryService.duplicate(id);
      store.addTemplate(copy);
      return copy;
    },
    [store]
  );

  const exportTemplates = useCallback(async () => {
    return templateRegistryService.exportJson();
  }, []);

  const importTemplates = useCallback(
    async (json: string) => {
      await templateRegistryService.importJson(json);
      templateRegistryService.invalidateCache();
      await loadTemplates();
    },
    [loadTemplates]
  );

  const resetToDefaults = useCallback(async () => {
    await templateRegistryService.resetToDefaults();
    await loadTemplates();
  }, [loadTemplates]);

  return {
    templates: store.templates,
    isLoading: store.isLoading,
    error: store.error,
    selectedTemplate: store.selectedTemplate,
    isEditing: store.isEditing,
    setSelectedTemplate: store.setSelectedTemplate,
    setIsEditing: store.setIsEditing,
    loadTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
    exportTemplates,
    importTemplates,
    resetToDefaults,
  };
}
