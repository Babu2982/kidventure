'use client';

// app/masterminds/page.tsx
// Launch screen for the Master Minds flashcard engine.
// Brand-new file — adding this does not change anything else in your app.

import { useRouter } from 'next/navigation';
import MasterMindsEngine from '@/components/MasterMindsEngine';
import { useGameStore } from '@/store/useGameStore';

export default function MasterMindsPage() {
  const router = useRouter();
  // reads the child's level if your store has it; otherwise safely defaults to 1
  const skillLevel = useGameStore((s) => (s as any).currentSkillCeiling ?? 1);

  return (
    <MasterMindsEngine
      mode="advanced"
      skillLevel={skillLevel}
      onExit={() => router.push('/dashboard')}
      onComplete={(summary) => {
        // (Optional, later) award stars here.
        console.log('Master Minds session complete', summary);
      }}
    />
  );
}
