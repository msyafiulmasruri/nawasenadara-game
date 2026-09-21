// Resolusi dasar "dunia" game — TIDAK berubah walau layar di-resize atau
// browser di-zoom. Mode scale ENVELOP (lihat PhaserGame.jsx) membesarkan
// canvas supaya selalu menutupi seluruh viewport tanpa area kosong,
// sementara koordinat di dalam game tetap konsisten di angka ini.
// Elemen UI diposisikan ke area yang benar-benar terlihat (visible bounds)
// supaya tidak terpotong di layar apa pun — desktop, laptop, atau mobile.
export const WORLD_WIDTH = 1280;
export const WORLD_HEIGHT = 720;

// Lebar level yang bisa di-scroll untuk scene gameplay (Episode1Scene,
// PlaceholderEpisodeScene). Ini BEDA dari WORLD_WIDTH di atas —
// WORLD_WIDTH/HEIGHT itu ukuran "jendela kamera" (viewport referensi
// yang dipakai mode ENVELOP), sedangkan LEVEL_WIDTH itu total panjang
// dunia yang bisa dijelajahi karakter secara horizontal. Kamera akan
// mengikuti (follow) karakter berjalan di sepanjang LEVEL_WIDTH ini,
// dan background di-render sebagai tile berulang (bukan satu gambar
// statis) supaya selalu penuh menutupi layar di sepanjang perjalanan,
// termasuk saat orientasi portrait yang rasio aspeknya jauh dari 16:9.
export const LEVEL_WIDTH = WORLD_WIDTH * 2.5;

// Jarak aman dari tepi level (spawn awal & titik selesai episode) supaya
// karakter tidak berdiri TEPAT di ujung dunia — karena kalau tepat di
// ujung, kamera terpaksa berhenti (clamp) di titik itu juga, dan mode
// ENVELOP yang memotong sisi kiri/kanan di layar portrait jadi ikut
// memotong karakter yang berdiri persis di posisi clamp tersebut.
export const LEVEL_EDGE_MARGIN = 180;

// Tinggi tampil (display height, sesudah setScale) karakter pemain di
// semua scene gameplay. Dipisah jadi konstanta sendiri (bukan angka
// mentah "240" ditulis ulang di beberapa tempat) supaya kode yang
// butuh mencocokkan tinggi NPC ke tinggi pemain (Episode1Scene._createNpc)
// tidak perlu bergantung pada this.player yang BELUM tentu sudah dibuat
// di titik itu (createBackground() -> _createNpc() dipanggil SEBELUM
// this.player dibuat di create()) — sebelumnya ini menyebabkan NPC
// memakai fallback 200px yang salah, bukan 240px yang sesungguhnya.
export const PLAYER_DISPLAY_HEIGHT = 240;

