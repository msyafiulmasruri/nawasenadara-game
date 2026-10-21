'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import StarField from './StarField';

export default function AuthShell({ title, subtitle, children, footer }) {
  const [keyboardInset, setKeyboardInset] = useState(0);

  // Deteksi keyboard virtual HP terbuka lewat window.visualViewport
  // Berikan padding bawah dinamis pada .auth-page agar seluruh formulir
  // dan tombol submit dapat digulir bebas di atas keyboard tanpa tertutup.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return undefined;

    const vv = window.visualViewport;
    const handleViewportChange = () => {
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKeyboardInset(inset);
    };

    handleViewportChange();
    vv.addEventListener('resize', handleViewportChange);
    vv.addEventListener('scroll', handleViewportChange);

    return () => {
      vv.removeEventListener('resize', handleViewportChange);
      vv.removeEventListener('scroll', handleViewportChange);
    };
  }, []);

  return (
    <main
      className="auth-page"
      style={keyboardInset > 0 ? { paddingBottom: `${keyboardInset + 40}px` } : undefined}
    >
      <StarField />
      <div
        className="auth-viewport"
        style={keyboardInset > 0 ? { minHeight: 'auto', paddingTop: '10px' } : undefined}
      >
        <Link href="/" className="auth-logo" aria-label="Nawasena Dara - kembali ke beranda">
          NAWASENA DARA
        </Link>

        <section className="auth-card" role="region" aria-label={title}>
          <header className="auth-card__header">
            <h1 className="auth-card__title">{title}</h1>
            {subtitle ? <p className="auth-card__subtitle">{subtitle}</p> : null}
          </header>

          {children}
        </section>

        {footer ? <p className="auth-footer">{footer}</p> : null}
      </div>
    </main>
  );
}
