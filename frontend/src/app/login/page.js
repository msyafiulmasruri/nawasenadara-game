'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthShell from '@/features/auth/components/AuthShell';
import AuthInput from '@/features/auth/components/AuthInput';
import AuthButton from '@/features/auth/components/AuthButton';
import AuthMessage from '@/features/auth/components/AuthMessage';
import GoogleAuthButton from '@/features/auth/components/GoogleAuthButton';
import { useAuth } from '@/features/auth/context/AuthContext';
import { requestAppFullscreen } from '@/lib/fullscreen';

export default function LoginPage() {
  const router = useRouter();
  const { login, googleLogin } = useAuth();

  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const update = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Dipanggil SINKRON di sini (sebelum `await login(...)` di bawah) —
    // beberapa browser (terutama Safari) menolak requestFullscreen kalau
    // dipanggil setelah ada `await`, karena "izin gesture pengguna" yang
    // menyertai event klik dianggap sudah kedaluwarsa begitu kode async
    // sempat jeda menunggu sesuatu.
    requestAppFullscreen();
    setError('');
    setLoading(true);
    try {
      // expected_role: 'siswa' — halaman ini portal siswa; kalau akun
      // yang login ternyata akun guru BK, backend menolaknya dan
      // mengarahkan pesan supaya pakai /guru-bk/login.
      await login({ ...form, expected_role: 'siswa' });
      router.push('/game');
    } catch (err) {
      setError(err.message || 'Gagal login. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async ({ credential }) => {
    requestAppFullscreen();
    setError('');
    setLoading(true);
    try {
      await googleLogin({ credential });
      router.push('/game');
    } catch (err) {
      setError(err.message || 'Gagal login dengan Google.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Masuk"
      subtitle="Lanjutkan perjalanan Nawasena Dara-mu."
      footer={
        <>
          Belum punya akun?{' '}
          <Link href="/register" className="auth-link">
            Daftar di sini
          </Link>
        </>
      }
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <AuthMessage type="error">{error}</AuthMessage>

        <AuthInput
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="kamu@email.com"
          required
          value={form.email}
          onChange={update('email')}
        />

        <AuthInput
          id="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          required
          value={form.password}
          onChange={update('password')}
        />

        <div className="auth-links-row" style={{ justifyContent: 'flex-end' }}>
          <Link href="/forgot-password" className="auth-link">
            Lupa password?
          </Link>
        </div>

        <AuthButton type="submit" loading={loading}>
          Masuk
        </AuthButton>

        <div className="auth-divider">atau</div>

        <GoogleAuthButton role="siswa" onSuccess={handleGoogle} onError={setError} />
      </form>
    </AuthShell>
  );
}
