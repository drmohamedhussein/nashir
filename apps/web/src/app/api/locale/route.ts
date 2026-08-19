import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  locale: z.enum(["en", "ar"]),
});

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "locale" }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set("nashir_locale", parsed.data.locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return response;
}
