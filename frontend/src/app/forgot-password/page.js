'use client';

import { useState } from 'react';
import Link from 'next/link';
import AuthShell from '@/features/auth/components/AuthShell';
import AuthInput from '@/features/auth/components/AuthInput';
import AuthButton from '@/features/auth/components/AuthButton';
import AuthMessage from '@/features/auth/components/AuthMessage';
import { useAuth } from '@/features/auth/context/AuthContext';

export default function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await forgotPassword(email);
      // Backend selalu balas pesan generik (anti email enumeration) —
      // jadi UI di sini pun selalu menampilkan status "terkirim",
      // terlepas dari apakah email itu benar-benar terdaftar.
      setSent(true);
    } catch (err) {
      setError(err.message || 'Gagal mengirim link reset. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Lupa Password"
      subtitle="Masukkan email akunmu, kami kirimkan link untuk reset password."
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
      {sent ? (
        <AuthMessage type="success">
          Jika email terdaftar, link reset password sudah kami kirimkan. Cek juga folder
          spam ya.
        </AuthMessage>
      ) : (
        <form className="auth-form" onSubmit={handleSubmit}>
          <AuthMessage type="error">{error}</AuthMessage>

          <AuthInput
            id="email"
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="kamu@email.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <AuthButton type="submit" loading={loading}>
            Kirim Link Reset
          </AuthButton>
        </form>
      )}
    </AuthShell>
  );
}
