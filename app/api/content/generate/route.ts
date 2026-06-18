// app/api/content/generate/route.ts
// Web-only Route Handler (Vercel). This endpoint does NOT exist inside the
// Android APK — Capacitor's static export has no server, so this route is
// only ever reachable at kidsventure.vercel.app. The APK never calls it; it
// only reads the rows this route writes, via the existing Supabase-direct
// loaders (see lib/flashcards.ts pattern).
//
// Gated by a shared secret so randoms can't burn your Claude API budget.
// Trigger manually (e.g. from your own browser, Postman, or a future parent
// dashboard button) with:
//
//   POST https://kidsventure.vercel.app/api/content/generate
//   Header: x-admin-secret: <CONTENT_ADMIN_SECRET>
//   Body: { "skillCeiling": 2, "themes": ["badminton","swimming"], "mode": "advanced" }
//
// Env required (Vercel dashboard):
//   CONTENT_ADMIN_SECRET   (pick any long random string yourself)
//   ANTHROPIC_API_KEY
//   SUPABASE_SERVICE_ROLE_KEY
//   NEXT_PUBLIC_SUPABASE_URL

import { NextRequest, NextResponse } from 'next/server';
import { generateThemedContent } from '@/lib/generateContent';

export async function POST(req: NextRequest) {
  const secret = process.env.CONTENT_ADMIN_SECRET;
  const provided = req.headers.get('x-admin-secret');

  if (!secret) {
    return NextResponse.json(
      { error: 'CONTENT_ADMIN_SECRET is not configured on the server.' },
      { status: 503 },
    );
  }
  if (provided !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const skillCeiling = Number(body?.skillCeiling);
  const themes = Array.isArray(body?.themes) ? body.themes.filter((t: unknown) => typeof t === 'string') : [];
  const mode = body?.mode === 'junior' ? 'junior' : 'advanced';

  if (!Number.isFinite(skillCeiling) || skillCeiling < 1) {
    return NextResponse.json({ error: 'skillCeiling must be a positive number' }, { status: 400 });
  }

  const result = await generateThemedContent({
    skillCeiling,
    themes,
    mode,
    mathCount: Number(body?.mathCount) || 5,
    logicCount: Number(body?.logicCount) || 5,
  });

  return NextResponse.json(result, { status: result.errors.length ? 207 : 200 });
}
