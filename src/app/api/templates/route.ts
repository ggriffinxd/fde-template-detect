import { NextRequest, NextResponse } from "next/server";
import type { ApiResponse, BankTemplate } from "@/types";
import templatesData from "@/data/templates.json";
import { BankTemplateSchema } from "@/core/schemas/template.schema";
import { generateId, nowIso } from "@/lib/utils";

// In-memory store for this API route (SSR/Edge context).
// FUTURE: Replace with database (PostgreSQL/MongoDB) or external registry service.
let registry = { ...templatesData };

export async function GET(): Promise<NextResponse> {
  const active = registry.templates.filter((t) => t.isActive);
  return NextResponse.json<ApiResponse<BankTemplate[]>>({
    success: true,
    data: active as BankTemplate[],
  });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const validated = BankTemplateSchema.parse({
      ...body,
      id: generateId("template"),
      createdAt: nowIso(),
      updatedAt: nowIso(),
      isActive: true,
    });
    registry.templates.push(validated as unknown as (typeof registry.templates)[number]);
    return NextResponse.json<ApiResponse<BankTemplate>>(
      { success: true, data: validated as unknown as BankTemplate },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: String(err) },
      { status: 400 }
    );
  }
}
