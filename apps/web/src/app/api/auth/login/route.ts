import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { verifyPassword } from "@/lib/crypto";
import { clientKey, rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  if (!rateLimit(clientKey(request, "login"), 12, 15 * 60 * 1000)) {
    return NextResponse.json({ error: "محاولات كثيرة. انتظر قليلاً." }, { status: 429 });
  }
  const json = await request.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "بيانات غير مكتملة." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
    include: { workspace: true },
  });

  if (!user?.workspace || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return NextResponse.json({ error: "البريد أو كلمة المرور غير صحيحة." }, { status: 401 });
  }

  await createSession({
    id: user.id,
    name: user.name,
    email: user.email,
    workspaceId: user.workspace.id,
  });

  return NextResponse.json({ ok: true });
}
