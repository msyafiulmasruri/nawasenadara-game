'use client';

import PhaserGame from '@/features/game-engine/PhaserGameLoader';
import RequireAuth from '@/features/auth/components/RequireAuth';
import GameAuthBridge from '@/features/auth/components/GameAuthBridge';
import GameNlpBridge from '@/features/auth/components/GameNlpBridge';
import GameProgressBridge from '@/features/auth/components/GameProgressBridge';
import GameProfileBridge from '@/features/auth/components/GameProfileBridge';
import GameUIBridge from '@/features/auth/components/GameUIBridge';

export default function GamePage() {
  return (
    <RequireAuth>
      <GameAuthBridge />
      <GameNlpBridge />
      <GameProgressBridge />
      <GameProfileBridge />
      <GameUIBridge />
      <main>
        <PhaserGame />
      </main>
    </RequireAuth>
  );
}

