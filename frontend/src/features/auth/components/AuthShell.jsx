import Link from 'next/link';
import StarField from './StarField';

export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <main className="auth-page">
      <StarField />
      <div className="auth-viewport">
        <Link href="/" className="auth-logo" aria-label="Nawasena Dara — kembali ke beranda">
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
