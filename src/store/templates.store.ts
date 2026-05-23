import { create } from "zustand";
import type { BankTemplate } from "@/types";

interface TemplatesState {
  templates: BankTemplate[];
  isLoading: boolean;
  error: string | null;
  selectedTemplate: BankTemplate | null;
  isEditing: boolean;

  setTemplates: (templates: BankTemplate[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSelectedTemplate: (template: BankTemplate | null) => void;
  setIsEditing: (editing: boolean) => void;
  addTemplate: (template: BankTemplate) => void;
  updateTemplate: (id: string, patch: Partial<BankTemplate>) => void;
  removeTemplate: (id: string) => void;
}

export const useTemplatesStore = create<TemplatesState>((set) => ({
  templates: [],
  isLoading: false,
  error: null,
  selectedTemplate: null,
  isEditing: false,

  setTemplates: (templates) => set({ templates }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setSelectedTemplate: (selectedTemplate) => set({ selectedTemplate }),
  setIsEditing: (isEditing) => set({ isEditing }),
  addTemplate: (template) =>
    set((state) => ({ templates: [...state.templates, template] })),
  updateTemplate: (id, patch) =>
    set((state) => ({
      templates: state.templates.map((t) =>
        t.id === id ? { ...t, ...patch } : t
      ),
    })),
  removeTemplate: (id) =>
    set((state) => ({
      templates: state.templates.filter((t) => t.id !== id),
    })),
}));
