'use client';

import { useEffect, useState } from 'react';

// Versi HTML/CSS dari bintang berkedip di TitleScene.js (this.add.circle
// + tween alpha yoyo).
//
// PENTING: posisi bintang di-generate pakai Math.random(), yang WAJIB
// hanya jalan di client. Kalau di-generate langsung saat render pertama
// (mis. lewat useMemo), Next.js akan menjalankan render itu juga di
// server (SSR) untuk menghasilkan HTML awal — sehingga angka random versi
// server dan versi client (saat hydration) berbeda, dan React melempar
// "hydration mismatch" karena attribute style tidak cocok.
//
// Solusinya: render null dulu di awal (baik di server maupun di pass
// hydration pertama client), lalu isi array bintang di useEffect (yang
// HANYA jalan di client, setelah hydration selesai). Dengan begitu HTML
// server & HTML client awal identik (sama-sama kosong), dan bintang baru
// muncul sesaat setelah mount — praktis tidak terlihat karena animasinya
// sendiri juga baru mulai berkedip pelan.
export default function StarField({ count = 70 }) {
  const [stars, setStars] = useState(null);

  useEffect(() => {
    setStars(
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        size: 1 + Math.random() * 1.4,
        duration: 1.2 + Math.random() * 2,
        delay: Math.random() * 2,
        baseOpacity: 0.3 + Math.random() * 0.7,
      })),
    );
  }, [count]);

  if (!stars) return <div className="auth-starfield" aria-hidden="true" />;

  return (
    <div className="auth-starfield" aria-hidden="true">
      {stars.map((star) => (
        <span
          key={star.id}
          className="auth-star"
          style={{
            left: star.left,
            top: star.top,
            width: `${star.size}px`,
            height: `${star.size}px`,
            animationDuration: `${star.duration}s`,
            animationDelay: `${star.delay}s`,
            opacity: star.baseOpacity,
          }}
        />
      ))}
    </div>
  );
}

