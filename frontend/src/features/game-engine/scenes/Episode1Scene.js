import Phaser from 'phaser';
import BasePlayerScene from './BasePlayerScene';
import { LEVEL_EDGE_MARGIN } from '../config/gameConfig';
import { getNpcByEpisode } from '../config/npcs';
import {
  EPISODE1_DIALOGUE,
  buildEpisode1RevisitDialogue,
  buildEpisode1CounselingContext,
} from '../dialogue/episode1Dialogue';
import DialogueBox from '../ui/DialogueBox';
import ObjectiveBriefing from '../ui/ObjectiveBriefing';
import { getCharacterName } from '../utils/characterName';
import { hasTalkedToNpc, markNpcTalked } from '../utils/progressStore';
import { pxToWorld } from '../utils/visibleBounds';
import { getEpisodeById } from '../config/episodes';

// Episode 1 - Awal yang Baru.
export default class Episode1Scene extends BasePlayerScene {
  constructor() {
    super('Episode1Scene');
  }

  // Override create() BasePlayerScene supaya bisa menumpuk satu langkah
  // TAMBAHAN setelah semua setup gameplay biasa selesai (super.create()
  // — termasuk player, NPC, HUD, touch controls, DAN
  // `this.uiInputLocked = false` di baris terakhirnya): briefing
  // objektif WAJIB dibaca sebelum pemain benar-benar dilepas bebas
  // bergerak. Makanya `this.uiInputLocked` di-set true LAGI di sini,
  // SETELAH super.create() selesai — kalau di-set di dalam
  // createBackground()/_createNpc() (dipanggil DARI DALAM
  // super.create(), lebih awal), nilainya akan tertimpa balik ke false
  // oleh baris terakhir super.create() itu sendiri.
  create(data) {
    super.create(data);

    this.uiInputLocked = true;
    this.player?.setVelocity(0, 0);
    this.player?.anims.stop();

    const episodeData = getEpisodeById(1);
    this.objectiveBriefing = new ObjectiveBriefing(this);
    this.objectiveBriefing.show({
      title: 'TUJUAN EPISODE',
      objectiveText:
        episodeData?.objective ??
        'Ajak bicara NPC di episode ini dan selesaikan dialognya.',
      onContinue: () => {
        this.uiInputLocked = false;
      },
    });
  }

  // Satu jalur kode untuk SEMUA orientasi (dulu portrait & landscape
  // punya cabang kode terpisah — disatukan supaya perilakunya konsisten
  // dan gampang dirawat):
  //
  // 1. Background asli ditampilkan APA ADANYA, proporsional (scale
  //    dihitung dari tinggi asli gambar supaya tinggi render PERSIS
  //    `height`), TIDAK diregangkan/didistorsi sama sekali.
  // 2. this.levelWidth = lebar asli gambar itu (naturalWidth), KECUALI
  //    kalau layar saat ini lebih lebar dari gambar aslinya (mis. layar
  //    landscape ultra-lebar) — dalam kasus itu, sisa celah di kanan
  //    diisi TILE KECIL dari gambar yang sama (bukan diregangkan),
  //    supaya tidak ada area kosong dan levelWidth tetap >= lebar layar.
  // 3. Kamera (_updatePortraitCamera di BasePlayerScene, sekarang
  //    berlaku universal) otomatis diam kalau levelWidth <= lebar layar
  //    (level sudah muat penuh), dan otomatis mulai mem-pan begitu
  //    karakter mendekati tepi kalau levelWidth lebih lebar — jadi tidak
  //    perlu logic kamera terpisah untuk portrait vs landscape lagi.
  createBackground(width, height) {
    this.finished = false;

    const source = this.textures.get('episode1-bg').getSourceImage();
    const scale = height / source.height;
    const naturalWidth = Math.round(source.width * scale);

    // Level minimal selebar layar saat ini, supaya karakter selalu
    // punya ruang jalan yang penuh terlihat di layar manapun.
    this.levelWidth = Math.max(naturalWidth, width);

    // Gambar asli, mulai persis dari x=0 (tepi kiri) — TIDAK
    // diregangkan, TIDAK di-tile untuk bagian ini.
    this.bg = this.add.image(naturalWidth / 2, height / 2, 'episode1-bg');
    this.bg.setDisplaySize(naturalWidth, height);
    this.bg.setDepth(0);

    // Kalau layar lebih lebar dari gambar aslinya, isi SISA celah di
    // kanan (dari x=naturalWidth sampai x=levelWidth) dengan tile kecil
    // dari gambar yang sama, supaya tidak ada area kosong dan karakter
    // tetap punya sesuatu untuk dijalani sampai levelWidth.
    const extraWidth = this.levelWidth - naturalWidth;
    if (extraWidth > 0) {
      const tile = this.add.tileSprite(
        naturalWidth + extraWidth / 2,
        height / 2,
        extraWidth,
        height,
        'episode1-bg',
      );
      tile.setTileScale(scale, scale);
      tile.setDepth(0);
    }

    this._createNpc();
  }

  // --- Quest NPC Rafi ---------------------------------------------
  // Rafi berdiri di jalur satu-satunya menuju ujung level (bukan di
  // sudut yang bisa dilewati begitu saja) — lihat episode-1-naskah-
  // quest.md §5. Pemain WAJIB menyelesaikan dialog dengannya (memilih
  // salah satu dari 3 opsi jawaban di titik cabang) sebelum zona
  // "selesai episode" di tepi kanan diaktifkan.
  _createNpc() {
    const npcConfig = getNpcByEpisode(1);
    if (!npcConfig) return;

    this.npcConfig = npcConfig;
    this.npcInDialogue = false;

    // FIX #3: kalau episode ini SUDAH PERNAH diselesaikan sebelumnya
    // (dicek dari cache progres yang diisi GameProgressBridge.jsx dari
    // GET /api/progress — sumber datanya database, bukan cuma state
    // lokal), berarti pemain sudah pernah bicara ke Rafi di
    // playthrough sebelumnya. Kalau pemain sengaja memilih ulang
    // Episode 1 dari EpisodeSelectScene, tidak perlu dipaksa mengulang
    // percakapan itu lagi — quest dianggap sudah lunas sejak awal.
    //
    // FIX: sebelumnya HANYA cek getCompletedEpisodes() (episode 1 harus
    // TUNTAS SEPENUHNYA dulu) — akibatnya kalau pemain baru sempat
    // ngobrol dengan Rafi tapi belum menuntaskan episode 1 (belum jalan
    // sampai ujung level), lalu lanjut main lagi nanti, ikon chat Kak
    // Dara hilang lagi dan dialog Rafi harus diulang dari nol padahal
    // progresnya sudah ada. hasTalkedToNpc() sekarang juga membaca
    // riwayat `choices` yang disimpan SEGERA setelah dialog Rafi
    // selesai (lihat markNpcTalked() di onClose bawah), jadi status ini
    // tetap benar walau episode 1 belum dituntaskan.
    this.npcTalked = hasTalkedToNpc(this.episodeId ?? 1);

    // FIX #4 (revisi): Rafi diposisikan tepat di this.groundY, sama
    // seperti player berpijak. Skala & offset sekarang dihitung dari
    // BOUNDING BOX KONTEN ASLI gambar (npcConfig.contentHeight /
    // bottomPadding — lihat catatan panjang di config/npcs.js), bukan
    // dari tinggi kanvas mentah. Sebelumnya origin (0.5,1) menempel ke
    // tepi bawah KANVAS (1000px), padahal kaki asli Rafi berhenti jauh
    // sebelum tepi itu (ada ruang kosong transparan di bawah) —
    // akibatnya dia tampak "melayang" di atas tanah dan lebih kecil
    // dari player. Sekarang:
    //   scale  = tinggi player / tinggi KONTEN asli (bukan tinggi kanvas)
    //   offsetY = bottomPadding * scale, digeser ke BAWAH groundY,
    //             supaya kaki sungguhan (bukan tepi kanvas) yang jatuh
    //             tepat di groundY.
    const npcX = this.levelWidth * npcConfig.xRatio;
    const npcTexture = this.textures.exists(npcConfig.portraitKey)
      ? npcConfig.portraitKey
      : null;

    if (npcTexture) {
      // FIX: dulu pakai `this.player?.displayHeight` sebagai fallback ke
      // 200 kalau this.player belum ada — TAPI this.player MEMANG belum
      // pernah ada di titik ini (createBackground() yang memanggil
      // _createNpc() ini dijalankan SEBELUM this.player dibuat di
      // create()), jadi fallback 200 itu SELALU yang dipakai, bukan
      // 240 yang sesungguhnya. Sekarang pakai this.playerDisplayHeight
      // (di-set BasePlayerScene.create() sebelum createBackground()
      // dipanggil, lihat gameConfig.PLAYER_DISPLAY_HEIGHT) — konstanta
      // yang sama, tidak perlu menunggu sprite pemain selesai dibuat.
      const targetHeight = this.playerDisplayHeight;
      const source = this.textures.get(npcTexture).getSourceImage();
      const contentHeight = npcConfig.contentHeight || source.height;
      const bottomPadding = npcConfig.bottomPadding || 0;
      const scale = targetHeight / contentHeight;

      this.npcSprite = this.add.image(
        npcX,
        this.groundY + bottomPadding * scale,
        npcTexture,
      );
      this.npcSprite.setOrigin(0.5, 1);
      this.npcSprite.setScale(scale);
      // Tinggi konten yang benar-benar terlihat (dipakai untuk
      // memposisikan prompt/label di atas kepala, bukan displayHeight
      // kanvas penuh yang termasuk ruang kosong).
      this._npcVisualHeight = contentHeight * scale;
    } else {
      // Fallback placeholder kalau aset belum ter-load (jaringan
      // gagal dsb.) — tetap ada objek yang bisa dijadikan target
      // proximity check supaya quest tidak "hilang" secara diam-diam.
      this.npcSprite = this.add.rectangle(npcX, this.groundY, 80, 200, 0x3a2e2e);
      this.npcSprite.setOrigin(0.5, 1);
      this._npcVisualHeight = 200;
    }
    this.npcSprite.setDepth(1);
    // FIX (mobile): tap/klik langsung pada karakter Rafi juga membuka
    // dialog (dulu cuma bisa lewat tombol keyboard E) — lihat juga
    // this.npcPrompt di bawah yang sama-sama interaktif untuk area tap
    // yang lebih besar/mudah kena jari.
    this.npcSprite.setInteractive({ useHandCursor: true });
    this.npcSprite.on('pointerdown', () => this._tryTalkToNpc());
    this.registerLockable(this.npcSprite);

    // --- Prompt "bicara" tepat di atas kepala Rafi ---
    // FIX (revert): balik ke gaya "[E] Ajak bicara" seperti semula
    // (bukan gaya "○─── ... ───○" yang sempat dipakai) — gaya bulatan
    // itu sekarang dipindah jadi QUEST GUIDE terpisah di bawah HUD
    // profil (lihat this.setQuestGuide() di bawah), bukan menempel di
    // kepala NPC. Prompt di sini murni indikator "kamu bisa berinteraksi
    // di sini", makanya ditambah "(Klik)" supaya jelas juga bisa
    // disentuh/diklik langsung, tidak cuma lewat tombol keyboard E.
    const promptFont = pxToWorld(this, 15);
    const promptY = this.groundY - this._npcVisualHeight - 26;
    this.npcPrompt = this.add
      .text(npcX, promptY, '[E] Ajak bicara (Klik)', {
        fontFamily: '"Pixelify Sans", monospace',
        fontSize: `${promptFont}px`,
        color: '#ffdd57',
        backgroundColor: '#1a1a2ecc',
        padding: { x: 10, y: 5 },
      })
      .setOrigin(0.5)
      .setDepth(2)
      .setVisible(false)
      .setInteractive({ useHandCursor: true });
    this.npcPrompt.on('pointerdown', () => this._tryTalkToNpc());
    this.registerLockable(this.npcPrompt);

    this.tweens.add({
      targets: this.npcPrompt,
      y: promptY - 8,
      duration: 550,
      yoyo: true,
      repeat: -1,
    });

    // FIX #2: hint yang muncul di zona AKHIR LEVEL (bukan di dekat
    // Rafi lagi) kalau pemain coba lanjut padahal belum bicara ke
    // Rafi — lihat onSceneUpdate().
    const hintFont = pxToWorld(this, 15);
    this.endBlockHint = this.add
      .text(this.levelWidth - LEVEL_EDGE_MARGIN, this.groundY - 60, 'Sepertinya ada yang perlu\ndiselesaikan dulu di sini...', {
        fontFamily: '"Pixelify Sans", monospace',
        fontSize: `${hintFont}px`,
        color: '#ffffff',
        align: 'center',
        backgroundColor: '#1a1a2e',
        padding: { x: 10, y: 6 },
      })
      .setOrigin(0.5, 1)
      .setDepth(2)
      .setVisible(false);

    this.dialogueBox = new DialogueBox(this);
    this.interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);

    // FIX: ikon chat "Kak Dara" TIDAK ditampilkan sejak awal episode —
    // baru muncul setelah pemain selesai berdialog dengan Rafi (lihat
    // onClose di _startNpcDialogue()). Kalau quest ini sudah pernah
    // dituntaskan sebelumnya (this.npcTalked true dari cache progres),
    // langsung tampilkan sejak awal, tidak perlu menunggu lagi.
    this.setChatButtonVisible(Boolean(this.npcTalked));

    // Quest guide "○ ── Ajak bicara Rafi ──" di bawah HUD profil —
    // tersembunyi begitu quest ini selesai (lihat updateQuestGuide()).
    this.updateQuestGuide();
  }

  /** Sinkronkan penanda quest di bawah HUD profil dengan status
   * this.npcTalked — dipanggil saat NPC dibuat & tiap kali quest utama
   * selesai. */
  updateQuestGuide() {
    if (this.npcTalked) {
      this.clearQuestGuide();
    } else {
      this.setQuestGuide(`○ ── Ajak bicara ${this.npcConfig.name} ──`);
    }
  }

  // Dipanggil baik dari keyboard (E) maupun tap/klik langsung ke
  // sprite/prompt Rafi — satu jalur logic supaya kedua cara input
  // (desktop & mobile) selalu berperilaku identik.
  //
  // FIX (gaya Harvest Moon): dulu, sekali quest utama selesai
  // (this.npcTalked === true), NPC ini jadi TIDAK BISA diajak bicara
  // lagi sama sekali. Sekarang Rafi tetap bisa diajak ngobrol lagi
  // kapan pun — cuma isinya bukan naskah quest yang sama, melainkan
  // obrolan ringan singkat (lihat _startRevisitDialogue()), persis pola
  // NPC di Harvest Moon yang tetap bisa disapa tiap hari walau
  // "cutscene" perkenalannya cuma sekali.
  _tryTalkToNpc() {
    if (this.npcInDialogue) return;
    if (!this.npcPrompt?.visible) return; // di luar jangkauan interaksi
    // FIX: cooldown singkat setelah dialog SEBELUMNYA baru saja
    // ditutup — mencegah key E yang masih ter-hold (autorepeat
    // browser) atau tap ganda langsung membuka dialog lagi seketika,
    // yang dulu terasa seperti dialog "tidak ada ujungnya" (nutup lalu
    // kebuka lagi berkali-kali tanpa jeda).
    if (this.time.now < (this._npcInteractCooldownUntil || 0)) return;
    if (this.npcTalked) {
      this._startRevisitDialogue();
    } else {
      this._startNpcDialogue();
    }
  }

  /** Obrolan ringan singkat kalau diajak bicara LAGI setelah quest
   * utama selesai — tidak ada choices, tidak memengaruhi skor/progres,
   * dan TIDAK menawarkan chatbot Kak Dara lagi (itu cuma muncul sekali,
   * persis setelah quest utama). */
  _startRevisitDialogue() {
    if (this.npcInDialogue) return;
    this.npcInDialogue = true;
    this.npcPrompt.setVisible(false);
    this.uiInputLocked = true;
    this.player?.setVelocityX(0);
    this.player?.anims.stop();

    this.dialogueBox.open({
      dialogueTree: buildEpisode1RevisitDialogue(),
      npcPortraitKey: this.npcConfig.portraitKey,
      npcName: this.npcConfig.name,
      playerName: getCharacterName(),
      onClose: () => {
        this.npcInDialogue = false;
        this.uiInputLocked = false;
        this._npcInteractCooldownUntil = this.time.now + 400;
      },
    });
  }

  _startNpcDialogue() {
    if (this.npcInDialogue) return;
    this.npcInDialogue = true;
    this.npcPrompt.setVisible(false);
    this.uiInputLocked = true;
    this.player?.setVelocityX(0);
    this.player?.anims.stop();

    this.dialogueBox.open({
      dialogueTree: EPISODE1_DIALOGUE,
      npcPortraitKey: this.npcConfig.portraitKey,
      npcName: this.npcConfig.name,
      playerName: getCharacterName(),
      // FIX #1: tawaran "ngobrol dengan Kak Dara atau lanjut main"
      // sekarang muncul di SINI — tepat setelah dialog dengan Rafi
      // selesai — bukan lagi menempel di alur pindah-episode
      // (finishEpisode/jurnal refleksi tetap jalan seperti biasa nanti
      // di ujung level, itu proses terpisah).
      onClose: async (collectedChoices) => {
        this.npcTalked = true;
        this.npcChoices = collectedChoices;

        // FIX: simpan status "sudah ngobrol dengan Rafi" SEKARANG JUGA
        // (bukan menunggu episode 1 tuntas) — lihat markNpcTalked() di
        // progressStore.js untuk alasan lengkapnya. Ini yang membuat
        // ikon chat Kak Dara tetap kebuka kalau pemain keluar lalu
        // lanjut main lagi sebelum sempat menuntaskan episode 1.
        markNpcTalked(this.episodeId ?? 1, collectedChoices);

        // FIX: baru sekarang ikon chat "Kak Dara" ditampilkan — persis
        // setelah dialog dengan Rafi selesai, bukan sejak awal episode.
        this.setChatButtonVisible(true);
        // Quest guide "○ ── Ajak bicara Rafi ──" di bawah HUD profil
        // ikut disembunyikan begitu quest ini tuntas.
        this.updateQuestGuide();

        const ui = window.__nawasenadaraUI;
        if (ui?.offerCounseling) {
          await ui.offerCounseling({
            episodeId: this.episodeId ?? 1,
            npcName: this.npcConfig.name,
            // Kak Dara langsung tahu isi obrolan Rafi tanpa pemain
            // perlu ketik ulang manual — lihat buildEpisode1
            // CounselingContext() & catatan panjang di
            // GameUIBridge.jsx openChatbot().
            autoContext: this.getCounselingAutoContext(),
          });
        }

        this.npcInDialogue = false;
        this.uiInputLocked = false;
        this._npcInteractCooldownUntil = this.time.now + 400;
      },
    });
  }

  // Zona "selesai episode": jalan sampai ke ujung kanan level, TAPI
  // hanya aktif setelah quest NPC Rafi selesai (this.npcTalked).
  // this.levelWidth otomatis menyesuaikan (lebar gambar asli, atau
  // ditambah tile kecil kalau layar lebih lebar), jadi kondisi ini
  // tidak perlu berubah apa pun untuk orientasi manapun.
  // Dipanggil GameUIBridge (lewat offerCounseling di atas, MAUPUN
  // tombol ikon chat manual di BasePlayerScene.createChatButton) untuk
  // membangun pesan pembuka otomatis ke Kak Dara dari pilihan dialog
  // Rafi yang sudah diambil pemain (this.npcChoices, diisi di onClose
  // _startNpcDialogue di atas). Null kalau pemain belum sempat
  // mengobrol dengan Rafi sama sekali (chat icon memang baru muncul
  // SETELAH npcTalked, jadi seharusnya selalu ada isi di sini).
  getCounselingAutoContext() {
    return buildEpisode1CounselingContext(this.npcChoices);
  }

  onSceneUpdate() {
    if (this.finished) return;
    if (!this.npcSprite) return;

    // --- Proximity check ke Rafi ---
    // FIX: prompt "[E] Ajak bicara (Klik)" sekarang tetap aktif WALAU
    // this.npcTalked sudah true — supaya Rafi tetap bisa disapa lagi
    // gaya Harvest Moon (lihat _tryTalkToNpc/_startRevisitDialogue).
    // Dulu proximity check ini di-skip total begitu npcTalked true,
    // sehingga prompt tidak pernah muncul lagi & NPC jadi "mati" setelah
    // quest utama selesai.
    if (!this.npcInDialogue) {
      const dist = Math.abs(this.player.x - this.npcSprite.x);
      const inRange = dist <= this.npcConfig.interactionRadius;
      this.npcPrompt.setVisible(inRange);
      if (inRange && Phaser.Input.Keyboard.JustDown(this.interactKey)) {
        this._tryTalkToNpc();
      }
    }

    if (this.npcInDialogue) return;

    const endZoneX = this.levelWidth - LEVEL_EDGE_MARGIN;

    // FIX #2: Rafi TIDAK LAGI memblokir jalan tepat di sampingnya.
    // Pemain bebas lewat dan jalan terus seperti biasa mau lanjut ke
    // episode berikutnya — hambatannya baru muncul TEPAT di zona akhir
    // level itu sendiri (persis titik yang sama dipakai untuk
    // finishEpisode di bawah), supaya terasa seperti "aku memang lagi
    // coba lanjut ke episode berikutnya, cuma belum bisa karena belum
    // ngobrol sama Rafi" — bukan tembok tak kasat mata di tengah jalan.
    if (!this.npcTalked) {
      if (this.player.x > endZoneX) {
        this.player.x = endZoneX;
        this.player?.setVelocityX(0);
      }
      this.endBlockHint.setVisible(this.player.x >= endZoneX - 4);
      return;
    }

    this.endBlockHint.setVisible(false);

    if (this.player.x > endZoneX) {
      this.finished = true;

      // FIX: sebelumnya ending ditampilkan sebagai kartu overlay di
      // atas gameplay (ui/EndingCard.js, sekarang tidak dipakai lagi)
      // dan pernah dilaporkan tombol "Lanjut"-nya kadang tidak bisa
      // ditekan. Sekarang ending jadi SCENE PENUH LAYAR tersendiri
      // (EpisodeEndingScene — gaya starfield fade-in yang sama dengan
      // EpisodeIntroScene) yang pakai pola "tap di mana saja untuk
      // lanjut", sama seperti yang sudah terbukti solid dipakai layar
      // intro episode. Ending itu sendiri dihitung DI DALAM
      // EpisodeEndingScene dari `choices` yang dikirim di bawah (lihat
      // utils/emotionEnding.js) — bukan dihitung di sini — supaya cuma
      // ada SATU sumber kebenaran untuk logic itu.
      this.uiInputLocked = true;
      this.player?.setVelocity(0, 0);
      this.player?.anims.stop();
      this.tweens.add({
        targets: this.player,
        alpha: 0,
        duration: 250,
        ease: 'Sine.easeOut',
      });

      const choices = this.npcChoices || [];
      // episodeId=1 selalu, isLastEpisode=false (masih ada 8 episode
      // lagi). EpisodeEndingScene sendiri yang urus jurnal refleksi
      // wajib + completeEpisode() + pindah ke intro episode berikutnya
      // setelah pemain menekan lanjut (persis alur finishEpisode() lama
      // di BasePlayerScene, diduplikasi di sana karena scene ini sudah
      // pasti di-shutdown Phaser begitu scene baru itu start).
      this.scene.start('EpisodeEndingScene', { episodeId: 1, isLastEpisode: false, choices });
    }
  }
}
