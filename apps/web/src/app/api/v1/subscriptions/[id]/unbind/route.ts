import { NextResponse } from "next/server";
import { API_ERRORS } from "@/lib/api-errors";
import { getSession } from "@/lib/auth";
import { LicenseError, unbindSeat } from "@/lib/license";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: API_ERRORS.LOGIN_REQUIRED }, { status: 401 });
  }

  const { id } = await params;
  try {
    await unbindSeat(session.workspaceId, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof LicenseError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
