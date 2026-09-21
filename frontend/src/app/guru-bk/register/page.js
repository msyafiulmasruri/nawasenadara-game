'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthShell from '@/features/auth/components/AuthShell';
import AuthInput from '@/features/auth/components/AuthInput';
import AuthButton from '@/features/auth/components/AuthButton';
import AuthMessage from '@/features/auth/components/AuthMessage';
import { useAuth } from '@/features/auth/context/AuthContext';

// CATATAN KEAMANAN / BATASAN SAAT INI: pendaftaran guru BK di sini
// masih TERBUKA (siapa pun bisa daftar dengan role guru_bk, sama
// seperti siswa mendaftar). Ini cukup untuk tahap uji coba pilot
// (proposal 3.2.3: satu sekolah mitra, tim yang tahu siapa saja guru
// BK-nya). Untuk produksi/multi-sekolah, TAMBAHKAN salah satu:
//  - kode undangan sekolah (mis. field tambahan yang divalidasi
//    backend terhadap tabel `schools`/`invite_codes`), atau
//  - alur persetujuan admin (akun guru_bk baru berstatus "pending"
//    sampai admin memverifikasi), atau
//  - dibuatkan manual oleh admin sekolah, tanpa self-registration.
// Ini murni keputusan produk/kebijakan sekolah, bukan keterbatasan
// teknis — skema database (kolom `is_verified` di tabel users) sudah
// siap dipakai untuk alur persetujuan itu kalau diperlukan nanti.
export default function GuruBkRegisterPage() {
  const router = useRouter();
  const { register } = useAuth();

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
        role: 'guru_bk',
      });
      router.push('/guru-bk/dashboard');
    } catch (err) {
      setError(err.message || 'Gagal mendaftar. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Daftar Akun Guru BK"
      subtitle="Buat akun untuk memantau progres siswa binaanmu."
      footer={
        <>
          Sudah punya akun guru BK?{' '}
          <Link href="/guru-bk/login" className="auth-link">
            Masuk di sini
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
          label="Email Sekolah"
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
      </form>
    </AuthShell>
  );
}
