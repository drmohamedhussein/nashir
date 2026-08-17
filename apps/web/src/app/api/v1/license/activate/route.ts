import { NextResponse } from "next/server";
import { z } from "zod";
import { activateByLogin, LicenseError } from "@/lib/license";
import { clientKey, rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().trim().email().max(190),
  password: z.string().min(1).max(100),
  site_url: z.string().url(),
  site_name: z.string().trim().min(1).max(120),
  rest_url: z.string().url(),
  wp_version: z.string().max(20).optional(),
});

export async function POST(request: Request) {
  if (!rateLimit(clientKey(request, "license"), 20, 15 * 60 * 1000)) {
    return NextResponse.json({ error: "محاولات كثيرة. انتظر قليلاً." }, { status: 429 });
  }

  const json = await request.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "بيانات التفعيل غير صالحة." }, { status: 400 });
  }

  try {
    const result = await activateByLogin(parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof LicenseError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
