import './globals.css';
import Providers from './providers';

export const metadata = {
  title: 'Nawasena Dara',
  description:
    'Narrative-Driven Learning Game untuk edukasi dan pendampingan pencegahan kekerasan pada remaja putri.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  // viewport-fit=cover: supaya konten (canvas game) boleh menggambar
  // sampai ke area notch/safe-area di HP, bukan dibatasi cuma di area
  // "aman" — perlu untuk pengalaman fullscreen edge-to-edge.
  viewportFit: 'cover',
  themeColor: '#1a1a2e',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <head>
        {/* Pixel fonts: Jersey 15 untuk title/logo, Pixelify Sans untuk tombol & UI pixel-style */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Jersey+15&family=Pixelify+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />

        {/* PWA manifest: memungkinkan game di-"Add to Home Screen" dan
            dibuka dalam mode fullscreen tanpa address bar/tab browser —
            ini satu-satunya cara reliable untuk hilangkan UI Safari di
            iPhone, karena Fullscreen API JS tidak didukung di Safari iOS. */}
        <link rel="manifest" href="/manifest.json" />

        {/* iOS: jadikan halaman berjalan standalone (tanpa address bar)
            begitu dibuka dari ikon yang ditambahkan ke Home Screen. */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Nawasena Dara" />

        {/* Android/Chrome: dukungan PWA standalone yang setara. */}
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
