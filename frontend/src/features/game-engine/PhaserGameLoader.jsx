'use client';

import dynamic from 'next/dynamic';

// Phaser touches `window` and browser-only APIs, and its ESM build doesn't
// interop cleanly with Next's SSR/prerender pass, so this component (and its
// scene imports) must never be evaluated on the server. `ssr: false` is only
// allowed inside a Client Component, hence this wrapper.
const PhaserGame = dynamic(() => import('./PhaserGame'), {
  ssr: false,
});

export default PhaserGame;
