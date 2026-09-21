'use client';

import { GoogleLogin } from '@react-oauth/google';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

// GoogleLogin (flow default = 'implicit'? — TIDAK, default library ini
// adalah popup ID-token flow) mengembalikan `credentialResponse.credential`
// berupa Google ID TOKEN (JWT), persis apa yang diverifikasi backend
// lewat google-auth-library's verifyIdToken() di
// authentication-controller.js. Jangan diganti ke flow access_token —
// backend tidak dirancang untuk itu.
export default function GoogleAuthButton({ role, onSuccess, onError, label }) {
  if (!GOOGLE_CLIENT_ID) {
    return (
      <p className="auth-google-disabled">
        Login Google belum dikonfigurasi (isi NEXT_PUBLIC_GOOGLE_CLIENT_ID di .env.local).
      </p>
    );
  }

  return (
    <div className="auth-google-wrap">
      <GoogleLogin
        text={label || 'continue_with'}
        shape="pill"
        theme="filled_black"
        width="100%"
        onSuccess={(credentialResponse) => {
          if (!credentialResponse?.credential) {
            onError?.('Tidak menerima credential dari Google.');
            return;
          }
          onSuccess?.({ credential: credentialResponse.credential, role });
        }}
        onError={() => onError?.('Login dengan Google dibatalkan atau gagal.')}
      />
    </div>
  );
}
