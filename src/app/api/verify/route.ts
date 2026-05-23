import { NextRequest, NextResponse } from "next/server";
import type { ApiResponse, VerificationResult } from "@/types";
import { VerificationPayloadSchema } from "@/core/schemas/template.schema";
import { verificationService } from "@/services/verification.service";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const payload = VerificationPayloadSchema.parse(body);
    const result = await verificationService.verify(payload);
    return NextResponse.json<ApiResponse<VerificationResult>>({
      success: true,
      data: result,
    });
  } catch (err) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: String(err) },
      { status: 400 }
    );
  }
}
