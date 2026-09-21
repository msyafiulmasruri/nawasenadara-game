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

// Halaman ini KHUSUS pendaftaran akun siswa (pemain). Guru BK punya
// portal terpisah di /guru-bk/register — lihat halaman itu untuk
// alasan lengkap kenapa dua portal ini dipisah, bukan cuma dibedakan
// lewat dropdown peran seperti sebelumnya.
export default function RegisterPage() {
  const router = useRouter();
  const { register, googleLogin } = useAuth();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const update = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    requestAppFullscreen();
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
      await register({
        name: form.name,
        email: form.email,
        password: form.password,
        role: 'siswa',
      });
      router.push('/game');
    } catch (err) {
      setError(err.message || 'Gagal mendaftar. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async ({ credential }) => {
    requestAppFullscreen();
    setError('');
    setLoading(true);
    try {
      await googleLogin({ credential, role: 'siswa' });
      router.push('/game');
    } catch (err) {
      setError(err.message || 'Gagal mendaftar dengan Google.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Daftar Akun"
      subtitle="Mulai episode pertamamu di Nawasena Dara."
      footer={
        <>
          Sudah punya akun?{' '}
          <Link href="/login" className="auth-link">
            Masuk di sini
          </Link>
          <br />
          Kamu guru BK?{' '}
          <Link href="/guru-bk/login" className="auth-link">
            Masuk ke dashboard guru BK
          </Link>
        </>
      }
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <AuthMessage type="error">{error}</AuthMessage>

        <AuthInput
          id="name"
          label="Nama Lengkap"
          type="text"
          autoComplete="name"
          placeholder="Nama kamu"
          required
          value={form.name}
          onChange={update('name')}
        />

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
          autoComplete="new-password"
          placeholder="Minimal 6 karakter"
          required
          value={form.password}
          onChange={update('password')}
        />

        <AuthInput
          id="confirmPassword"
          label="Konfirmasi Password"
          type="password"
          autoComplete="new-password"
          placeholder="Ulangi password"
          required
          value={form.confirmPassword}
          onChange={update('confirmPassword')}
        />

        <AuthButton type="submit" loading={loading}>
          Daftar
        </AuthButton>

        <div className="auth-divider">atau</div>

        <GoogleAuthButton role="siswa" onSuccess={handleGoogle} onError={setError} />
      </form>
    </AuthShell>
  );
}
