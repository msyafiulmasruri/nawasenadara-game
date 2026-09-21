'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import AuthShell from '@/features/auth/components/AuthShell';
import AuthInput from '@/features/auth/components/AuthInput';
import AuthButton from '@/features/auth/components/AuthButton';
import AuthMessage from '@/features/auth/components/AuthMessage';
import { useAuth } from '@/features/auth/context/AuthContext';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const { verifyResetToken, resetPassword } = useAuth();

  // 'checking' -> 'valid' | 'invalid'
  const [tokenState, setTokenState] = useState(token ? 'checking' : 'invalid');
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) {
      setTokenState('invalid');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        await verifyResetToken(token);
        if (!cancelled) setTokenState('valid');
      } catch {
        if (!cancelled) setTokenState('invalid');
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password.length < 6) {
      setError('Password minimal 6 karakter.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Konfirmasi password tidak cocok.');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, form.password);
      setDone(true);
      setTimeout(() => router.push('/game'), 2000);
    } catch (err) {
      setError(err.message || 'Gagal mereset password. Coba minta link baru.');
    } finally {
      setLoading(false);
    }
  };

  if (tokenState === 'checking') {
    return <AuthMessage type="success">Memeriksa link reset password…</AuthMessage>;
  }

  if (tokenState === 'invalid') {
    return (
      <>
        <AuthMessage type="error">
          Link reset password tidak valid atau sudah kedaluwarsa.
        </AuthMessage>
        <div style={{ marginTop: 16 }}>
          <Link href="/forgot-password" className="auth-link">
            Minta link reset baru
          </Link>
        </div>
      </>
    );
  }

  if (done) {
    return (
      <>
        <AuthMessage type="success">
          Password berhasil direset! Mengalihkan ke halaman start…
        </AuthMessage>
        <div style={{ marginTop: 16 }}>
          <Link href="/game" className="auth-button auth-button--ghost" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
            Kembali ke Halaman Start
          </Link>
        </div>
      </>
    );
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <AuthMessage type="error">{error}</AuthMessage>

      <AuthInput
        id="password"
        label="Password Baru"
        type="password"
        autoComplete="new-password"
        placeholder="Minimal 6 karakter"
        required
        value={form.password}
        onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
      />

      <AuthInput
        id="confirmPassword"
        label="Konfirmasi Password Baru"
        type="password"
        autoComplete="new-password"
        placeholder="Ulangi password baru"
        required
        value={form.confirmPassword}
        onChange={(e) => setForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
      />

      <AuthButton type="submit" loading={loading}>
        Reset Password
      </AuthButton>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthShell
      title="Reset Password"
      subtitle="Buat password baru untuk akunmu."
      footer={
        <Link
          href="/game"
          className="auth-button auth-button--ghost"
          style={{ display: 'inline-block', textDecoration: 'none' }}
        >
          Kembali ke Halaman Start
        </Link>
      }
    >
      <Suspense fallback={<AuthMessage type="success">Memuat…</AuthMessage>}>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
