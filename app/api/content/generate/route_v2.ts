// app/api/content/generate/route.ts
// Web-only Route Handler (Vercel). Does NOT exist inside the Android APK —
// the app only ever reads what this route writes, via the Supabase-direct
// loaders (lib/flashcards.ts, lib/dynamicContent.ts).
//
// Trigger manually:
//   POST https://kidsventure.vercel.app/api/content/generate
//   Header: x-admin-secret: <CONTENT_ADMIN_SECRET>
//   Body: {
//     "skillCeiling": 2,
//     "themes": ["badminton","swimming"],
//     "mode": "advanced",
//     "mathCount": 5, "logicCount": 5, "flashcardCount": 6, "storyCount": 1
//   }
//
// Env required (Vercel dashboard):
//   CONTENT_ADMIN_SECRET, GEMINI_API_KEY, SUPABASE_SERVICE_ROLE_KEY,
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
    mathCount: Number(body?.mathCount) || 20,
    logicCount: Number(body?.logicCount) || 20,
    flashcardCount: Number(body?.flashcardCount) || 25,
    storyCount: Number(body?.storyCount) || 3,
  });

  return NextResponse.json(result, { status: result.errors.length ? 207 : 200 });
}
