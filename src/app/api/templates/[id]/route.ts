import { NextRequest, NextResponse } from "next/server";
import type { ApiResponse, BankTemplate } from "@/types";
import templatesData from "@/data/templates.json";
import { BankTemplateSchema } from "@/core/schemas/template.schema";
import { nowIso } from "@/lib/utils";

let registry = { ...templatesData };

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const template = registry.templates.find((t) => t.id === id);
  if (!template) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: "Template not found" },
      { status: 404 }
    );
  }
  return NextResponse.json<ApiResponse<BankTemplate>>({
    success: true,
    data: template as unknown as BankTemplate,
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const idx = registry.templates.findIndex((t) => t.id === id);
  if (idx === -1) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: "Template not found" },
      { status: 404 }
    );
  }
  try {
    const body = await req.json();
    const updated = BankTemplateSchema.parse({
      ...registry.templates[idx],
      ...body,
      id,
      updatedAt: nowIso(),
    });
    registry.templates[idx] = updated as unknown as (typeof registry.templates)[number];
    return NextResponse.json<ApiResponse<BankTemplate>>({
      success: true,
      data: updated as unknown as BankTemplate,
    });
  } catch (err) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: String(err) },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  registry.templates = registry.templates.filter((t) => t.id !== id);
  return NextResponse.json<ApiResponse<null>>({ success: true, data: null });
}
