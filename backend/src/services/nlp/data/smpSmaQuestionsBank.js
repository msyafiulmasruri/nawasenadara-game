/**
 * smpSmaQuestionsBank.js / smpSmaQuestions.js
 *
 * BANK 100 BUTIR SOAL TERKURASI LENGKAP KHUSUS REMAJA SMP (12-15 th) & SMA (15-18 th).
 * Mencakup 10 Domain Kasus Konkret Realitas Sekolah & Dunia Siber:
 * 1. Batasan Fisik, Otonomi Tubuh & Konsent (Soal 1 - 10)
 * 2. Privasi Digital, Medsos, Password & Perlindungan Akun (Soal 11 - 20)
 * 3. Catcalling & Pelecehan Verbal di Sekolah / Jalan (Soal 21 - 30)
 * 4. Gaslighting, Manipulasi & Label 'Baperan' (Soal 31 - 40)
 * 5. Cyberbullying, Doxxing & Teror Online (Soal 41 - 50)
 * 6. Tekanan Teman Sebaya (Peer Pressure) (Soal 51 - 60)
 * 7. Tindakan Bystander Aktif (Intervensi Teman Sebaya) (Soal 61 - 70)
 * 8. Relasi Kencan Remaja (Dating & Boundaries) (Soal 71 - 80)
 * 9. Bukti Digital, Pelaporan & Dokumentasi Aman (Soal 81 - 90)
 * 10. Akses Bantuan: Guru BK, TPPK & Hak Pemulihan (Soal 91 - 100)
 *
 * Kombinasi acak 10 soal dari 100 soal ini menghasilkan lebih dari 17 triliun
 * variasi kuis unik, menjamin gameplay Boss Runner tidak pernah monoton!
 */

export const SMP_SMA_QUESTIONS_BANK = [
  {
    "id": 1,
    "topic": "Batasan Fisik (Consent)",
    "targetAudience": "smp_sma",
    "question": "Seorang teman di sekolah tiba-tiba merangkul pundakmu saat berjalan di lorong hingga membuatmu merasa risih dan tidak nyaman. Tindakan terbaikmu adalah...",
    "options": [
      {
        "text": "A. Melepaskan rangkulan dengan tenang lalu berkata tegas: 'Tolong jangan rangkul, aku merasa tidak nyaman.'",
        "isCorrect": true
      },
      {
        "text": "B. Diam saja dan tersenyum terpaksa agar teman tersebut tidak tersinggung.",
        "isCorrect": false
      },
      {
        "text": "C. Membalas dengan memukul keras bahunya sambil berteriak marah.",
        "isCorrect": false
      }
    ],
    "explanation": "Tubuhmu adalah hak otonomi pribadimu. Menyampaikan batasan diri secara tenang dan tegas (asertif) adalah hak mutlak setiap siswa."
  },
  {
    "id": 2,
    "topic": "Batasan Fisik di Kantin",
    "targetAudience": "smp",
    "question": "Saat mengantre makanan di kantin sekolah, ada siswa di belakangmu yang sengaja menyentuh pinggangmu sambil tertawa bercanda. Responmu...",
    "options": [
      {
        "text": "A. Menghindar dan menegur langsung di tempat: 'Tolong jaga jarak dan jangan sentuh fisik!'",
        "isCorrect": true
      },
      {
        "text": "B. Berpindah antrean tanpa berkata apa-apa karena takut menimbulkan keributan.",
        "isCorrect": false
      },
      {
        "text": "C. Mengabaikannya karena menganggap sentuhan itu wajar dalam antrean ramai.",
        "isCorrect": false
      }
    ],
    "explanation": "Menegur sentuhan yang tidak diinginkan secara langsung dan jelas menunjukkan bahwa kamu memiliki batasan fisik yang wajib dihormati."
  },
  {
    "id": 3,
    "topic": "Privasi Ruang Pribadi",
    "targetAudience": "smp_sma",
    "question": "Teman sekelasmu bersikeras ingin memeriksa isi tas dan dompetmu tanpa izin dengan alasan 'kita kan teman dekat'. Sikapmu...",
    "options": [
      {
        "text": "A. Menarik tasmu dan berkata: 'Persahabatan kita penting, tapi tas dan dompetku adalah privasi yang tidak boleh dibuka.'",
        "isCorrect": true
      },
      {
        "text": "B. Membiarkannya menggeledah karena takut dicap pelit atau tidak setia kawan.",
        "isCorrect": false
      },
      {
        "text": "C. Menyerahkan tas sambil cemberut di pojokan kelas.",
        "isCorrect": false
      }
    ],
    "explanation": "Barang pribadi seperti tas dan dompet adalah zona privasi. Menolak penggeledahan tanpa izin adalah hak privasimu."
  },
  {
    "id": 4,
    "topic": "Consent Saat Olahraga",
    "targetAudience": "smp_sma",
    "question": "Saat jam pelajaran olahraga, seorang siswa mengambil foto tubuhmu dari sudut yang tidak pantas tanpa izinmu. Langkah yang tepat adalah...",
    "options": [
      {
        "text": "A. Mendekati siswa tersebut, minta dia menghapus fotonya seketika di hadapanmu, dan laporkan ke guru olahraga.",
        "isCorrect": true
      },
      {
        "text": "B. Menunggu sampai foto tersebut viral baru kemudian melapor.",
        "isCorrect": false
      },
      {
        "text": "C. Pura-pura tidak tahu agar tidak dianggap terlalu percaya diri.",
        "isCorrect": false
      }
    ],
    "explanation": "Mengambil foto tubuh orang lain tanpa izin di lingkungan sekolah adalah pelanggaran privasi fisik yang wajib ditindak segera."
  },
  {
    "id": 5,
    "topic": "Kerja Kelompok di Rumah Teman",
    "targetAudience": "sma",
    "question": "Saat belajar kelompok di rumah teman, salah satu anggota kelompok mengajakmu masuk ke kamar tertutup sendirian dengan alasan mencari buku. Sebaiknya...",
    "options": [
      {
        "text": "A. Menolak dengan sopan dan menyarankan: 'Kita cari bukunya bareng teman-teman lain di ruang tamu saja.'",
        "isCorrect": true
      },
      {
        "text": "B. Masuk begitu saja tanpa rasa curiga demi menghargai tuan rumah.",
        "isCorrect": false
      },
      {
        "text": "C. Langsung pulang ke rumah dan membatalkan tugas kelompok.",
        "isCorrect": false
      }
    ],
    "explanation": "Menjaga ruang belajar tetap terbuka dan transparan adalah bentuk kewaspadaan diri yang cerdas untuk mencegah situasi berisiko."
  },
  {
    "id": 6,
    "topic": "Batasan Menolak Pelukan",
    "targetAudience": "smp_sma",
    "question": "Seseorang yang baru kamu kenal di acara perkemahan sekolah tiba-tiba ingin memelukmu saat perpisahan. Respon terbaikmu adalah...",
    "options": [
      {
        "text": "A. Ulurkan tangan untuk bersalaman ramah sambil tersenyum: 'Senang kenal kamu, sampai jumpa lagi ya.'",
        "isCorrect": true
      },
      {
        "text": "B. Pasrah dipeluk meskipun merasa sangat canggung dan tidak nyaman.",
        "isCorrect": false
      },
      {
        "text": "C. Mendorongnya hingga jatuh tersungkur ke tanah.",
        "isCorrect": false
      }
    ],
    "explanation": "Mengganti pelukan dengan jabat tangan adalah cara diplomatis yang santun namun sangat tegas dalam menetapkan batasan kenyamanan fisik."
  },
  {
    "id": 7,
    "topic": "Sentuhan Senioritas",
    "targetAudience": "sma",
    "question": "Senior di ekstrakurikuler meremas pundak adik kelas sambil memberikan instruksi dengan nada mengintimidasi. Sikap adik kelas sebaiknya...",
    "options": [
      {
        "text": "A. Menggeser bahu mundur perlahan dan berkata santun: 'Saya paham instruksinya Kak, tapi mohon tidak meremas pundak saya.'",
        "isCorrect": true
      },
      {
        "text": "B. Menerimanya sebagai bagian dari 'latihan mental' tradisi ekskul.",
        "isCorrect": false
      },
      {
        "text": "C. Menangis histeris di depan anggota ekskul lainnya.",
        "isCorrect": false
      }
    ],
    "explanation": "Senioritas tidak memberi hak kepada siapa pun untuk melakukan sentuhan fisik bernada intimidatif. Penolakan sopan dan tegas memutus siklus perundungan."
  },
  {
    "id": 8,
    "topic": "Batasan Candaan Fisik",
    "targetAudience": "smp",
    "question": "Teman sebangkumu punya kebiasaan mencolek atau menarik tali tasmu berulang kali meskipun kamu sudah meminta berhenti. Tindakanmu...",
    "options": [
      {
        "text": "A. Tatap matanya dengan serius: 'Aku sudah minta kamu berhenti dua kali. Jika diulangi lagi, aku akan bicara ke wali kelas.'",
        "isCorrect": true
      },
      {
        "text": "B. Ikut tertawa agar dia merasa candaannya berhasil menghibur.",
        "isCorrect": false
      },
      {
        "text": "C. Membalas merusak buku pelajarannya secara diam-diam.",
        "isCorrect": false
      }
    ],
    "explanation": "Eskalasi asertif berjenjang (menegur batas -> memberi konsekuensi pelaporan) sangat efektif menghentikan candaan fisik yang melampaui batas."
  },
  {
    "id": 9,
    "topic": "Keamanan Ruang Ganti",
    "targetAudience": "smp_sma",
    "question": "Kamu melihat celah pintu ruang ganti sekolah sengaja dibuka sedikit oleh siswa lain yang mengintip ke dalam. Tindakan tepatmu...",
    "options": [
      {
        "text": "A. Segera tutup pintu dengan rapat, tegur pelaku dengan tegas di tempat, dan laporkan insiden ke pihak sekolah/guru piket.",
        "isCorrect": true
      },
      {
        "text": "B. Pura-pura tidak melihat agar tidak dicap ikut campur urusan orang lain.",
        "isCorrect": false
      },
      {
        "text": "C. Membiarkannya karena menganggap itu kenakalan remaja yang lumrah.",
        "isCorrect": false
      }
    ],
    "explanation": "Ruang ganti dan toilet adalah zona privasi sakral. Mengintip adalah pelanggaran privasi berat yang wajib dilaporkan untuk keamanan seluruh warga sekolah."
  },
  {
    "id": 10,
    "topic": "Hak Otonomi Tubuh",
    "targetAudience": "smp_sma",
    "question": "Apa arti prinsip dasar bahwa 'Setiap orang memiliki hak atas otonomi tubuhnya sendiri'?",
    "options": [
      {
        "text": "A. Tidak ada orang lain yang berhak menyentuh tubuhmu tanpa persetujuan (consent) yang kamu berikan secara sadar dan sukarela.",
        "isCorrect": true
      },
      {
        "text": "B. Bahwa kita bebas menyentuh siapa pun asalkan sedang dalam suasana bercanda.",
        "isCorrect": false
      },
      {
        "text": "C. Bahwa batas kenyamanan fisik ditentukan oleh orang lain yang lebih tua.",
        "isCorrect": false
      }
    ],
    "explanation": "Otonomi tubuh adalah fondasi hak asasi: hanya kamu yang memiliki wewenang penuh atas siapa yang boleh menyentuh tubuhmu."
  },
  {
    "id": 11,
    "topic": "Privasi Password Akun",
    "targetAudience": "smp_sma",
    "question": "Teman dekatmu meminta password akun TikTok/Instagram-mu untuk membuktikan bahwa kalian tidak saling merahasiakan apa pun. Sikapmu...",
    "options": [
      {
        "text": "A. Menolak tegas: 'Persahabatan kita berharga, tapi password adalah kunci keamanan pribadi yang tidak boleh dibagikan ke siapa pun.'",
        "isCorrect": true
      },
      {
        "text": "B. Memberikan password dengan pesan agar jangan membaca chat pribadi.",
        "isCorrect": false
      },
      {
        "text": "C. Menukar password akunmu dengan akun miliknya agar impas.",
        "isCorrect": false
      }
    ],
    "explanation": "Password akun adalah kredensial identitas digital pribadi. Persahabatan sejati dibangun di atas kepercayaan, bukan kepatuhan membagi privasi."
  },
  {
    "id": 12,
    "topic": "Stiker WhatsApp Tanpa Izin",
    "targetAudience": "smp_sma",
    "question": "Foto wajahmu saat sedang tertidur di kelas dijadikan stiker WhatsApp oleh teman sekelas dan disebarkan ke grup angkatan. Respon terbaikmu...",
    "options": [
      {
        "text": "A. Minta dengan tegas di grup/japri pembuatnya untuk menghapus stiker tersebut karena itu privasimu, dan lapor wali kelas jika diabaikan.",
        "isCorrect": true
      },
      {
        "text": "B. Ikut menertawakannya agar tidak dijuluki kaku atau gampang baper.",
        "isCorrect": false
      },
      {
        "text": "C. Membalas dendam dengan membuat stiker aib teman tersebut lebih parah.",
        "isCorrect": false
      }
    ],
    "explanation": "Menggunakan wajah orang lain sebagai lelucon tanpa izin melanggar hak privasi citra diri. Menegur dengan tenang menetapkan batasan digital sehat."
  },
  {
    "id": 13,
    "topic": "Pinjam HP Buka Galeri",
    "targetAudience": "smp_sma",
    "question": "Temanmu meminjam ponselmu untuk menelepon orang tuanya, tetapi dia malah membuka galeri foto dan chat pribadimu. Kamu harus...",
    "options": [
      {
        "text": "A. Mengambil ponselmu kembali dengan tenang: 'Aku pinjamkan untuk telepon, bukan untuk membuka galeri dan chat pribadiku.'",
        "isCorrect": true
      },
      {
        "text": "B. Membiarkannya karena merasa tidak enak hati menegur teman sendiri.",
        "isCorrect": false
      },
      {
        "text": "C. Langsung memusuhi dan memblokir kontaknya tanpa penjelasan.",
        "isCorrect": false
      }
    ],
    "explanation": "Menegakkan batas penggunaan saat meminjamkan barang pribadi adalah tindakan asertif yang melindungi batas privasimu."
  },
  {
    "id": 14,
    "topic": "Unggah Foto ke Medsos",
    "targetAudience": "smp_sma",
    "question": "Setelah foto bersama, seorang teman ingin mengunggah foto di mana kamu merasa posisimu kurang pantas atau canggung. Tindakanmu...",
    "options": [
      {
        "text": "A. Katakan jujur: 'Tolong jangan unggah foto yang ini ya, pakai foto lain yang kita sama-sama nyaman.'",
        "isCorrect": true
      },
      {
        "text": "B. Diam saja dan berharap tidak ada kenalan yang melihat unggahan tersebut.",
        "isCorrect": false
      },
      {
        "text": "C. Melaporkan akun teman tersebut ke kepolisian secara berlebihan.",
        "isCorrect": false
      }
    ],
    "explanation": "Etika digital mengharuskan persetujuan semua pihak sebelum foto bersama diunggah ke ruang publik media sosial."
  },
  {
    "id": 15,
    "topic": "Live Location 24 Jam",
    "targetAudience": "sma",
    "question": "Teman satu tongkrongan atau pacar menuntutmu membagikan live location 24 jam dengan alasan 'biar terbukti nggak bohong'. Ini adalah...",
    "options": [
      {
        "text": "A. Perilaku kontrol berlebihan (controlling) yang melanggar otonomi dan privasi gerak pribadimu.",
        "isCorrect": true
      },
      {
        "text": "B. Bukti perhatian romantis yang patut disyukuri dan dituruti.",
        "isCorrect": false
      },
      {
        "text": "C. Kewajiban wajar dalam relasi remaja masa kini.",
        "isCorrect": false
      }
    ],
    "explanation": "Menuntut pelacakan lokasi terus-menerus bukanlah bentuk kasih sayang, melainkan manipulasi kontrol yang tidak sehat."
  },
  {
    "id": 16,
    "topic": "Autentikasi Dua Faktor (2FA)",
    "targetAudience": "smp_sma",
    "question": "Mengapa mengaktifkan Autentikasi Dua Faktor (2FA) pada semua akun medsos dan email sangat penting bagi pelajar?",
    "options": [
      {
        "text": "A. Mencegah akun dibajak oleh pihak yang mengetahui password kita melalui verifikasi kode ke ponsel pribadi.",
        "isCorrect": true
      },
      {
        "text": "B. Agar akun medsos otomatis mendapat lencana centang biru.",
        "isCorrect": false
      },
      {
        "text": "C. Mempercepat koneksi internet saat bermain game online.",
        "isCorrect": false
      }
    ],
    "explanation": "2FA adalah benteng keamanan siber terkuat untuk melindungi identitas dan data pribadi dari pembajakan."
  },
  {
    "id": 17,
    "topic": "Merekam Guru / Siswa Diam-diam",
    "targetAudience": "smp_sma",
    "question": "Temanmu merekam guru yang sedang marah di kelas secara diam-diam untuk dijadikan konten TikTok lelucon. Sikapmu...",
    "options": [
      {
        "text": "A. Ingatkan temanmu bahwa merekam dan menyebarkan video warga sekolah tanpa izin melanggar etika dan UU ITE.",
        "isCorrect": true
      },
      {
        "text": "B. Ikut memberikan ide caption lucu agar videonya masuk FYP.",
        "isCorrect": false
      },
      {
        "text": "C. Meminta bagian keuntungan jika videonya viral.",
        "isCorrect": false
      }
    ],
    "explanation": "Merekam diam-diam di ruang kelas tanpa izin melanggar etika institusi pendidikan dan berpotensi jerat hukum pencemaran nama baik."
  },
  {
    "id": 18,
    "topic": "Jejak Digital Foto Pribadi",
    "targetAudience": "sma",
    "question": "Apa yang dimaksud dengan 'Jejak Digital Bersifat Abadi (Digital Footprint)' di internet?",
    "options": [
      {
        "text": "A. Sekali foto/pesan diunggah ke internet, data tersebut bisa disimpan atau disebarkan orang lain meskipun sudah kita hapus.",
        "isCorrect": true
      },
      {
        "text": "B. Bahwa semua data di internet akan hilang otomatis dalam waktu 24 jam.",
        "isCorrect": false
      },
      {
        "text": "C. Bahwa foto yang diunggah hanya bisa dilihat oleh teman terdekat.",
        "isCorrect": false
      }
    ],
    "explanation": "Memahami sifat abadi jejak digital mendorong kehati-hatian tinggi sebelum mengirimkan materi pribadi di ruang siber."
  },
  {
    "id": 19,
    "topic": "Fitur Close Friends",
    "targetAudience": "smp_sma",
    "question": "Apakah aman membagikan curhatan masalah pribadi yang sensitif di fitur Close Friends Instagram?",
    "options": [
      {
        "text": "A. Belum tentu aman, karena anggota Close Friends masih bisa mengambil tangkapan layar (screenshot) dan menyebarkannya.",
        "isCorrect": true
      },
      {
        "text": "B. Sangat aman 100% karena sistem Instagram melarang tangkapan layar.",
        "isCorrect": false
      },
      {
        "text": "C. Aman selama kita berteman akrab dengan semua orang di daftar tersebut.",
        "isCorrect": false
      }
    ],
    "explanation": "Tangkapan layar dari orang terdekat sering menjadi sumber kebocoran data pribadi. Jangan unggah materi berisiko ke ruang digital mana pun."
  },
  {
    "id": 20,
    "topic": "Akun Bersama / Share Account",
    "targetAudience": "smp_sma",
    "question": "Bolehkah menggunakan satu akun email bersama untuk banyak orang di lingkaran pertemanan?",
    "options": [
      {
        "text": "A. Sebaiknya hindari, karena semua orang memiliki akses ke pesan masuk, riwayat, dan pemulihan akun pribadimu.",
        "isCorrect": true
      },
      {
        "text": "B. Boleh dan sangat dianjurkan untuk menghemat kuota internet.",
        "isCorrect": false
      },
      {
        "text": "C. Wajib dilakukan sebagai bukti kekompakan kelompok belajar.",
        "isCorrect": false
      }
    ],
    "explanation": "Setiap individu wajib memiliki akun digital terpisah untuk menjaga akuntabilitas keamanan data masing-masing."
  },
  {
    "id": 21,
    "topic": "Catcalling di Depan Gerbang",
    "targetAudience": "smp_sma",
    "question": "Saat kamu berjalan melewati sekelompok remaja di warung depan sekolah, mereka bersiul dan berkata: 'Cewek manis, sombong amat sih!'. Ini adalah...",
    "options": [
      {
        "text": "A. Pelecehan verbal (catcalling) di ruang publik yang melanggar rasa aman dan kehormatan seseorang.",
        "isCorrect": true
      },
      {
        "text": "B. Bentuk keramahan warga sekitar yang harus disambut dengan senyuman.",
        "isCorrect": false
      },
      {
        "text": "C. Tanda bahwa pakaianmu kurang tertutup.",
        "isCorrect": false
      }
    ],
    "explanation": "Catcalling adalah pelecehan verbal di ruang publik. Tanggung jawab dan kesalahan 100% berada pada pihak pelaku, bukan korban."
  },
  {
    "id": 22,
    "topic": "Komentar Bentuk Tubuh di Kelas",
    "targetAudience": "smp_sma",
    "question": "Seorang teman sekelas mengomentari bentuk fisik tubuhmu dengan nada sensual di depan teman-teman lainnya. Respon asertifmu adalah...",
    "options": [
      {
        "text": "A. Tatap dengan tenang dan tegur tegas: 'Komentarmu tidak pantas dan melecehkan, tolong jaga bicaramu!'",
        "isCorrect": true
      },
      {
        "text": "B. Tertawa terpaksa agar suasana kelas tidak canggung.",
        "isCorrect": false
      },
      {
        "text": "C. Merasa bersalah dan bersembunyi di toilet sepanjang jam istirahat.",
        "isCorrect": false
      }
    ],
    "explanation": "Menegur komentar fisik secara terbuka mematahkan normalisasi pelecehan verbal dan menunjukkan batas harga diri yang tidak boleh dilanggar."
  },
  {
    "id": 23,
    "topic": "Panggilan Sensual Berkedok Canda",
    "targetAudience": "smp_sma",
    "question": "Teman satu angkatan sering memanggilmu dengan sebutan fisik yang tidak pantas, lalu berkilah 'kan cuma panggilan akrab'. Kamu harus...",
    "options": [
      {
        "text": "A. Nyatakan dengan tegas: 'Aku punya nama, panggil aku dengan namaku. Aku tidak suka panggilan itu.'",
        "isCorrect": true
      },
      {
        "text": "B. Menerima panggilan itu agar dianggap asyik dan tidak kaku.",
        "isCorrect": false
      },
      {
        "text": "C. Membalas memanggilnya dengan kata-kata kotor kebun binatang.",
        "isCorrect": false
      }
    ],
    "explanation": "Panggilan akrab harus disepakati kedua belah pihak. Jika membuatmu risih, kamu berhak menolak dan meminta dipanggil dengan nama aslimu."
  },
  {
    "id": 24,
    "topic": "Catcalling di Angkutan Umum",
    "targetAudience": "smp_sma",
    "question": "Di dalam angkot pulang sekolah, ada penumpang yang terus menatap dan melontarkan rayuan mengganggu kepadamu. Langkah teramanmu...",
    "options": [
      {
        "text": "A. Geser mendekat ke penumpang lain/sopir, katakan dengan suara lantang: 'Pak/Bu, tolong jangan ganggu saya!', dan turun di tempat ramai.",
        "isCorrect": true
      },
      {
        "text": "B. Diam saja dan menunduk ketakutan sampai rumah.",
        "isCorrect": false
      },
      {
        "text": "C. Menuruti ajakan mengobrolnya agar dia tidak marah.",
        "isCorrect": false
      }
    ],
    "explanation": "Mencari dukungan publik dan berbicara dengan suara lantang adalah taktik perlindungan diri yang efektif untuk menghentikan pelaku di tempat umum."
  },
  {
    "id": 25,
    "topic": "Menegur Teman yang Catcalling",
    "targetAudience": "smp_sma",
    "question": "Kamu sedang berjalan bersama teman-temanmu, lalu salah satu temanmu bersiul menggoda siswi lain yang lewat. Tindakan terbaikmu adalah...",
    "options": [
      {
        "text": "A. Tegur temanmu langsung: 'Bro, nggak usah siul-siul gitu, itu nggak sopan dan bikin orang lain risih.'",
        "isCorrect": true
      },
      {
        "text": "B. Ikut bersiul agar solidaritas kelompok tetap terjaga.",
        "isCorrect": false
      },
      {
        "text": "C. Pura-pura tidak dengar dan tertawa kecil.",
        "isCorrect": false
      }
    ],
    "explanation": "Menegur teman sendiri adalah bentuk integritas moral tertinggi untuk mencegah budaya pelecehan terus dinormalisasi di lingkungan sebaya."
  },
  {
    "id": 26,
    "topic": "Pelecehan Saat Olahraga",
    "targetAudience": "smp_sma",
    "question": "Saat siswi sedang berolahraga di lapangan, beberapa siswa di tribun melontarkan yel-yel bernada seksual. Perilaku siswa tersebut...",
    "options": [
      {
        "text": "A. Pelanggaran tata tertib sekolah berupa pelecehan verbal yang wajib dilaporkan ke guru piket/pembina OSIS.",
        "isCorrect": true
      },
      {
        "text": "B. Semangat supporter olahraga yang wajar dan menghibur.",
        "isCorrect": false
      },
      {
        "text": "C. Hak kebebasan berekspresi di lapangan terbuka.",
        "isCorrect": false
      }
    ],
    "explanation": "Yel-yel bernada seksual merusak lingkungan belajar yang aman dan inklusif. Tindakan tegas dari sekolah wajib ditegakkan."
  },
  {
    "id": 27,
    "topic": "Sexist Joke Saat Presentasi",
    "targetAudience": "sma",
    "question": "Saat kamu maju presentasi di depan kelas, seorang siswa menyela: 'Perempuan mah nggak usah pinter-pinter, yang penting dandan cantik'. Sikapmu...",
    "options": [
      {
        "text": "A. Jawab dengan tenang dan cerdas: 'Kecerdasan dan kesempatan belajar adalah hak setara semua orang tanpa memandang gender. Mari kita fokus ke materi.'",
        "isCorrect": true
      },
      {
        "text": "B. Berhenti presentasi dan menangis di pojokan kelas.",
        "isCorrect": false
      },
      {
        "text": "C. Membalas menghina latar belakang keluarga siswa tersebut.",
        "isCorrect": false
      }
    ],
    "explanation": "Menjawab stereotip seksis dengan argumen intelektual dan kepala dingin mempertegas kompetensimu sekaligus mendidik audiens kelas."
  },
  {
    "id": 28,
    "topic": "Beda Pujian vs Catcalling",
    "targetAudience": "smp_sma",
    "question": "Apa perbedaan mendasar antara pujian yang tulus dan santun dengan pelecehan verbal (catcalling)?",
    "options": [
      {
        "text": "A. Pujian menghormati batasan, disampaikan santun tanpa nuansa seksual, sedangkan catcalling merendahkan dan membuat target merasa terancam.",
        "isCorrect": true
      },
      {
        "text": "B. Tidak ada bedanya, semua komentar verbal adalah pujian.",
        "isCorrect": false
      },
      {
        "text": "C. Catcalling hanya berlaku jika dilakukan oleh orang yang tidak kita kenal.",
        "isCorrect": false
      }
    ],
    "explanation": "Kunci pembeda adalah rasa hormat dan persetujuan. Jika komentar membuat target merasa terobjektifikasi atau terancam, itu adalah pelecehan."
  },
  {
    "id": 29,
    "topic": "Pakaian Bukan Alasan Pelecehan",
    "targetAudience": "smp_sma",
    "question": "Apakah gaya berpakaian seseorang bisa dijadikan pembenaran bagi pelaku untuk melakukan catcalling atau pelecehan?",
    "options": [
      {
        "text": "A. TIDAK PERNAH. Tanggung jawab atas pelecehan 100% berada pada pikiran dan tindakan pelaku, bukan pada pakaian korban.",
        "isCorrect": true
      },
      {
        "text": "B. Ya, pakaian korban adalah faktor utama penyebab terjadinya pelecehan.",
        "isCorrect": false
      },
      {
        "text": "C. Tergantung apakah kejadian terjadi di siang hari atau malam hari.",
        "isCorrect": false
      }
    ],
    "explanation": "Menyalahkan pakaian korban (victim blaming) adalah mitos keliru. Setiap orang berhak atas rasa aman tanpa syarat apa pun."
  },
  {
    "id": 30,
    "topic": "Koridor Sekolah yang Aman",
    "targetAudience": "smp_sma",
    "question": "Bagaimana cara mewujudkan koridor sekolah yang bebas dari catcalling dan rasa takut bagi seluruh siswa?",
    "options": [
      {
        "text": "A. Menolak menormalisasi siulan/candaan seksual, berani menegur pelaku, dan melaporkan kejadian berulang ke Satgas TPPK/Guru BK.",
        "isCorrect": true
      },
      {
        "text": "B. Meminta siswa perempuan untuk tidak melewati koridor tertentu.",
        "isCorrect": false
      },
      {
        "text": "C. Menghimbau siswa untuk memakai headset setiap kali berjalan di lorong.",
        "isCorrect": false
      }
    ],
    "explanation": "Sekolah yang aman terwujud ketika seluruh warga sekolah aktif menolak budaya pelecehan dan melindungi hak rasa aman bersama."
  },
  {
    "id": 31,
    "topic": "Label Baperan / Cuma Bercanda",
    "targetAudience": "smp_sma",
    "question": "Saat kamu menegur teman yang melontarkan lelucon menghina, dia membalas: 'Dih, gitu aja marah! Baperan amat sih lo!'. Taktik ini adalah...",
    "options": [
      {
        "text": "A. Gaslighting, yaitu memutarbalikkan situasi agar korban meragukan validitas perasaannya sendiri dan merasa bersalah.",
        "isCorrect": true
      },
      {
        "text": "B. Kritik membangun agar mentalmu lebih tangguh menghadapi dunia.",
        "isCorrect": false
      },
      {
        "text": "C. Tanda bahwa kamu memang orang yang kaku dan tidak bisa diajak berteman.",
        "isCorrect": false
      }
    ],
    "explanation": "Gaslighting bertujuan melempar rasa bersalah ke korban. Jangan biarkan orang lain mendikte atau membatalkan perasaan tidak nyamanmu."
  },
  {
    "id": 32,
    "topic": "Mempertahankan Validitas Perasaan",
    "targetAudience": "smp_sma",
    "question": "Bagaimana respon terbaik saat seseorang menuduhmu 'baperan' setelah kamu menetapkan batasan yang tegas?",
    "options": [
      {
        "text": "A. Tetap tenang dan jawab tegas: 'Ini bukan soal baper, ini soal batasanku. Candaan yang menyakiti orang lain bukan candaan yang sehat.'",
        "isCorrect": true
      },
      {
        "text": "B. Meminta maaf kepada pelaku karena sudah membuat suasana menjadi canggung.",
        "isCorrect": false
      },
      {
        "text": "C. Menelan amarah dalam hati dan pura-pura tertawa.",
        "isCorrect": false
      }
    ],
    "explanation": "Menegaskan bahwa batas kenyamananmu adalah fakta objektif membantu mematahkan manipulasi gaslighting dengan kepala dingin."
  },
  {
    "id": 33,
    "topic": "Taktik Guilt Tripping",
    "targetAudience": "smp_sma",
    "question": "Sahabatmu merajuk dan berkata: 'Kalau kamu benar-benar sahabatku, kamu pasti mau ngerjain tugasku!'. Perilaku ini disebut...",
    "options": [
      {
        "text": "A. Guilt Tripping (memanipulasi rasa bersalah untuk memaksa orang lain menuruti keinginan yang tidak adil).",
        "isCorrect": true
      },
      {
        "text": "B. Ujian persahabatan sejati yang harus diperjuangkan.",
        "isCorrect": false
      },
      {
        "text": "C. Tanda kasih sayang yang mendalam.",
        "isCorrect": false
      }
    ],
    "explanation": "Persahabatan sejati tidak memeras rasa bersalah untuk memanfaatkan teman demi keuntungan pribadi."
  },
  {
    "id": 34,
    "topic": "Playing Victim oleh Perundung",
    "targetAudience": "smp_sma",
    "question": "Saat kamu melapor ke guru tentang perundungan yang kamu alami, pelaku menangis di depan guru dan mengaku bahwa dialah yang menjadi korban. Kamu harus...",
    "options": [
      {
        "text": "A. Tetap tenang, sajikan kronologi kejadian secara runtut beserta bukti chat/saksi mata tanpa terpancing emosi.",
        "isCorrect": true
      },
      {
        "text": "B. Menyerah dan mencabut laporan karena takut guru lebih percaya tangisan pelaku.",
        "isCorrect": false
      },
      {
        "text": "C. Ikut menangis lebih keras untuk mencari simpati guru.",
        "isCorrect": false
      }
    ],
    "explanation": "Data fakta, kronologi objektif, dan saksi mata selalu lebih kuat daripada manipulasi air mata palsu (playing victim)."
  },
  {
    "id": 35,
    "topic": "Dalih Tradisi Sekolah",
    "targetAudience": "sma",
    "question": "Senior berkata: 'Dulu kami juga dibentak-bentak dan disuruh-suruh, jadi kalian harus terima tradisi ini'. Sikapmu...",
    "options": [
      {
        "text": "A. Menyadari bahwa tradisi kekerasan masa lalu tidak boleh diwariskan, dan berani menolak perpeloncoan yang tidak mendidik.",
        "isCorrect": true
      },
      {
        "text": "B. Menuruti semua perlakuan tersebut demi mendapatkan rasa hormat senior.",
        "isCorrect": false
      },
      {
        "text": "C. Berniat membalas dendam hal yang sama ke adik kelas tahun depan.",
        "isCorrect": false
      }
    ],
    "explanation": "Kekerasan tidak menjadi benar hanya karena sudah berlangsung lama. Memutus rantai tradisi keliru adalah tanda kedewasaan generasi baru."
  },
  {
    "id": 36,
    "topic": "Manipulasi Memutar Balik Fakta",
    "targetAudience": "smp_sma",
    "question": "Seorang teman meminjam uangmu lalu saat ditagih dia menyebarkan gosip ke kelas bahwa kamu rentenir yang kejam. Langkahmu...",
    "options": [
      {
        "text": "A. Jelaskan fakta yang sebenarnya secara tenang kepada teman yang bertanya, dan minta mediasi wali kelas jika perlu.",
        "isCorrect": true
      },
      {
        "text": "B. Ikhlaskan saja uangmu dan mengurung diri karena malu.",
        "isCorrect": false
      },
      {
        "text": "C. Menyebarkan fitnah balasan yang lebih kejam di media sosial.",
        "isCorrect": false
      }
    ],
    "explanation": "Klarifikasi tenang berbasis bukti dan mediasi pihak ketiga (guru/wali kelas) membatalkan fitnah manipulatif secara profesional."
  },
  {
    "id": 37,
    "topic": "Menolak Permintaan Maaf Palsu",
    "targetAudience": "smp_sma",
    "question": "Seseorang meminta maaf setelah merendahkanmu, tetapi berkata: 'Ya udah aku minta maaf, tapi kamu juga salah sih kenapa manja banget'. Ini adalah...",
    "options": [
      {
        "text": "A. Permintaan maaf bersyarat (non-apology) yang masih berusaha menyalahkan korban.",
        "isCorrect": true
      },
      {
        "text": "B. Permintaan maaf tulus yang wajib diterima dengan lapang dada.",
        "isCorrect": false
      },
      {
        "text": "C. Bukti bahwa pelaku sudah sangat menyadari kesalahannya.",
        "isCorrect": false
      }
    ],
    "explanation": "Permintaan maaf sejati mengakui kesalahan 100% tanpa embel-embel 'tapi kamu juga salah' yang membalikkan tuduhan."
  },
  {
    "id": 38,
    "topic": "Menghadapi Silent Treatment",
    "targetAudience": "sma",
    "question": "Teman satu sirkel mendadak mendiamkanmu (silent treatment) tanpa alasan jelas selama seminggu untuk membuatmu merasa bersalah. Sikapmu...",
    "options": [
      {
        "text": "A. Tanyakan sekali secara terbuka dan dewasa: 'Jika ada masalah, mari kita bicarakan baik-baik. Tapi jika kamu memilih diam, aku akan fokus pada aktivitasku.'",
        "isCorrect": true
      },
      {
        "text": "B. Mengemis permohonan maaf berkali-kali meskipun tidak tahu apa salahmu.",
        "isCorrect": false
      },
      {
        "text": "C. Ikut mendiamkannya selamanya tanpa pernah berkomunikasi lagi.",
        "isCorrect": false
      }
    ],
    "explanation": "Silent treatment adalah taktik pasif-agresif. Mengajak komunikasi terbuka tanpa mengemis mematahkan kontrol manipulatif tersebut."
  },
  {
    "id": 39,
    "topic": "Menjaga Batasan Diri Tanpa Debat",
    "targetAudience": "smp_sma",
    "question": "Ketika orang yang manipulatif terus mendebat batasan yang sudah kamu buat, teknik komunikasi terbaik adalah...",
    "options": [
      {
        "text": "A. Broken Record Technique: ulangi kalimat batasanmu dengan nada datar dan tenang tanpa ikut terseret ke dalam debat kusir.",
        "isCorrect": true
      },
      {
        "text": "B. Ikut berteriak membentak sampai lawan bicara kehabisan suara.",
        "isCorrect": false
      },
      {
        "text": "C. Mengalah dan membiarkan batasanmu dilanggar demi mengakhiri debat.",
        "isCorrect": false
      }
    ],
    "explanation": "Teknik 'kaset rusak' (mengulang batasan dengan tenang) sangat efektif menghadapi orang manipulatif tanpa membuang energi berdebat."
  },
  {
    "id": 40,
    "topic": "Definisi Komunikasi Asertif",
    "targetAudience": "smp_sma",
    "question": "Apa perbedaan utama antara respon 'Pasif', 'Agresif', dan 'Asertif' saat menghadapi manipulasi?",
    "options": [
      {
        "text": "A. Pasif mengorbankan diri sendiri, Agresif menyerang hak orang lain, sedangkan Asertif membela hak diri secara tenang tanpa melanggar hak orang lain.",
        "isCorrect": true
      },
      {
        "text": "B. Asertif sama dengan agresif, yaitu membalas dengan kekerasan fisik.",
        "isCorrect": false
      },
      {
        "text": "C. Pasif adalah cara terbaik karena menghindari semua jenis konflik.",
        "isCorrect": false
      }
    ],
    "explanation": "Sikap asertif adalah titik emas kematangan emosional: tegas, jujur, tenang, dan menghargai diri sendiri serta orang lain."
  },
  {
    "id": 41,
    "topic": "Bahaya Doxxing",
    "targetAudience": "smp_sma",
    "question": "Seseorang menyebarkan nomor WhatsApp, alamat rumah, dan akun media sosial temanmu di X/Instagram agar diserang netizen. Tindakan ini disebut...",
    "options": [
      {
        "text": "A. Doxxing, yaitu penyebaran informasi identitas pribadi tanpa izin untuk tujuan teror dan intimidasi yang melanggar hukum.",
        "isCorrect": true
      },
      {
        "text": "B. Upaya keterbukaan informasi publik yang sah.",
        "isCorrect": false
      },
      {
        "text": "C. Kebebasan berpendapat di media sosial.",
        "isCorrect": false
      }
    ],
    "explanation": "Doxxing adalah kejahatan siber yang sangat berbahaya karena mengancam keselamatan fisik dan psikologis korban di dunia nyata."
  },
  {
    "id": 42,
    "topic": "Menfess Fitnah Sekolah",
    "targetAudience": "smp_sma",
    "question": "Akun anonim menfess sekolah mengunggah rumor palsu yang mencemarkan nama baik temanmu. Sikapmu sebagai teman adalah...",
    "options": [
      {
        "text": "A. Laporkan postingan tersebut ke admin menfess/platform, jangan ikut repost/komentar, dan beri dukungan moral kepada temanmu.",
        "isCorrect": true
      },
      {
        "text": "B. Ikut membagikan link postingan ke grup kelas untuk bahan gosip.",
        "isCorrect": false
      },
      {
        "text": "C. Mempercayai rumor tersebut begitu saja karena sudah diunggah di menfess.",
        "isCorrect": false
      }
    ],
    "explanation": "Tidak menjadi penyebar gosip (chain-breaker) dan melaporkan konten fitnah adalah wujud perlindungan digital antar teman sebaya."
  },
  {
    "id": 43,
    "topic": "Mengamankan Bukti Cyberbullying",
    "targetAudience": "smp_sma",
    "question": "Ketika kamu menerima pesan teks ancaman atau hujatan di media sosial, langkah pertama yang wajib kamu lakukan sebelum memblokir pelaku adalah...",
    "options": [
      {
        "text": "A. Mengambil tangkapan layar (screenshot) utuh mencakup nama akun pelaku, tanggal, jam, dan isi pesan sebagai bukti otentik.",
        "isCorrect": true
      },
      {
        "text": "B. Langsung menghapus chat dan mematikan ponsel karena takut.",
        "isCorrect": false
      },
      {
        "text": "C. Membalas pesan dengan kata-kata kotor penuh kemarahan.",
        "isCorrect": false
      }
    ],
    "explanation": "Tangkapan layar dengan informasi waktu dan identitas akun adalah dokumen bukti hukum paling penting saat melapor ke pihak berwenang."
  },
  {
    "id": 44,
    "topic": "Hujatan di Kolom Komentar",
    "targetAudience": "smp_sma",
    "question": "Kolom komentar postingan fotomu dipenuhi kata-kata hinaan fisik (body shaming) oleh beberapa akun. Tindakan paling tepat...",
    "options": [
      {
        "text": "A. Batasi/matikan kolom komentar, tangkap layar bukti, blokir akun pelaku, dan laporkan jika perundungan terus berlanjut.",
        "isCorrect": true
      },
      {
        "text": "B. Meladeni dan membalas komentar satu per satu sampai malam.",
        "isCorrect": false
      },
      {
        "text": "C. Menghapus akun dan merasa bahwa dirimu memang buruk rupa.",
        "isCorrect": false
      }
    ],
    "explanation": "Membatasi kolom komentar dan memblokir perundung memutus panggung mereka tanpa memberi mereka kepuasan melihat reaksimu."
  },
  {
    "id": 45,
    "topic": "Cyber-Raid / Mass Reporting",
    "targetAudience": "sma",
    "question": "Teman satu geng mengajakmu ikut menyerbu dan merundung akun media sosial siswa sekolah lain demi 'solidaritas geng'. Kamu harus...",
    "options": [
      {
        "text": "A. Menolak tegas: 'Aku tidak mau ikut perundungan online. Itu melanggar hukum dan membahayakan masa depan kita.'",
        "isCorrect": true
      },
      {
        "text": "B. Ikut merundung menggunakan akun palsu agar tidak ketahuan.",
        "isCorrect": false
      },
      {
        "text": "C. Mendukung dengan memberikan likes pada komentar jahat teman-temanmu.",
        "isCorrect": false
      }
    ],
    "explanation": "Solidaritas yang mengajak kejahatan siber adalah solidaritas beracun. Menolak ajakan tersebut menunjukkan keberanian moral sejati."
  },
  {
    "id": 46,
    "topic": "Prank Berbahaya di Medsos",
    "targetAudience": "smp_sma",
    "question": "Seseorang membuat konten prank menyiram air kotor atau mempermalukan siswa pendiam di sekolah demi konten viral. Hal ini merupakan...",
    "options": [
      {
        "text": "A. Perundungan fisik dan psikologis (bullying) berkedok lelucon yang melanggar hukum dan tata tertib sekolah.",
        "isCorrect": true
      },
      {
        "text": "B. Kreativitas konten digital yang patut diacungi jempol.",
        "isCorrect": false
      },
      {
        "text": "C. Hiburan wajar asalkan di akhir video diberi uang ganti rugi.",
        "isCorrect": false
      }
    ],
    "explanation": "Merendahkan martabat orang lain untuk kepentingan penonton di internet adalah bentuk perundungan berat yang tidak bisa dimaafkan dengan dalih prank."
  },
  {
    "id": 47,
    "topic": "Manipulasi Foto / Deepfake AI",
    "targetAudience": "sma",
    "question": "Jika kamu mengetahui ada oknum yang memanipulasi foto wajah siswi sekolah dengan AI untuk tujuan asusila/pornografi, langkah hukumnya...",
    "options": [
      {
        "text": "A. Segera laporkan bersama orang tua ke pihak sekolah, Satgas TPPK, dan Unit PPA Kepolisian karena melanggar UU ITE dan UU TPKS.",
        "isCorrect": true
      },
      {
        "text": "B. Menyebarkannya ke teman-teman lain untuk memastikan apakah itu foto asli.",
        "isCorrect": false
      },
      {
        "text": "C. Diam saja karena merasa bukan urusan pribadi kita.",
        "isCorrect": false
      }
    ],
    "explanation": "Manipulasi gambar bernuansa asusila (non-consensual deepfake) adalah tindak pidana kekerasan seksual siber (KSGO) berat yang harus diproses hukum."
  },
  {
    "id": 48,
    "topic": "Pemerasan Data (Blackmail)",
    "targetAudience": "sma",
    "question": "Seseorang mengancam akan menyebarkan foto pribadimu jika kamu tidak mengirimkan sejumlah uang atau pulsa. Kamu harus...",
    "options": [
      {
        "text": "A. JANGAN turuti permintaannya, amankan bukti chat, dan segera bicara kepada orang tua atau Guru BK untuk pendampingan hukum.",
        "isCorrect": true
      },
      {
        "text": "B. Mengirimkan uang sedikit demi sedikit dengan harapan pelaku akan berhenti mengancam.",
        "isCorrect": false
      },
      {
        "text": "C. Mengurung diri dan menuruti semua tuntutan pelaku seumur hidup.",
        "isCorrect": false
      }
    ],
    "explanation": "Menuruti tuntutan pemeras tidak akan menghentikan ancaman. Melibatkan orang dewasa tepercaya dan kepolisian adalah satu-satunya jalan keluar aman."
  },
  {
    "id": 49,
    "topic": "Melaporkan Akun Perundung",
    "targetAudience": "smp_sma",
    "question": "Bagaimana fitur 'Report / Laporkan' di Instagram, TikTok, dan WhatsApp membantu korban perundungan siber?",
    "options": [
      {
        "text": "A. Memberi tahu tim moderasi platform untuk meninjau, menghapus konten berbahaya, dan menangguhkan akun pelaku perundungan.",
        "isCorrect": true
      },
      {
        "text": "B. Menghapus seluruh memori ponsel korban secara otomatis.",
        "isCorrect": false
      },
      {
        "text": "C. Memaksa pelaku untuk meminta maaf secara tatap muka.",
        "isCorrect": false
      }
    ],
    "explanation": "Melaporkan konten ke platform adalah langkah mitigasi digital standar untuk membatasi penyebaran materi berbahaya di internet."
  },
  {
    "id": 50,
    "topic": "Kesehatan Mental & Detoks Medsos",
    "targetAudience": "smp_sma",
    "question": "Jika media sosial mulai membuatmu merasa cemas, tertekan, atau menjadi sasaran kebencian, langkah bijak yang dapat diambil adalah...",
    "options": [
      {
        "text": "A. Mengambil jeda istirahat (digital detox), membatasi layar, dan berbicara dengan konselor atau orang tua.",
        "isCorrect": true
      },
      {
        "text": "B. Membaca komentar kebencian terus-menerus hingga tidak bisa tidur.",
        "isCorrect": false
      },
      {
        "text": "C. Membuat sepuluh akun baru untuk membalas semua orang yang membencimu.",
        "isCorrect": false
      }
    ],
    "explanation": "Kesehatan mentalmu jauh lebih berharga daripada kehadiran di media sosial. Mengambil jarak dari layar adalah bentuk perlindungan diri."
  },
  {
    "id": 51,
    "topic": "Tekanan Merokok / Vape",
    "targetAudience": "smp_sma",
    "question": "Teman-teman satu tongkrongan di warung belakang sekolah memaksamu mencoba rokok elektrik (vape) sambil mengejek 'cupu kalau nggak nyoba'. Responmu...",
    "options": [
      {
        "text": "A. Tolak dengan percaya diri: 'Aku nggak tertarik, kalian nikmati aja.' Teman sejati akan menghargai prinsipmu.",
        "isCorrect": true
      },
      {
        "text": "B. Mencobanya sekali saja agar dianggap keren dan diterima dalam kelompok.",
        "isCorrect": false
      },
      {
        "text": "C. Menangis dan berjanji akan membelikan mereka camilan asal tidak dipaksa.",
        "isCorrect": false
      }
    ],
    "explanation": "Menolak hal berisiko menunjukkan kematangan karakter dan kekuatan mental. Keberanian berkata 'TIDAK' adalah tanda kepemimpinan diri."
  },
  {
    "id": 52,
    "topic": "Ancaman Dikeluarkan dari Sirkel",
    "targetAudience": "smp_sma",
    "question": "Teman sirkel mengancam akan mengeluarkanmu dari pertemanan jika kamu menolak ikut nongkrong sampai larut malam di tempat sepi. Sikapmu...",
    "options": [
      {
        "text": "A. Tetap berpegang pada aturan keluarga dan keselamatan diri: pertemanan yang sehat tidak pernah memaksakan hal yang membahayakanmu.",
        "isCorrect": true
      },
      {
        "text": "B. Berbohong kepada orang tua dan kabur dari rumah demi sirkel.",
        "isCorrect": false
      },
      {
        "text": "C. Memohon-mohon agar tidak dikeluarkan sambil mengorbankan waktu istirahat.",
        "isCorrect": false
      }
    ],
    "explanation": "Jika syarat berteman adalah membahayakan keselamatan atau melanggar aturan, sirkel tersebut tidak layak dipertahankan."
  },
  {
    "id": 53,
    "topic": "Paksaan Menyontek Saat Ujian",
    "targetAudience": "smp_sma",
    "question": "Teman yang berpengaruh di kelas mengancam akan memusuhimu jika kamu tidak membagikan kunci jawaban ujian sekolah. Sikapmu...",
    "options": [
      {
        "text": "A. Tolak dengan tenang: 'Aku belajar susah payah untuk ujian ini, kita kerjakan sendiri-sendiri ya.' dan tutupi lembar jawabanmu.",
        "isCorrect": true
      },
      {
        "text": "B. Memberikan contekan karena takut dikeroyok sepulang sekolah.",
        "isCorrect": false
      },
      {
        "text": "C. Sengaja memberikan jawaban salah agar dia dihukum guru.",
        "isCorrect": false
      }
    ],
    "explanation": "Integritas akademik adalah harga diri pelajar. Mempertahankan kejujuran adalah hakmu yang dilindungi aturan sekolah."
  },
  {
    "id": 54,
    "topic": "Tekanan Mengonsumsi Alkohol",
    "targetAudience": "sma",
    "question": "Di sebuah pesta ulang tahun, teman-temanmu mencampur minuman dengan alkohol dan mendesakmu meminumnya. Respon teramanmu...",
    "options": [
      {
        "text": "A. Tolak tegas, letakkan gelas, dan cari teman lain yang aman atau segera hubungi orang tua untuk dijemput pulang.",
        "isCorrect": true
      },
      {
        "text": "B. Meminumnya sedikit agar tidak dicap perusak suasana pesta.",
        "isCorrect": false
      },
      {
        "text": "C. Pura-pura meminumnya lalu menyemburkannya ke pakaian teman.",
        "isCorrect": false
      }
    ],
    "explanation": "Meninggalkan situasi berisiko yang melibatkan zat terlarang adalah keputusan paling cerdas untuk melindungi masa depan dan keselamatanmu."
  },
  {
    "id": 55,
    "topic": "Ajakan Balap Liar / Berkendara Berbahaya",
    "targetAudience": "sma",
    "question": "Kamu diajak teman untuk ikut balap liar sepeda motor tanpa helm di jalan raya pada malam hari. Kamu harus...",
    "options": [
      {
        "text": "A. Menolak mutlak karena risiko kecelakaan fatal dan jerat pidana, serta ajak temanmu memikirkan masa depannya.",
        "isCorrect": true
      },
      {
        "text": "B. Ikut menonton di barisan paling depan agar terlihat bernyali.",
        "isCorrect": false
      },
      {
        "text": "C. Meminjamkan motormu untuk dipakai balapan oleh orang lain.",
        "isCorrect": false
      }
    ],
    "explanation": "Menolak tindakan berbahaya yang mengancam nyawa adalah bentuk kecerdasan emosional dan tanggung jawab hukum."
  },
  {
    "id": 56,
    "topic": "Tekanan Patungan Ilegal",
    "targetAudience": "smp_sma",
    "question": "Kelompok kakak kelas mendatangi mejamu dan meminta uang patungan secara paksa untuk acara geng mereka. Tindakanmu...",
    "options": [
      {
        "text": "A. Tolak dengan tegas: 'Maaf, ini uang saku saya dari orang tua untuk makan.' dan segera laporkan pemalakan ini ke Guru BK/Satpam.",
        "isCorrect": true
      },
      {
        "text": "B. Menyerahkan semua uang saku dan menahan lapar sepanjang hari.",
        "isCorrect": false
      },
      {
        "text": "C. Mencuri uang teman sekelas untuk membayar patungan tersebut.",
        "isCorrect": false
      }
    ],
    "explanation": "Pemalakan berkedok patungan adalah tindak kekerasan finansial di sekolah yang wajib dihentikan lewat pelaporan resmi."
  },
  {
    "id": 57,
    "topic": "Ajakan Membolos Sekolah",
    "targetAudience": "smp_sma",
    "question": "Saat jam istirahat kedua, teman-temanmu mengajak memanjat pagar belakang sekolah untuk nongkrong di warnet/warkop. Responmu...",
    "options": [
      {
        "text": "A. Tolak ajakan: 'Aku mau tetap di kelas sampai jam pulang, kalian pikirkan lagi risikonya.'",
        "isCorrect": true
      },
      {
        "text": "B. Ikut memanjat pagar karena takut dicap anak mami yang penakut.",
        "isCorrect": false
      },
      {
        "text": "C. Membantu memegangi tangga agar teman-temanmu berhasil kabur.",
        "isCorrect": false
      }
    ],
    "explanation": "Disiplin diri terhadap tujuan utama bersekolah adalah investasi terbaik untuk masa depanmu sendiri."
  },
  {
    "id": 58,
    "topic": "Tekanan Ikut Tawuran",
    "targetAudience": "sma",
    "question": "Alumni sekolah mengumpulkan siswa dan memprovokasi agar menyerang sekolah tetangga dengan alasan 'menjaga kehormatan almamater'. Sikapmu...",
    "options": [
      {
        "text": "A. Tolak keras, segera tinggalkan lokasi berkumpul, dan laporkan rencana penyerangan ke pihak sekolah/polisi untuk mencegah korban jiwa.",
        "isCorrect": true
      },
      {
        "text": "B. Membawa senjata tajam dan maju di barisan depan demi membanggakan alumni.",
        "isCorrect": false
      },
      {
        "text": "C. Ikut menonton dari jarak dekat agar tidak dipukuli alumni.",
        "isCorrect": false
      }
    ],
    "explanation": "Tawuran bukan tentang kehormatan, melainkan tindak pidana kekerasan yang merusak masa depan dan merenggut nyawa."
  },
  {
    "id": 59,
    "topic": "Kekuatan Mengatakan 'TIDAK'",
    "targetAudience": "smp_sma",
    "question": "Mengapa banyak remaja merasa sangat sulit mengatakan kata 'TIDAK' kepada teman sebayanya?",
    "options": [
      {
        "text": "A. Karena adanya rasa takut akan penolakan sosial, takut dijauhi, atau takut dianggap berbeda dari kelompok.",
        "isCorrect": true
      },
      {
        "text": "B. Karena hukum melarang remaja untuk menolak ajakan teman.",
        "isCorrect": false
      },
      {
        "text": "C. Karena teman sebaya selalu memiliki niat yang benar bagi kita.",
        "isCorrect": false
      }
    ],
    "explanation": "Menyadari akar rasa takut membantu kita melatih keberanian asertif untuk mempertahankan nilai-nilai kebaikan pribadi."
  },
  {
    "id": 60,
    "topic": "Memilih Sirkel Pertemanan Positif",
    "targetAudience": "smp_sma",
    "question": "Apa ciri utama dari lingkaran pertemanan (sirkel) yang sehat dan mendukung perkembangan remaja?",
    "options": [
      {
        "text": "A. Saling menghormati batasan, saling mendukung impian positif, dan tidak memaksakan hal-hal yang melanggar norma/hukum.",
        "isCorrect": true
      },
      {
        "text": "B. Selalu memakai pakaian bermerek yang sama dan memusuhi siswa lain di luar kelompok.",
        "isCorrect": false
      },
      {
        "text": "C. Menuntut kepatuhan mutlak kepada ketua geng tanpa boleh bertanya.",
        "isCorrect": false
      }
    ],
    "explanation": "Pertemanan sehat memberikan rasa aman untuk menjadi diri sendiri tanpa rasa takut dihakimi atau dipaksa."
  },
  {
    "id": 61,
    "topic": "Taktik Bystander: Distraction (Pengalihan)",
    "targetAudience": "smp_sma",
    "question": "Kamu melihat seorang adik kelas sedang dipojokkan dan diejek oleh beberapa anak di sudut perpustakaan. Bagaimana cara intervensi pengalihan (distraction)?",
    "options": [
      {
        "text": "A. Mendekat dan ajak adik kelas itu berbicara wajar: 'Hai Dek, tadi dicari Bu Guru di ruang piket, yuk ke sana sekarang.'",
        "isCorrect": true
      },
      {
        "text": "B. Ikut menonton dari kejauhan dan merekamnya untuk konsumsi pribadi.",
        "isCorrect": false
      },
      {
        "text": "C. Ikut menertawakan agar tidak dianggap membela pihak yang lemah.",
        "isCorrect": false
      }
    ],
    "explanation": "Taktik pengalihan (distraction) adalah intervensi bystander yang sangat aman dan efektif untuk meredakan ketegangan seketika tanpa konfrontasi fisik."
  },
  {
    "id": 62,
    "topic": "Taktik Bystander: Delegate (Mendelegasikan)",
    "targetAudience": "smp_sma",
    "question": "Jika kamu melihat perundungan yang melibatkan kekerasan fisik dan situasinya membahayakan jika dihadapi sendirian, tindakan bystander terbaik adalah...",
    "options": [
      {
        "text": "A. Segera panggil bantuan orang dewasa resmi (Guru Piket, Guru BK, Satpam Sekolah, atau Kepala Sekolah).",
        "isCorrect": true
      },
      {
        "text": "B. Masuk ke tengah perkelahian dan membalas memukul semua orang.",
        "isCorrect": false
      },
      {
        "text": "C. Memilih pergi dan pura-pura tidak melihat apa pun.",
        "isCorrect": false
      }
    ],
    "explanation": "Mendelegasikan penanganan ke pihak berwenang (guru/satpam) adalah tindakan bijak untuk melindungi korban dan keselamatan dirimu sendiri."
  },
  {
    "id": 63,
    "topic": "Taktik Bystander: Delay (Mendampingi Korban)",
    "targetAudience": "smp_sma",
    "question": "Setelah insiden perundungan verbal terjadi dan pelaku sudah pergi, apa yang bisa kamu lakukan sebagai bystander yang baik (delay)?",
    "options": [
      {
        "text": "A. Hampiri korban, tanyakan keadaannya, dengarkan perasaannya, dan tawarkan untuk mendampinginya melapor ke ruang BK.",
        "isCorrect": true
      },
      {
        "text": "B. Memberitahu korban bahwa dia cengeng dan harus belajar membalas dendam.",
        "isCorrect": false
      },
      {
        "text": "C. Mengunggah cerita tersebut ke status WhatsApp agar semua orang tahu.",
        "isCorrect": false
      }
    ],
    "explanation": "Dukungan pasca-kejadian (delay) membuktikan kepada korban bahwa dia tidak sendirian dan membantunya memulihkan rasa percaya diri."
  },
  {
    "id": 64,
    "topic": "Taktik Bystander: Direct (Teguran Langsung)",
    "targetAudience": "sma",
    "question": "Saat seorang teman melontarkan lelucon rasis atau menghina fisik siswa lain di hadapanmu, tindakan langsung (direct) yang tepat...",
    "options": [
      {
        "text": "A. Katakan dengan tegas dan tenang: 'Candaan itu nggak lucu dan menyakiti perasaan orang. Hentikan sekarang.'",
        "isCorrect": true
      },
      {
        "text": "B. Langsung memukul meja dan menantangnya berkelahi satu lawan satu.",
        "isCorrect": false
      },
      {
        "text": "C. Tersenyum kecut sambil mengalihkan pandangan ke lantai.",
        "isCorrect": false
      }
    ],
    "explanation": "Teguran langsung yang tenang menunjukkan batas norma kelompok bahwa perundungan tidak mendapat persetujuan dari lingkungan sosial."
  },
  {
    "id": 65,
    "topic": "Bahaya Menjadi Penonton Pasif",
    "targetAudience": "smp_sma",
    "question": "Mengapa menjadi penonton yang hanya diam saat melihat perundungan dapat memperburuk keadaan bagi korban?",
    "options": [
      {
        "text": "A. Diamnya penonton diartikan oleh pelaku sebagai dukungan sosial (approval) atas tindakannya, sehingga pelaku semakin berani.",
        "isCorrect": true
      },
      {
        "text": "B. Karena penonton yang diam akan otomatis disalahkan oleh polisi.",
        "isCorrect": false
      },
      {
        "text": "C. Karena korban akan mengira penonton sedang merencanakan sesuatu.",
        "isCorrect": false
      }
    ],
    "explanation": "Bystander pasif memberi angin segar bagi pelaku perundungan. Memecah keheningan adalah langkah awal memulihkan keadilan."
  },
  {
    "id": 66,
    "topic": "Menemani Siswa yang Diisolasi",
    "targetAudience": "smp",
    "question": "Kamu melihat seorang siswa baru selalu makan sendirian di kantin karena disebarkan rumor bahwa dia orang aneh. Kamu sebaiknya...",
    "options": [
      {
        "text": "A. Datang menghampirinya, minta izin duduk bersama, dan ajak mengobrol ramah tentang hobinya.",
        "isCorrect": true
      },
      {
        "text": "B. Menjauhinya juga agar sirkel pertemananmu tidak ikut memusuhimu.",
        "isCorrect": false
      },
      {
        "text": "C. Memotretnya dari jauh dan menjadikannya bahan lelucon di grup obrolan.",
        "isCorrect": false
      }
    ],
    "explanation": "Tindakan sederhana merangkul orang yang diisolasi mematahkan taktik perundungan sosial dan memberikan harapan besar bagi korban."
  },
  {
    "id": 67,
    "topic": "Intervensi di Grup WhatsApp Kelas",
    "targetAudience": "smp_sma",
    "question": "Di grup chat kelas, beberapa siswa mulai mengirim pesan mengejek tugas seorang teman yang salah. Sebagai anggota grup, kamu...",
    "options": [
      {
        "text": "A. Kirim pesan pengingat: 'Teman-teman, mari kita saling hargai usaha orang lain. Kritik boleh, tapi jangan merendahkan.'",
        "isCorrect": true
      },
      {
        "text": "B. Ikut mengirimkan meme mengejek agar dianggap lucu.",
        "isCorrect": false
      },
      {
        "text": "C. Segera keluar dari grup kelas tanpa berbuat apa-apa.",
        "isCorrect": false
      }
    ],
    "explanation": "Satu suara kebenaran di ruang digital sering kali cukup untuk menyadarkan anggota grup lain agar menghentikan perundungan massal."
  },
  {
    "id": 68,
    "topic": "Mendokumentasikan Tanpa Menonton",
    "targetAudience": "sma",
    "question": "Kapan merekam kejadian perundungan dianggap etis dan bertanggung jawab?",
    "options": [
      {
        "text": "A. Jika rekaman disimpan aman semata-mata untuk diserahkan kepada pihak sekolah/aparat sebagai barang bukti hukum, BUKAN untuk konten publik.",
        "isCorrect": true
      },
      {
        "text": "B. Kapan saja, asalkan diunggah ke TikTok dengan musik dramatis agar viral.",
        "isCorrect": false
      },
      {
        "text": "C. Jika rekaman dijual ke akun gosip untuk mendapatkan uang.",
        "isCorrect": false
      }
    ],
    "explanation": "Dokumentasi hanya bernilai etis jika tujuannya adalah penegakan keadilan dan perlindungan korban, bukan tontonan media sosial."
  },
  {
    "id": 69,
    "topic": "Menolak Ikut Tertawa",
    "targetAudience": "smp_sma",
    "question": "Bentuk penolakan paling sederhana namun kuat saat seseorang melontarkan lelucon menghina fisik orang lain adalah...",
    "options": [
      {
        "text": "A. Tidak ikut tertawa dan tunjukkan ekspresi wajah netral/kecewa agar pelaku menyadari leluconnya tidak pantas.",
        "isCorrect": true
      },
      {
        "text": "B. Tertawa terbahak-bahak tetapi berbisik kepada korban bahwa kamu sebenarnya kasihan.",
        "isCorrect": false
      },
      {
        "text": "C. Tepuk tangan meriah agar suasana tetap ceria.",
        "isCorrect": false
      }
    ],
    "explanation": "Menolak tertawa menghilangkan 'hadiah sosial' (tawa) yang dicari oleh pelaku lelucon ofensif."
  },
  {
    "id": 70,
    "topic": "Definisi Bystander Aktif",
    "targetAudience": "smp_sma",
    "question": "Siapakah yang dimaksud dengan 'Bystander Aktif' (Upstander) di lingkungan sekolah?",
    "options": [
      {
        "text": "A. Siswa yang menyaksikan situasi perundungan/pelecehan dan memilih mengambil tindakan aman untuk membantu korban dan menghentikan pelaku.",
        "isCorrect": true
      },
      {
        "text": "B. Siswa yang gemar memprovokasi orang lain agar saling bermusuhan.",
        "isCorrect": false
      },
      {
        "text": "C. Siswa yang selalu melaporkan semua hal kecil agar mendapat pujian dari kepala sekolah.",
        "isCorrect": false
      }
    ],
    "explanation": "Upstander adalah pahlawan tanpa tanda jasa di sekolah yang mengubah budaya ketakutan menjadi budaya solidaritas dan rasa aman."
  },
  {
    "id": 71,
    "topic": "Kontrol Akses Medsos oleh Pacar",
    "targetAudience": "sma",
    "question": "Pacarmu meminta kamu memberikan akses username dan password semua akun medsosmu sebagai 'bukti kesetiaan'. Responmu...",
    "options": [
      {
        "text": "A. Menolak tegas: 'Kesetiaan dibuktikan dengan kejujuran dan komitmen, bukan dengan menyerahkan privasi akun pribadiku.'",
        "isCorrect": true
      },
      {
        "text": "B. Memberikannya agar dia tidak marah dan tidak menuduhmu selingkuh.",
        "isCorrect": false
      },
      {
        "text": "C. Menghapus akun medsosmu demi menjaga hubungan tetap damai.",
        "isCorrect": false
      }
    ],
    "explanation": "Meminta password pasangan adalah tanda ketidakamanan dan kontrol toksik (toxic relationship), bukan tanda cinta sejati."
  },
  {
    "id": 72,
    "topic": "Isolasi Sosial dalam Pacaran",
    "targetAudience": "sma",
    "question": "Pacarmu melarangmu bergaul atau bahkan sekadar mengobrol dengan sahabat-sahabat lamamu di sekolah. Ini adalah ciri...",
    "options": [
      {
        "text": "A. Perilaku isolasi sosial (red flag kekerasan emosional) yang bertujuan memutus sistem dukungan korban.",
        "isCorrect": true
      },
      {
        "text": "B. Tanda cinta mendalam yang ingin selalu bersama pasangannya setiap saat.",
        "isCorrect": false
      },
      {
        "text": "C. Perilaku wajar remaja yang sedang jatuh cinta.",
        "isCorrect": false
      }
    ],
    "explanation": "Isolasi sosial membuat korban bergantung 100% pada pelaku sehingga rentan dieksploitasi dan dimanipulasi secara emosional."
  },
  {
    "id": 73,
    "topic": "Permintaan Foto Intim (Sextortion)",
    "targetAudience": "sma",
    "question": "Pacar atau gebetan di medsos merayumu untuk mengirimkan foto tanpa busana (PAP sensitif) dengan janji 'rahasia kita berdua'. Sikap mutlakmu...",
    "options": [
      {
        "text": "A. TOLAK 100% dan blokir/laporkan jika mendesak, karena foto digital rentan disalahgunakan untuk pemerasan seksual (sextortion).",
        "isCorrect": true
      },
      {
        "text": "B. Mengirimkan dengan syarat wajah ditutupi stiker atau disensor.",
        "isCorrect": false
      },
      {
        "text": "C. Mengirimkan sekali saja demi membuktikan rasa cinta yang tulus.",
        "isCorrect": false
      }
    ],
    "explanation": "Sextortion adalah modus kejahatan siber nomor satu pada remaja. Menolak mutlak mengirim materi intim adalah perlindungan diri terpenting seumur hidup."
  },
  {
    "id": 74,
    "topic": "Ancaman Saat Ingin Putus",
    "targetAudience": "sma",
    "question": "Ketika kamu ingin mengakhiri hubungan yang toksik, pasanganmu mengancam: 'Kalau kamu putusin aku, aku bakal celakain diriku sendiri atau sebar rahasiamu!'. Tindakanmu...",
    "options": [
      {
        "text": "A. Tetap teguh pada keputusan putus, jangan terperangkap manipulasi emosional, dan segera beritahu orang tua/Guru BK untuk perlindungan.",
        "isCorrect": true
      },
      {
        "text": "B. Mengurungkan niat putus dan bertahan menerima kekerasan demi keselamatannya.",
        "isCorrect": false
      },
      {
        "text": "C. Memohon ampun dan menuruti semua kemauannya.",
        "isCorrect": false
      }
    ],
    "explanation": "Ancaman menyakiti diri sendiri adalah bentuk manipulasi emosional ekstrem. Kamu tidak bertanggung jawab atas pilihan pelaku, libatkan orang dewasa segera."
  },
  {
    "id": 75,
    "topic": "Kekerasan Verbal dalam Pacaran",
    "targetAudience": "sma",
    "question": "Pacarmu sering membentak, memaki dengan kata kasar, lalu beberapa menit kemudian membelikan hadiah sambil menangis minta maaf. Pola ini disebut...",
    "options": [
      {
        "text": "A. Siklus kekerasan (Cycle of Abuse: ketegangan -> ledakan kekerasan -> fase bulan madu/minta maaf palsu).",
        "isCorrect": true
      },
      {
        "text": "B. Dinamika bumbu asmara yang membuat hubungan semakin erat.",
        "isCorrect": false
      },
      {
        "text": "C. Bukti bahwa pacarmu memiliki sifat romantis yang unik.",
        "isCorrect": false
      }
    ],
    "explanation": "Siklus kekerasan akan terus berulang dan memburuk jika tidak diputus. Hadiah bukan pembenaran atas perlakuan kasar."
  },
  {
    "id": 76,
    "topic": "Menolak Sentuhan Fisik Pacaran",
    "targetAudience": "sma",
    "question": "Dalam berpacaran, apakah kamu memiliki hak penuh untuk menolak sentuhan fisik tertentu dari pasanganmu?",
    "options": [
      {
        "text": "A. YA, MUTLAK. Status pacaran tidak pernah menghilangkan hak otonomi tubuhmu; kata 'TIDAK' harus selalu dihormati.",
        "isCorrect": true
      },
      {
        "text": "B. Tidak, pacaran berarti sudah menyerahkan hak tubuh kepada pasangan.",
        "isCorrect": false
      },
      {
        "text": "C. Hanya boleh menolak jika di tempat umum, di tempat sepi wajib menuruti.",
        "isCorrect": false
      }
    ],
    "explanation": "Consent harus dapat ditarik kembali kapan saja. Pasangan yang menghargaimu akan segera berhenti tanpa rasa marah saat kamu berkata tidak."
  },
  {
    "id": 77,
    "topic": "Hadiah dengan Tuntutan Berisiko",
    "targetAudience": "sma",
    "question": "Seseorang yang mendekatimu memberikan hadiah ponsel mahal, lalu menuntut agar kamu mau diajak menginap di luar kota. Sebaiknya...",
    "options": [
      {
        "text": "A. Kembalikan hadiah tersebut dengan sopan dan tolak ajakan berisiko: hadiah tidak boleh dijadikan alat transaksi tubuh atau komitmen.",
        "isCorrect": true
      },
      {
        "text": "B. Menerima ajakannya karena merasa memiliki utang budi materi.",
        "isCorrect": false
      },
      {
        "text": "C. Menjual ponsel tersebut dan kabur tanpa pamit.",
        "isCorrect": false
      }
    ],
    "explanation": "Waspada terhadap modus 'grooming' di mana materi digunakan untuk menjebak korban agar merasa berutang budi dan terpaksa menuruti keinginan seksual."
  },
  {
    "id": 78,
    "topic": "Mengenali Red Flags Sejak Dini",
    "targetAudience": "sma",
    "question": "Apa saja tanda peringatan bahaya (red flags) yang paling jelas saat baru mulai dekat dengan seseorang?",
    "options": [
      {
        "text": "A. Mudah marah meledak-ledak, cemburu berlebihan, tidak menghargai kata penolakan, dan suka merendahkan orang lain.",
        "isCorrect": true
      },
      {
        "text": "B. Suka membaca buku dan memiliki nilai matematika yang tinggi.",
        "isCorrect": false
      },
      {
        "text": "C. Selalu tepat waktu saat janji kerja kelompok.",
        "isCorrect": false
      }
    ],
    "explanation": "Mengenali 'red flags' sejak awal menyelamatkan kita dari terjebak dalam hubungan toksik yang merusak masa depan."
  },
  {
    "id": 79,
    "topic": "Cemburu Bukan Tanda Cinta",
    "targetAudience": "sma",
    "question": "Apakah rasa cemburu buta yang sampai melarang pasangan berinteraksi dengan teman sekolah adalah tanda cinta sejati?",
    "options": [
      {
        "text": "A. BUKAN. Cemburu posesif berlebihan adalah tanda rasa tidak aman dan keinginan menguasai orang lain sebagai objek milik pribadi.",
        "isCorrect": true
      },
      {
        "text": "B. Ya, semakin cemburu seseorang berarti cintanya semakin besar.",
        "isCorrect": false
      },
      {
        "text": "C. Ya, pasangan wajib dicurigai setiap saat agar tidak berkhianat.",
        "isCorrect": false
      }
    ],
    "explanation": "Cinta yang sehat berakar pada rasa percaya, saling menghormati, dan kebebasan untuk bertumbuh, bukan kecurigaan dan kekangan."
  },
  {
    "id": 80,
    "topic": "Keberanian Memutuskan Hubungan Toksik",
    "targetAudience": "sma",
    "question": "Apa yang harus kamu lakukan jika menyadari bahwa hubungan pacaranmu penuh dengan ancaman, kekerasan emosional, atau fisik?",
    "options": [
      {
        "text": "A. Akhiri hubungan di tempat aman/publik atau melalui pesan tertulis yang tegas, lalu cari pendampingan dari keluarga dan konselor.",
        "isCorrect": true
      },
      {
        "text": "B. Berharap pasanganmu akan berubah menjadi baik dengan sendirinya seiring waktu.",
        "isCorrect": false
      },
      {
        "text": "C. Menikah muda agar masalah kekerasan dalam pacaran selesai.",
        "isCorrect": false
      }
    ],
    "explanation": "Keselamatan fisik dan kesehatan mentalmu adalah prioritas nomor satu. Memutuskan hubungan beracun adalah tindakan keberanian menyelamatkan diri."
  },
  {
    "id": 81,
    "topic": "Screenshot Bukti Chat yang Sah",
    "targetAudience": "smp_sma",
    "question": "Bagaimana cara mengambil tangkapan layar (screenshot) bukti chat intimidasi yang baik agar sah dijadikan bukti penanganan?",
    "options": [
      {
        "text": "A. Ambil layar utuh mencakup nama/nomor profil pelaku, tanggal dan waktu pesan, serta seluruh konteks percakapan tanpa terpotong.",
        "isCorrect": true
      },
      {
        "text": "B. Potong hanya bagian kata-kata kotor saja menggunakan crop sekecil mungkin.",
        "isCorrect": false
      },
      {
        "text": "C. Mengubah dan mengedit teks chat menggunakan aplikasi edit foto.",
        "isCorrect": false
      }
    ],
    "explanation": "Konteks waktu dan identitas akun yang utuh memastikan bukti tidak dapat disangkal sebagai hasil rekayasa atau editan."
  },
  {
    "id": 82,
    "topic": "Merekam Pesan Suara / Voice Note",
    "targetAudience": "smp_sma",
    "question": "Jika pelaku mengirimkan pesan suara (voice note) berisi ancaman di WhatsApp, tindakan dokumentasi terbaikmu adalah...",
    "options": [
      {
        "text": "A. Unduh dan simpan file audio tersebut ke folder aman/cloud, serta buat cadangan (backup) sebelum pesan ditarik oleh pelaku.",
        "isCorrect": true
      },
      {
        "text": "B. Langsung menghapus voice note tersebut agar memorimu tidak penuh.",
        "isCorrect": false
      },
      {
        "text": "C. Membalas dengan mengirimkan rekaman lagu dangdut.",
        "isCorrect": false
      }
    ],
    "explanation": "Menyimpan file audio asli sebelum ditarik (unsend) oleh pelaku memberikan bukti forensik digital yang sangat kuat."
  },
  {
    "id": 83,
    "topic": "Menghindari Provokasi Balasan",
    "targetAudience": "smp_sma",
    "question": "Mengapa kita TIDAK BOLEH membalas pesan teror/cyberbullying dengan kata-kata hinaan atau ancaman balik?",
    "options": [
      {
        "text": "A. Agar posisi hukum kita tetap bersih sebagai korban, dan pelaku tidak membalikkan tuduhan pencemaran nama baik atas balasan kita.",
        "isCorrect": true
      },
      {
        "text": "B. Karena membalas pesan di internet memakan biaya pulsa yang sangat mahal.",
        "isCorrect": false
      },
      {
        "text": "C. Karena sistem internet otomatis memblokir orang yang membalas pesan.",
        "isCorrect": false
      }
    ],
    "explanation": "Menjaga respon tetap dingin dan bersih mencegah pelaku memanfaatkan kemarahan kita untuk memutarbalikkan fakta hukum."
  },
  {
    "id": 84,
    "topic": "Mencatat Kronologi Kejadian",
    "targetAudience": "smp_sma",
    "question": "Selain bukti digital, dokumen apa yang sangat membantu Guru BK atau Satgas TPPK dalam memproses laporan kekerasan?",
    "options": [
      {
        "text": "A. Catatan kronologi tertulis sederhana: kapan kejadian terjadi, di mana lokasinya, siapa saja yang terlibat, dan saksi yang melihat.",
        "isCorrect": true
      },
      {
        "text": "B. Surat perjanjian damai yang ditandatangani di atas meterai palsu.",
        "isCorrect": false
      },
      {
        "text": "C. Tulisan diary berisi puisi kesedihan yang panjang.",
        "isCorrect": false
      }
    ],
    "explanation": "Kronologi terstruktur 5W+1H (What, When, Where, Who, Why, How) mempercepat tim penanganan memahami akar masalah secara akurat."
  },
  {
    "id": 85,
    "topic": "Tempat Aman Menyimpan Cadangan Bukti",
    "targetAudience": "smp_sma",
    "question": "Di mana tempat paling aman untuk mencadangkan bukti tangkapan layar kekerasan jika khawatir ponselmu disita atau dirusak pelaku?",
    "options": [
      {
        "text": "A. Kirimkan salinan bukti ke email pribadi yang terkunci password kuat atau simpan di penyimpanan awan (Google Drive/iCloud).",
        "isCorrect": true
      },
      {
        "text": "B. Simpan di status WhatsApp yang hanya bisa dilihat kontak teman.",
        "isCorrect": false
      },
      {
        "text": "C. Cetak di kertas lalu tinggalkan di kolong meja kelas.",
        "isCorrect": false
      }
    ],
    "explanation": "Penyimpanan cloud terenkripsi memastikan bukti tetap aman dan dapat diakses dari perangkat lain kapan pun dibutuhkan."
  },
  {
    "id": 86,
    "topic": "Menghadapi Akun Palsu (Fake Account)",
    "targetAudience": "smp_sma",
    "question": "Jika teror online dikirimkan oleh akun palsu tanpa foto dan tanpa nama asli (burner account), apakah pelakunya masih bisa dilacak?",
    "options": [
      {
        "text": "A. BISA, aparat penegak hukum dan penyedia platform memiliki log IP address dan jejak digital perangkat pembuat akun tersebut.",
        "isCorrect": true
      },
      {
        "text": "B. Tidak bisa, akun palsu di internet tidak meninggalkan jejak apa pun di dunia.",
        "isCorrect": false
      },
      {
        "text": "C. Hanya bisa dilacak jika pelaku mengaku sendiri di sekolah.",
        "isCorrect": false
      }
    ],
    "explanation": "Anonimitas di internet adalah ilusi. Forensik siber kepolisian dapat menelusuri alamat IP dan perangkat fisik pembuat akun teror."
  },
  {
    "id": 87,
    "topic": "Ancaman Mencabut Laporan",
    "targetAudience": "smp_sma",
    "question": "Setelah kamu melapor ke BK, pelaku atau teman gengnya mendatangi dan mengancammu agar mencabut laporan tersebut. Tindakanmu...",
    "options": [
      {
        "text": "A. Jangan gentar, segera laporkan intimidasi baru ini kepada pihak sekolah/keluarga karena tindakan itu memperberat sanksi pelaku.",
        "isCorrect": true
      },
      {
        "text": "B. Langsung mencabut laporan dan meminta maaf kepada pelaku.",
        "isCorrect": false
      },
      {
        "text": "C. Berkelahi sendirian dengan seluruh anggota geng pelaku di lapangan.",
        "isCorrect": false
      }
    ],
    "explanation": "Mengancam pelapor (retaliation) adalah pelanggaran berat dalam perlindungan saksi/korban yang akan mempercepat penindakan tegas bagi pelaku."
  },
  {
    "id": 88,
    "topic": "Peran Pendampingan Orang Tua",
    "targetAudience": "smp_sma",
    "question": "Mengapa melibatkan orang tua saat melaporkan kasus kekerasan sekolah sangat penting bagi siswa?",
    "options": [
      {
        "text": "A. Orang tua adalah wali hukum resmi yang dapat memberikan perlindungan penuh, pendampingan legal, dan memastikan sekolah bertindak adil.",
        "isCorrect": true
      },
      {
        "text": "B. Agar orang tua bisa langsung memukul pelaku di depan umum.",
        "isCorrect": false
      },
      {
        "text": "C. Agar siswa tidak perlu masuk sekolah selamanya.",
        "isCorrect": false
      }
    ],
    "explanation": "Dukungan orang tua memperkuat posisi siswa di hadapan institusi dan menjamin hak-hak pemulihan siswa terlaksana tuntas."
  },
  {
    "id": 89,
    "topic": "Risiko 'Spill' di Medsos Sebelum Melapor",
    "targetAudience": "sma",
    "question": "Mengapa menyebarkan ('spill') kasus pelecehan atau perundungan ke media sosial sebelum melapor ke pihak resmi berisiko bagi korban?",
    "options": [
      {
        "text": "A. Berisiko diserang balik dengan pasal pencemaran nama baik (UU ITE), memicu perundungan kedua (secondary trauma), dan merusak bukti.",
        "isCorrect": true
      },
      {
        "text": "B. Karena netizen di media sosial pasti akan membela pihak pelaku 100%.",
        "isCorrect": false
      },
      {
        "text": "C. Karena media sosial dilarang membicarakan masalah kekerasan.",
        "isCorrect": false
      }
    ],
    "explanation": "Menempuh jalur pelaporan resmi dan terstruktur terlebih dahulu melindungi korban dari potensi jeratan hukum siber dan teror balik netizen."
  },
  {
    "id": 90,
    "topic": "Hak Kerahasiaan Identitas Pelapor",
    "targetAudience": "smp_sma",
    "question": "Apakah seorang siswa yang melaporkan kekerasan berhak meminta identitasnya dirahasiakan oleh pihak sekolah?",
    "options": [
      {
        "text": "A. BERHAK PENUH. Aturan Permendikbudristek menjamin kerahasiaan identitas saksi dan korban untuk mencegah aksi pembalasan.",
        "isCorrect": true
      },
      {
        "text": "B. Tidak berhak, nama pelapor wajib diumumkan di pengeras suara sekolah.",
        "isCorrect": false
      },
      {
        "text": "C. Hanya berhak jika siswa tersebut adalah ketua OSIS.",
        "isCorrect": false
      }
    ],
    "explanation": "Prinsip perlindungan kerahasiaan identitas adalah mandat hukum wajib bagi seluruh tim penanganan kekerasan di sekolah."
  },
  {
    "id": 91,
    "topic": "Menghilangkan Stigma Ruang BK",
    "targetAudience": "smp_sma",
    "question": "Masih ada anggapan keliru bahwa 'Ruang BK adalah tempat siswa bermasalah atau anak nakal'. Fakta sebenarnya adalah...",
    "options": [
      {
        "text": "A. Ruang BK adalah ruang aman (safe space) bagi setiap siswa untuk konseling perkembangan diri, perlindungan mental, dan solusi masalah.",
        "isCorrect": true
      },
      {
        "text": "B. Ruang BK adalah sel tahanan mini di sekolah yang bertugas menghukum murid.",
        "isCorrect": false
      },
      {
        "text": "C. Masuk ruang BK otomatis membuat siswa tidak bisa naik kelas.",
        "isCorrect": false
      }
    ],
    "explanation": "Guru BK adalah sahabat siswa yang terikat kode etik empati dan kerahasiaan untuk mendampingi pemulihan dan potensi terbaikmu."
  },
  {
    "id": 92,
    "topic": "Kode Etik Kerahasiaan Konselor",
    "targetAudience": "smp_sma",
    "question": "Apa jaminan etika utama yang dipegang teguh oleh Guru Bimbingan dan Konseling (BK) saat menerima cerita siswa?",
    "options": [
      {
        "text": "A. Asas Kerahasiaan (Confidentiality): cerita pribadi siswa tidak akan disebarkan ke publik atau dijadikan bahan pergunjingan.",
        "isCorrect": true
      },
      {
        "text": "B. Bahwa semua cerita siswa akan diunggah ke majalah dinding sekolah.",
        "isCorrect": false
      },
      {
        "text": "C. Bahwa Guru BK wajib menceritakan rahasia siswa kepada seluruh guru saat rapat.",
        "isCorrect": false
      }
    ],
    "explanation": "Asas kerahasiaan adalah pilar profesionalisme konseling yang menjamin rasa aman penuh bagi setiap peserta didik."
  },
  {
    "id": 93,
    "topic": "Satgas TPPK Sekolah",
    "targetAudience": "smp_sma",
    "question": "Di setiap sekolah di Indonesia dibentuk satgas resmi TPPK (Tim Pencegahan dan Penanganan Kekerasan). Apa peran utamanya?",
    "options": [
      {
        "text": "A. Menerima laporan, mendampingi korban, memulihkan trauma, dan memproses penanganan kekerasan di sekolah secara adil dan cepat.",
        "isCorrect": true
      },
      {
        "text": "B. Menghukum siswa yang terlambat masuk barisan upacara bendera.",
        "isCorrect": false
      },
      {
        "text": "C. Mengumpulkan denda uang dari siswa yang melanggar seragam.",
        "isCorrect": false
      }
    ],
    "explanation": "TPPK adalah mandat Permendikbudristek No. 46/2023 untuk memastikan satuan pendidikan menjadi zona aman bebas dari segala bentuk kekerasan."
  },
  {
    "id": 94,
    "topic": "Prinsip Tanpa Menghakimi (Non-Judgmental)",
    "targetAudience": "smp_sma",
    "question": "Saat kamu menceritakan masalah atau kesalahan yang pernah kamu perbuat ke konselor BK, sikap konselor yang profesional adalah...",
    "options": [
      {
        "text": "A. Mendengarkan dengan empati tanpa menghakimi, membantu mengurai masalah, dan membimbing mencari jalan keluar pemulihan terbaik.",
        "isCorrect": true
      },
      {
        "text": "B. Langsung membentak dan mempermalukanmu di hadapan teman sekelas.",
        "isCorrect": false
      },
      {
        "text": "C. Meminta denda uang agar kesalahanmu tidak dilaporkan ke orang tua.",
        "isCorrect": false
      }
    ],
    "explanation": "Konseling yang memberdayakan berlandaskan penerimaan positif tanpa syarat untuk menumbuhkan kesadaran dan ketahanan karakter."
  },
  {
    "id": 95,
    "topic": "Korban Tidak Pernah Bersalah",
    "targetAudience": "smp_sma",
    "question": "Jika seseorang menjadi korban pelecehan atau perundungan, prinsip dasar keadilan yang wajib diyakini adalah...",
    "options": [
      {
        "text": "A. Korban TIDAK PERNAH bersalah atas kekerasan yang dialaminya; tanggung jawab penuh selalu berada pada pilihan tindakan pelaku.",
        "isCorrect": true
      },
      {
        "text": "B. Korban pasti bersalah karena memicu perilaku tersebut melalui gaya pakaian atau bicaranya.",
        "isCorrect": false
      },
      {
        "text": "C. Lebih baik memendam masalah sendiri agar nama baik sekolah tidak tercemar.",
        "isCorrect": false
      }
    ],
    "explanation": "Victim blaming adalah kekeliruan fatal. Siapa pun berhak atas rasa aman dan perlindungan tanpa syarat."
  },
  {
    "id": 96,
    "topic": "Alur Pelaporan Resmi di Sekolah",
    "targetAudience": "smp_sma",
    "question": "Bagaimana alur pelaporan kekerasan yang aman di sekolah jika siswa merasa takut melapor sendirian?",
    "options": [
      {
        "text": "A. Ajak sahabat/orang tua yang dipercaya, datang ke Ruang BK atau kotak aduan TPPK sekolah, dan sampaikan kronologi kejadian.",
        "isCorrect": true
      },
      {
        "text": "B. Menunggu sampai lulus sekolah baru kemudian membicarakannya.",
        "isCorrect": false
      },
      {
        "text": "C. Menuliskan surat kaleng fitnah tanpa identitas dan dilempar ke ruang guru.",
        "isCorrect": false
      }
    ],
    "explanation": "Membawa pendamping tepercaya mengurangi rasa cemas dan memastikan proses pelaporan berjalan lancar dan aman."
  },
  {
    "id": 97,
    "topic": "Layanan Darurat SAPA 129",
    "targetAudience": "smp_sma",
    "question": "Di Indonesia, terdapat saluran siaga darurat Kementerian PPPA untuk pengaduan kekerasan perempuan dan anak, yaitu...",
    "options": [
      {
        "text": "A. Hotline SAPA 129 (Telepon 129 atau WhatsApp 08111-129-129).",
        "isCorrect": true
      },
      {
        "text": "B. Nomor telepon kantor pos terdekat.",
        "isCorrect": false
      },
      {
        "text": "C. Layanan cek pulsa operator seluler.",
        "isCorrect": false
      }
    ],
    "explanation": "Hotline SAPA 129 adalah layanan resmi gratis pemerintah yang siap mendampingi korban kekerasan anak dan remaja 24 jam."
  },
  {
    "id": 98,
    "topic": "Hak Pemulihan Psikologis",
    "targetAudience": "smp_sma",
    "question": "Setelah mengalami perundungan atau pelecehan, selain sanksi bagi pelaku, apa hak terpenting yang wajib diperoleh korban?",
    "options": [
      {
        "text": "A. Hak pemulihan psikologis (konseling trauma healing), rasa aman bersekolah, dan perlindungan dari aksi balas dendam.",
        "isCorrect": true
      },
      {
        "text": "B. Diharuskan pindah sekolah agar pihak sekolah tidak repot.",
        "isCorrect": false
      },
      {
        "text": "C. Membayar uang administrasi penanganan kasus.",
        "isCorrect": false
      }
    ],
    "explanation": "Pemulihan kesehatan mental korban adalah fokus paling utama dalam penanganan kekerasan menurut regulasi perlindungan anak."
  },
  {
    "id": 99,
    "topic": "Mengenal Gejala Trauma Remaja",
    "targetAudience": "smp_sma",
    "question": "Apa tanda-tanda psikologis bahwa seorang teman sebaya mungkin sedang mengalami perundungan berat dan membutuhkan bantuan?",
    "options": [
      {
        "text": "A. Menjadi sangat pendiam/menarik diri, nilai akademik anjlok mendadak, takut berangkat sekolah, dan sering cemas berlebihan.",
        "isCorrect": true
      },
      {
        "text": "B. Suka berolahraga dan makan makanan sehat di kantin.",
        "isCorrect": false
      },
      {
        "text": "C. Aktif bertanya di kelas dan menyelesaikan PR tepat waktu.",
        "isCorrect": false
      }
    ],
    "explanation": "Peka terhadap perubahan perilaku teman sebaya membantu kita mengulurkan tangan pertolongan sebelum dampak trauma memburuk."
  },
  {
    "id": 100,
    "topic": "Nawasena Dara: Ruang Aman Bersama",
    "targetAudience": "smp_sma",
    "question": "Apa makna filosofis dari 'Nawasena Dara' (Masa Depan Cerah yang Berani) dalam game edukasi ini?",
    "options": [
      {
        "text": "A. Menumbuhkan generasi muda yang berani bersuara asertif menetapkan batasan, saling melindungi dalam solidaritas, dan mewujudkan sekolah bebas kekerasan.",
        "isCorrect": true
      },
      {
        "text": "B. Melatih siswa agar jago bertarung fisik melawan musuh di jalanan.",
        "isCorrect": false
      },
      {
        "text": "C. Membuktikan bahwa siapa yang paling kuat dialah yang berhak menguasai sekolah.",
        "isCorrect": false
      }
    ],
    "explanation": "Nawasena Dara adalah visi masa depan cerah di mana keberanian asertif dan solidaritas kasih sayang menciptakan ruang aman bagi seluruh anak bangsa."
  }
];

/**
 * Mengambil N soal acak yang terdistribusi seimbang dari bank 100 soal.
 * Setiap sesi permainan mengocok kumpulan 100 soal ini secara Fisher-Yates,
 * lalu mengacak pula letak opsi jawaban (A, B, C) di setiap soal.
 */
export function getRandomCuratedQuestions(count = 10, targetAudience = 'smp_sma') {
  let pool = [...SMP_SMA_QUESTIONS_BANK];

  if (targetAudience === 'smp') {
    pool = pool.filter((q) => q.targetAudience === 'smp' || q.targetAudience === 'smp_sma');
  } else if (targetAudience === 'sma') {
    pool = pool.filter((q) => q.targetAudience === 'sma' || q.targetAudience === 'smp_sma');
  }

  // Shuffle array Fisher-Yates across the entire 100 questions pool
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  // Ambil count teratas (misal 10 butir soal acak)
  const selected = pool.slice(0, count);

  // Acak urutan opsi jawaban (A, B, C) untuk setiap soal agar letak jawaban benar tidak pernah monoton
  return selected.map((q, idx) => {
    const shuffledOptions = [...q.options];
    for (let i = shuffledOptions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledOptions[i], shuffledOptions[j]] = [shuffledOptions[j], shuffledOptions[i]];
    }

    const prefixes = ['A. ', 'B. ', 'C. '];
    const cleanOptions = shuffledOptions.map((opt, optIdx) => {
      const cleanText = opt.text.replace(/^[A-C]\.\s*/, '');
      return {
        text: `${prefixes[optIdx] || ''}${cleanText}`,
        isCorrect: Boolean(opt.isCorrect),
      };
    });

    return {
      id: idx + 1,
      source: 'curated_smp_sma',
      topic: q.topic,
      targetAudience: q.targetAudience,
      question: q.question,
      options: cleanOptions,
      explanation: q.explanation,
    };
  });
}
