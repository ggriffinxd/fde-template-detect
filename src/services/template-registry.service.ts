// Template Registry Service — single source of truth for all bank templates.
// Simulates backend CRUD API. Future: replace apiClient calls with real endpoints.

import type { BankTemplate, TemplateRegistry } from "@/types";
import { BankTemplateSchema, TemplateRegistrySchema, describeZodError } from "@/core/schemas/template.schema";
import { apiClient } from "@/lib/api-client";
import { generateId, nowIso } from "@/lib/utils";

const STORAGE_KEY = "bank-verifier:templates";

class TemplateRegistryService {
  private cache: TemplateRegistry | null = null;

  // Load templates.
  // Rule: if templates.json has a newer updatedAt than the stored version,
  // the file wins — this makes edits to templates.json take effect on the
  // next page load without requiring manual localStorage clearing.
  async load(): Promise<TemplateRegistry> {
    if (this.cache) return this.cache;

    const { default: bundledRaw } = await import("@/data/templates.json");
    const bundled = TemplateRegistrySchema.parse(bundledRaw);

    try {
      const stored = this.readStorage();
      if (stored && stored.updatedAt >= bundled.updatedAt) {
        this.cache = stored;
        return stored;
      }
    } catch {
      // corrupt or absent — fall through
    }

    // Bundled JSON is newer (or no stored data): write and use it.
    this.writeStorage(bundled);
    this.cache = bundled;
    return bundled;
  }

  async resetToDefaults(): Promise<void> {
    this.cache = null;
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
    await this.load();
  }

  async getAll(): Promise<BankTemplate[]> {
    const registry = await this.load();
    return registry.templates.filter((t) => t.isActive);
  }

  async getById(id: string): Promise<BankTemplate | null> {
    const registry = await this.load();
    return registry.templates.find((t) => t.id === id) ?? null;
  }

  async create(input: Omit<BankTemplate, "id" | "createdAt" | "updatedAt">): Promise<BankTemplate> {
    // FUTURE: return await apiClient.post<BankTemplate>("/templates", input)
    const registry = await this.load();

    const newTemplate: BankTemplate = BankTemplateSchema.parse({
      ...input,
      id: generateId("template"),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });

    registry.templates.push(newTemplate);
    registry.updatedAt = nowIso();
    await this.save(registry);
    return newTemplate;
  }

  async update(id: string, patch: Partial<BankTemplate>): Promise<BankTemplate> {
    // FUTURE: return await apiClient.put<BankTemplate>(`/templates/${id}`, patch)
    const registry = await this.load();
    const idx = registry.templates.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error(`Template ${id} not found`);

    const updated: BankTemplate = BankTemplateSchema.parse({
      ...registry.templates[idx],
      ...patch,
      id,
      updatedAt: nowIso(),
    });

    registry.templates[idx] = updated;
    registry.updatedAt = nowIso();
    await this.save(registry);
    return updated;
  }

  async delete(id: string): Promise<void> {
    // FUTURE: await apiClient.delete(`/templates/${id}`)
    const registry = await this.load();
    registry.templates = registry.templates.filter((t) => t.id !== id);
    registry.updatedAt = nowIso();
    await this.save(registry);
  }

  async duplicate(id: string): Promise<BankTemplate> {
    const original = await this.getById(id);
    if (!original) throw new Error(`Template ${id} not found`);

    const { id: _id, createdAt: _ca, updatedAt: _ua, ...rest } = original;
    return this.create({ ...rest, name: `${original.name} (Copy)` });
  }

  async exportJson(): Promise<string> {
    const registry = await this.load();
    return JSON.stringify(registry, null, 2);
  }

  async importJson(json: string): Promise<void> {
    const result = TemplateRegistrySchema.safeParse(JSON.parse(json));
    if (!result.success) {
      throw new Error(describeZodError(result.error));
    }
    await this.save(result.data);
  }

  private async save(registry: TemplateRegistry): Promise<void> {
    this.cache = registry;
    this.writeStorage(registry);
  }

  invalidateCache(): void {
    this.cache = null;
  }

  private readStorage(): TemplateRegistry | null {
    if (typeof localStorage === "undefined") return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return TemplateRegistrySchema.parse(JSON.parse(raw));
    } catch {
      return null;
    }
  }

  private writeStorage(registry: TemplateRegistry): void {
    if (typeof localStorage === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(registry));
    } catch {
      // storage full or unavailable
    }
  }
}

export const templateRegistryService = new TemplateRegistryService();
