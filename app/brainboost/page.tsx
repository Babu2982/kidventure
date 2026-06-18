'use client';

// app/brainboost/page.tsx
// Launch screen for the Brain Boost dynamic practice engine.

import { useRouter } from 'next/navigation';
import DynamicPracticeArena from '@/components/DynamicPracticeArena';
import { useGameStore } from '@/store/useGameStore';

export default function BrainBoostPage() {
  const router = useRouter();
  const skillLevel = useGameStore((s) => (s as any).currentSkillCeiling ?? 1);

  return (
    <DynamicPracticeArena
      mode="advanced"
      skillLevel={skillLevel}
      onExit={() => router.push('/dashboard')}
      onComplete={(summary) => {
        console.log('Brain Boost session complete', summary);
      }}
    />
  );
}
