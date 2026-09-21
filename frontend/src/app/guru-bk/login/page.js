'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthShell from '@/features/auth/components/AuthShell';
import AuthInput from '@/features/auth/components/AuthInput';
import AuthButton from '@/features/auth/components/AuthButton';
import AuthMessage from '@/features/auth/components/AuthMessage';
import { useAuth } from '@/features/auth/context/AuthContext';

// Portal login TERPISAH dari siswa (/login) sesuai permintaan: dua
// jenis akun (siswa & guru BK) tidak lagi dibedakan lewat dropdown
// peran di satu form yang sama, melainkan dua halaman/alamat berbeda
// sama sekali. Alasannya dua:
//  1. UX — guru BK tidak perlu melihat opsi "daftar sebagai siswa"
//     sama sekali, dan sebaliknya; masing-masing portal fokus ke
//     audiensnya.
//  2. Keamanan — backend (lihat authentication-controller.js `login`)
//     menolak login kalau `expected_role` yang dikirim portal ini
//     ('guru_bk') tidak cocok dengan role akun sebenarnya, walau
//     kredensialnya valid. Jadi akun siswa TIDAK BISA dipakai untuk
//     masuk ke sini meski tahu passwordnya, dan sebaliknya.
//
// CATATAN: halaman ini TIDAK melakukan requestAppFullscreen() /
// meng-redirect ke /game seperti portal siswa — guru BK diarahkan ke
// /guru-bk/dashboard (halaman web dashboard biasa, bukan ke canvas
// game Phaser).
export default function GuruBkLoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const update = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login({ ...form, expected_role: 'guru_bk' });
      router.push('/guru-bk/dashboard');
    } catch (err) {
      setError(err.message || 'Gagal login. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Login Guru BK"
      subtitle="Pantau progres & kondisi emosional siswa binaanmu."
      footer={
        <>
          Belum punya akun guru BK?{' '}
          <Link href="/guru-bk/register" className="auth-link">
            Daftar di sini
          </Link>
          <br />
          Kamu siswa?{' '}
          <Link href="/login" className="auth-link">
            Masuk ke halaman siswa
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
          placeholder="guru.bk@sekolah.sch.id"
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
          Masuk ke Dashboard
        </AuthButton>
      </form>
    </AuthShell>
  );
}
