import Phaser from 'phaser';
import BasePlayerScene from './BasePlayerScene';
import { LEVEL_EDGE_MARGIN } from '../config/gameConfig';
import { getNpcByEpisode } from '../config/npcs';
import {
  EPISODE3_DIALOGUE,
  buildEpisode3CounselingContext,
} from '../dialogue/episode3Dialogue';
import DialogueBox from '../ui/DialogueBox';
import ObjectiveBriefing from '../ui/ObjectiveBriefing';
import { getCharacterName } from '../utils/characterName';
import { hasTalkedToNpc, markNpcTalked } from '../utils/progressStore';
import { pxToWorld } from '../utils/visibleBounds';
import { getEpisodeById } from '../config/episodes';

// ================================================================
// EPISODE 3 — "Pesan dari Orang Asing"
// ================================================================
//
// Konsep Visual Sinematik & Kreatif:
// 1. Background kamar tidur Dara tetap konsisten menggunakan artwork asli
//    (public/scenes/episode-3-bg.jpg) tanpa diganti-ganti.
// 2. Saat Dara berinteraksi dengan ponsel di meja belajar, muncul
//    first-person POV: kedua tangan Dara memegang smartphone di depan
//    pemain (public/scenes/ep3-phone-pov.png) di atas latar kamar yang ada.
// 3. DI DALAM LAYAR SMARTPHONE:
//    Seluruh obrolan (chat masuk dari @bayang_kelabu91 dan balasan pilihan
//    Dara) direalisasikan langsung sebagai antarmuka chat Instagram/DM
//    interaktif dengan bubble chat, avatar, status online/mengetik,
//    dan auto-scroll yang hidup!
// 4. Suasana kamar di latar belakang bereaksi dinamis terhadap setiap tahap
//    obrolan (Tension Stages):
//      - Fase A (Awal): Kamar hangat & tenang, DM pertama masuk.
//      - Fase B (Curiga): Kamar meredup dingin kebiruan, lampu meja flicker.
//      - Fase C (Ancaman): Kamar gelap mencekam, detak jantung berdenyut di
//        tepi layar, getaran ponsel haptic hebat.
//      - Fase D (Keputusan Berani / Blokir): Stempel "AKUN TELAH DIBLOKIR"
//        tercap tegas di layar HP, suasana kamar seketika hangat & aman kembali!
// ================================================================

export default class Episode3Scene extends BasePlayerScene {
  constructor() {
    super('Episode3Scene');
  }

  // Override: mainkan tema suspense mencekam, BUKAN lo-fi chill default.
  // Dipanggil oleh BasePlayerScene.create() — sehingga lo-fi chill TIDAK
  // PERNAH dimulai dan tidak ada tabrakan audio.
  _startSceneBGM() {
    this.audioManager.startSuspenseBGM();
  }

  create(data) {
    super.create(data);

    // Patch ukuran karakter: 1.5x lebih besar, pijakan kaki tetap sama
    const newGroundY = 720 - 60;
    const newDisplayHeight = 485; // 525 - 20%
    const newScale = newDisplayHeight / 400;

    this.groundY = newGroundY;
    this.playerDisplayHeight = newDisplayHeight;
    this.spriteScale = newScale;

    if (this.player) {
      this.player.setScale(newScale);
      this.player.setY(newGroundY);
      // Karakter utama berada di depan meja & HP (depth 5) agar objek HP tidak melayang di depan karakter
      this.player.setDepth(5);
      this.physics.world.setBounds(0, 0, this.levelWidth, 720);
    }

    this.uiInputLocked = true;
    this.player?.setVelocity(0, 0);
    this.player?.anims.stop();

    const episodeData = getEpisodeById(3);
    this.objectiveBriefing = new ObjectiveBriefing(this);
    this.objectiveBriefing.show({
      title: 'TUJUAN EPISODE',
      objectiveText:
        episodeData?.objective ??
        'Perhatikan ponsel Dara yang bergetar di atas meja. Klik ponsel untuk membaca pesannya dan buat keputusan yang tepat.',
      onContinue: () => {
        this.uiInputLocked = false;
        // Resume AudioContext saat interaksi pertama pemain (autoplay policy)
        if (this.audioManager) {
          this.audioManager.resume();
          // Jika BGM belum jalan (AudioContext masih suspended saat _startSceneBGM),
          // mulai ulang sekarang
          if (!this.audioManager.bgmPlaying) {
            this.audioManager.startSuspenseBGM();
          }
        }
      },
    });
  }

  createBackground(width, height) {
    this.finished = false;

    const bgKey = 'episode3-bg';
    const source = this.textures.get(bgKey).getSourceImage();
    const scale = height / source.height;
    const naturalWidth = Math.round(source.width * scale);

    this.levelWidth = Math.max(naturalWidth, width);

    // Background kamar asli
    this.bg = this.add.image(naturalWidth / 2, height / 2, bgKey);
    this.bg.setDisplaySize(naturalWidth, height);
    this.bg.setDepth(0);

    const extraWidth = this.levelWidth - naturalWidth;
    if (extraWidth > 0) {
      const tile = this.add.tileSprite(
        naturalWidth + extraWidth / 2,
        height / 2,
        extraWidth,
        height,
        bgKey,
      );
      tile.setTileScale(scale, scale);
      tile.setDepth(0);
    }

    this._createAtmosphericLayers(width, height);
    this._createPhoneObject();
  }

  // --- Lapisan Efek Suasana Sinematik (Dynamic Atmosphere) --------
  _createAtmosphericLayers(width, height) {
    // 1. Lapisan kegelapan malam dingin (biru tua pekat)
    this._ambientDarkness = this.add
      .rectangle(width / 2, height / 2, width * 1.5, height * 1.5, 0x050718, 0)
      .setScrollFactor(0)
      .setDepth(8);

    // 2. Lapisan detak jantung (heartbeat vignette merah)
    this._heartbeatVignette = this.add
      .rectangle(width / 2, height / 2, width * 1.5, height * 1.5, 0x4a0209, 0)
      .setScrollFactor(0)
      .setDepth(9);

    // 3. Lapisan kehangatan & kelegaan (kuning keemasan lembut)
    this._warmSafeOverlay = this.add
      .rectangle(width / 2, height / 2, width * 1.5, height * 1.5, 0xffd175, 0)
      .setScrollFactor(0)
      .setDepth(10);
  }

  // --- Objek ponsel interaktif di atas meja belajar --------------
  _createPhoneObject() {
    const npcConfig = getNpcByEpisode(3);
    if (!npcConfig) return;

    this.npcConfig = npcConfig;
    this.npcInDialogue = false;
    this.phoneTalked = hasTalkedToNpc(this.episodeId ?? 3);

    // Posisi di atas meja belajar samping laptop (xRatio 0.58)
    const phoneX = this.levelWidth * (npcConfig.xRatio ?? 0.58);
    const phoneOffsetY = 240; // Di atas meja belajar kayu
    const phoneY = this.groundY - phoneOffsetY;

    // Halo cahaya biru neon di meja
    this._phoneHalo = this.add
      .ellipse(phoneX, phoneY + 28, 48, 14, 0x00f0ff, 0.45)
      .setDepth(1);

    // Sprite pixel art smartphone custom di atas meja
    this._phoneSprite = this.add
      .image(phoneX, phoneY, 'phone-ep3')
      .setScale(0.55)
      .setDepth(2)
      .setInteractive({ useHandCursor: true });

    // Animasi getar ponsel sebelum dibaca
    if (!this.phoneTalked) {
      this.tweens.add({
        targets: this._phoneSprite,
        x: { from: phoneX - 2, to: phoneX + 2 },
        duration: 75,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      this.tweens.add({
        targets: this._phoneHalo,
        alpha: { from: 0.25, to: 0.65 },
        scaleX: { from: 0.85, to: 1.15 },
        duration: 500,
        yoyo: true,
        repeat: -1,
      });

      // Dot notifikasi merah yang berdenyut
      this._notifBadge = this.add
        .circle(phoneX + 16, phoneY - 26, 6, 0xff3b30)
        .setDepth(3);

      this.tweens.add({
        targets: this._notifBadge,
        scale: { from: 0.8, to: 1.3 },
        duration: 400,
        yoyo: true,
        repeat: -1,
      });

      // SFX getar ponsel berkala di meja kayu setiap 3.5 detik sebelum dibuka
      this._tableVibrateTimer = this.time.addEvent({
        delay: 3500,
        loop: true,
        callback: () => {
          if (!this.phoneTalked && !this.npcInDialogue) {
            this.audioManager?.playPhoneVibrate();
          }
        },
      });
    }

    // Prompt teks interaksi di atas ponsel
    const promptFont = pxToWorld(this, 14);
    const promptBaseY = phoneY - 48;
    this.npcPrompt = this.add
      .text(phoneX, promptBaseY, '[E] Cek Ponsel (Klik)', {
        fontFamily: '"Pixelify Sans", monospace',
        fontSize: `${promptFont}px`,
        color: '#ff6b6b',
        backgroundColor: '#1a0a2ecc',
        padding: { x: 10, y: 5 },
      })
      .setOrigin(0.5)
      .setDepth(6)
      .setVisible(false)
      .setInteractive({ useHandCursor: true });

    this.npcPrompt.on('pointerdown', () => this._tryOpenPhone());
    this._phoneSprite.on('pointerdown', () => this._tryOpenPhone());
    this.registerLockable(this.npcPrompt);
    this.registerLockable(this._phoneSprite);

    this.tweens.add({
      targets: this.npcPrompt,
      y: promptBaseY - 8,
      duration: 600,
      yoyo: true,
      repeat: -1,
    });

    this.dialogueBox = new DialogueBox(this);
    this.interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);

    // Blokade ujung level
    const hintFont = pxToWorld(this, 15);
    this.endBlockHint = this.add
      .text(
        this.levelWidth - LEVEL_EDGE_MARGIN,
        this.groundY - 60,
        'Sepertinya ada yang perlu\ndiselesaikan dulu...',
        {
          fontFamily: '"Pixelify Sans", monospace',
          fontSize: `${hintFont}px`,
          color: '#ffffff',
          align: 'center',
          backgroundColor: '#1a0a2e',
          padding: { x: 10, y: 6 },
        },
      )
      .setOrigin(0.5, 1)
      .setDepth(2)
      .setVisible(false);

    this.setChatButtonVisible(Boolean(this.phoneTalked));
    this.updateQuestGuide();
  }

  updateQuestGuide() {
    if (this.phoneTalked) {
      this.clearQuestGuide();
    } else {
      this.setQuestGuide('○ ── Cek ponsel Dara di meja ──');
    }
  }

  _tryOpenPhone() {
    if (this.npcInDialogue) return;
    if (!this.npcPrompt?.visible) return;
    if (this.time.now < (this._npcInteractCooldownUntil || 0)) return;

    if (this._tableVibrateTimer) {
      this._tableVibrateTimer.remove();
      this._tableVibrateTimer = null;
    }
    if (this.audioManager) {
      this.audioManager.resume();
      this.audioManager.playPhoneVibrate();
    }

    this._openPhoneDialogue();
  }

  // --- POV Tangan & Layar Chat Interaktif ------------------------
  _setupPovPhone() {
    const { width, height } = this.scale;

    if (this._povContainer) {
      this._povContainer.destroy();
    }

    this._povContainer = this.add.container(width / 2, height + 450).setDepth(15).setScrollFactor(0);

    // Sprite Tangan + Smartphone POV transparan
    this._phonePovSprite = this.add
      .image(0, 0, 'phone-ep3-pov')
      .setOrigin(0.5, 1);

    // Target tinggi tampilan: ~72% tinggi canvas
    const targetH = height * 0.72;
    const povScale = targetH / this._phonePovSprite.height;
    this._phonePovSprite.setScale(povScale);
    this._povScale = povScale;

    // Parameter koordinat layar HP:
    // Canvas asli 844x685, layar HP di x: 269..508 (pusat x=388.5, offset dari tengah 422: -33.5px)
    const screenCenterX = -33.5 * povScale;
    const screenW = (508 - 269) * povScale; // ~ 172px

    // Area chat di atas jempol: dari bawah header (y=94) sampai atas jempol (y=316)
    // Supaya chat 100% jernih, tidak terpotong atau menimpa jempol & kuku
    const chatTopY = (94 - 685) * povScale; // ~ -425px pada scale 0.72
    const chatBottomY = (316 - 685) * povScale; // ~ -265px pada scale 0.72
    const chatH = chatBottomY - chatTopY; // ~ 160px

    this._screenCenterX = screenCenterX;
    this._screenW = screenW;
    this._chatTopY = chatTopY;
    this._chatBottomY = chatBottomY;
    this._chatH = chatH;

    // Header bar info di layar HP:
    // Avatar berada di x: 288..312, y: 62..86.
    // Username diletakkan tepat di sebelah kanan avatar di x = 316 (offset: 316 - 422 = -106px)
    // Tepi kanan layar di x = 504 (offset: +82px). Total ruang tersedia: ~135px.
    const headerTextX = (316 - 422) * povScale;
    const headerTitleY = (69 - 685) * povScale;
    const headerStatusY = (81 - 685) * povScale;

    this._povUserTitle = this.add
      .text(headerTextX, headerTitleY, '@bayang_kelabu91', {
        fontFamily: '"Pixelify Sans", monospace',
        fontSize: '9.5px',
        fontStyle: 'bold',
        color: '#f8fafc',
      })
      .setOrigin(0, 0.5);

    this._povStatusText = this.add
      .text(headerTextX, headerStatusY, 'Online', {
        fontFamily: '"Pixelify Sans", monospace',
        fontSize: '8px',
        color: '#4ade80',
      })
      .setOrigin(0, 0.5);

    // Container aliran pesan chat (chat stream)
    this._chatStreamContainer = this.add.container(screenCenterX, chatBottomY - 4);
    this._chatBubbles = [];
    this._chatStreamTotalH = 0;

    // Mask dinamis: membatasi pesan chat HANYA tampil di dalam kaca layar HP (tidak keluar ke kamar/notch)
    this._chatMaskGfx = this.make.graphics();
    this._chatMask = this._chatMaskGfx.createGeometryMask();
    this._chatStreamContainer.setMask(this._chatMask);
    this._updateChatMask();

    // Container stempel "AKUN TELAH DIBLOKIR"
    this._stampContainer = this.add.container(screenCenterX, (chatTopY + chatBottomY) / 2).setVisible(false);

    const stampBg = this.add
      .rectangle(0, 0, screenW * 0.90, 36, 0xd00000, 0.95)
      .setStrokeStyle(2, 0xffffff, 1);

    const stampText = this.add
      .text(0, 0, '🔒 AKUN DIBLOKIR', {
        fontFamily: '"Pixelify Sans", monospace',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    this._stampContainer.add([stampBg, stampText]);

    this._povContainer.add([
      this._phonePovSprite,
      this._povUserTitle,
      this._povStatusText,
      this._chatStreamContainer,
      this._stampContainer,
    ]);

    // Slide up masuk ke layar (mask mengikuti posisi ponsel secara real-time)
    this.tweens.add({
      targets: this._povContainer,
      y: height + 20,
      duration: 650,
      ease: 'Back.easeOut',
      onUpdate: () => {
        this._updateChatMask();
      },
      onComplete: () => {
        this._updateChatMask();
      },
    });
  }

  // --- Menambahkan Pesan Chat ke Layar Smartphone -------------
  _addPhoneChatMessage({ sender, text, isThreat = false }) {
    if (!this._chatStreamContainer || !this._povContainer) return;

    // Bersihkan kutipan atau teks pilihan yang panjang
    const cleanText = text.replace(/^"|"$/g, '').trim();
    if (!cleanText) return;

    const screenW = this._screenW || 172;
    const maxBubbleW = Math.floor(screenW * 0.82);
    const isBayang = sender === 'bayang_kelabu';
    const isDara = sender === 'dara' || sender === 'player';
    const isSystem = sender === 'system';

    // Buat container untuk satu bubble chat
    const bubbleContainer = this.add.container(0, 0);
    if (this._chatMask) {
      bubbleContainer.setMask(this._chatMask);
    }

    const fontSize = 9.5;
    const paddingX = 7;
    const paddingY = 5;

    const msgText = this.add.text(0, 0, cleanText, {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: `${fontSize}px`,
      color: isSystem ? '#94a3b8' : isThreat ? '#fee2e2' : isDara ? '#ffffff' : '#f1f5f9',
      wordWrap: { width: maxBubbleW - paddingX * 2 },
      lineSpacing: 1,
      align: isSystem ? 'center' : 'left',
    });

    const bubbleW = Math.max(Math.ceil(msgText.width + paddingX * 2), 40);
    const bubbleH = Math.ceil(msgText.height + paddingY * 2);

    // Warna bubble
    let bgColor = 0x1e293b;
    let strokeColor = 0x475569;
    if (isSystem) {
      bgColor = 0x0f172a;
      strokeColor = 0x334155;
    } else if (isDara) {
      bgColor = 0x0284c7; // Biru DM balasan Dara
      strokeColor = 0x38bdf8;
    } else if (isThreat) {
      bgColor = 0x7f1d1d; // Merah ancaman
      strokeColor = 0xef4444;
    }

    const bubbleBg = this.add
      .rectangle(0, 0, bubbleW, bubbleH, bgColor, 0.95)
      .setStrokeStyle(1, strokeColor, 0.8);

    // Tentukan perataan horizontal bubble di layar HP
    let posX = 0;
    if (isSystem) {
      posX = 0; // Ditengah
    } else if (isDara) {
      // Di sisi kanan layar
      posX = screenW / 2 - bubbleW / 2 - 6;
    } else {
      // Di sisi kiri layar
      posX = -screenW / 2 + bubbleW / 2 + 6;
    }

    bubbleBg.setPosition(posX, 0);
    msgText.setPosition(posX - bubbleW / 2 + paddingX, -bubbleH / 2 + paddingY);

    bubbleContainer.add([bubbleBg, msgText]);

    // Bubble baru selalu solid dan terlihat
    bubbleContainer.setAlpha(1);

    // Tempatkan bubble baru ke dalam container chat stream
    this._chatStreamContainer.add(bubbleContainer);

    this._chatBubbles.push({
      container: bubbleContainer,
      height: bubbleH,
    });

    // Batasi tinggi feed: pastikan total tinggi pesan di layar tidak melebihi area kaca bersih
    // Ruang kaca bersih di atas jempol adalah ~155px. Beri batas aman 25px dari header (maxFeedH ~ 130px).
    const maxFeedH = Math.max((this._chatH || 155) - 25, 110);
    while (this._chatBubbles.length > 1) {
      let totalH = 0;
      for (const b of this._chatBubbles) {
        totalH += b.height + 8;
      }
      if (totalH > maxFeedH) {
        const oldest = this._chatBubbles.shift();
        this.tweens.killTweensOf(oldest.container);
        oldest.container.destroy();
      } else {
        break;
      }
    }

    // Susun ulang posisi Y semua bubble secara deterministik dari bawah ke atas!
    // Ini menjamin 100% TIDAK AKAN PERNAH bertumpuk walau pesan datang berurutan cepat.
    this._relayoutChatBubbles(true);

    // Efek pop-in halus pada skala
    bubbleContainer.setScale(0.92);
    this.tweens.add({
      targets: bubbleContainer,
      scaleX: 1,
      scaleY: 1,
      duration: 150,
      ease: 'Back.easeOut',
    });

    // Getaran ponsel haptic halus saat pesan masuk
    this._shakePovPhone(isThreat ? 5 : 2, 100);

    // Audio SFX yang sinkron dengan interaksi chat:
    if (this.audioManager) {
      if (isDara) {
        this.audioManager.playMessageSent();
      } else if (isBayang) {
        this.audioManager.playMessageReceived(isThreat);
        this.audioManager.playPhoneVibrate();
      }
    }
  }

  // --- Update mask dinamis agar selalu presisi mengikuti pergerakan ponsel ---
  _updateChatMask() {
    if (!this._chatMaskGfx || !this._povContainer) return;
    this._chatMaskGfx.clear();
    const screenLeft = this._povContainer.x + this._screenCenterX - this._screenW / 2 + 2;
    const screenTop = this._povContainer.y + this._chatTopY + 2;
    // Mask menutupi tepat dari bawah header bar sampai di atas jempol
    this._chatMaskGfx.fillRect(screenLeft, screenTop, this._screenW - 4, this._chatH - 4);
  }

  // --- Layout deterministik susunan bubble chat (anti tumpang-tindih & anti tembus layar) ---
  _relayoutChatBubbles(animate = true) {
    if (!this._chatBubbles || this._chatBubbles.length === 0) return;

    const gap = 8;
    const maxFeedH = Math.max((this._chatH || 155) - 25, 110);
    let currentBottomY = 0; // Titik dasar di bagian bawah chat stream (tepat di atas jempol)

    // Hitung posisi dari bubble terbaru (paling bawah) ke terlama (paling atas)
    for (let i = this._chatBubbles.length - 1; i >= 0; i--) {
      const b = this._chatBubbles[i];
      const targetY = currentBottomY - b.height / 2;
      currentBottomY -= (b.height + gap);

      b.targetY = targetY;

      // Cek apakah tepi atas bubble melebihi batas atas feed kaca HP
      const bubbleTop = targetY - b.height / 2;
      const isOutAbove = bubbleTop < -maxFeedH;

      if (isOutAbove) {
        // Bubble yang melebihi batas atas langsung disembunyikan & dimatikan
        this.tweens.killTweensOf(b.container);
        b.container.setAlpha(0).setVisible(false);
      } else {
        b.container.setVisible(true);
        b.container.setAlpha(1);

        if (this._chatMask) {
          b.container.setMask(this._chatMask);
        }

        if (animate) {
          this.tweens.add({
            targets: b.container,
            y: targetY,
            duration: 180,
            ease: 'Cubic.easeOut',
          });
        } else {
          b.container.y = targetY;
        }
      }
    }

    // Bersihkan pesan yang berada di luar batas feed kaca HP
    this._chatBubbles = this._chatBubbles.filter((b) => {
      const bubbleTop = (b.targetY ?? 0) - b.height / 2;
      if (bubbleTop < -maxFeedH) {
        this.tweens.killTweensOf(b.container);
        b.container.destroy();
        return false;
      }
      return true;
    });

    this._updateChatMask();
  }

  // Efek getar ponsel di tangan Dara
  _shakePovPhone(intensity = 3, duration = 120) {
    if (!this._povContainer) return;
    const originX = this.scale.width / 2;
    this.tweens.add({
      targets: this._povContainer,
      x: { from: originX - intensity, to: originX + intensity },
      duration: 35,
      yoyo: true,
      repeat: Math.floor(duration / 70),
      onUpdate: () => {
        this._updateChatMask();
      },
      onComplete: () => {
        if (this._povContainer) this._povContainer.x = originX;
        this._updateChatMask();
      },
    });
  }

  // Efek detak jantung berdenyut di pinggir layar
  _startHeartbeat() {
    if (this._heartbeatActive) return;
    this._heartbeatActive = true;

    this.tweens.add({
      targets: this._heartbeatVignette,
      fillAlpha: { from: 0.1, to: 0.42 },
      duration: 520,
      yoyo: true,
      repeat: -1,
      ease: 'Quad.easeInOut',
    });
  }

  _stopHeartbeat() {
    this._heartbeatActive = false;
    this.tweens.killTweensOf(this._heartbeatVignette);
    this.tweens.add({
      targets: this._heartbeatVignette,
      fillAlpha: 0,
      duration: 400,
    });
  }

  // Tampilkan stempel "AKUN TELAH DIBLOKIR"
  _triggerBlockStamp() {
    if (!this._stampContainer) return;
    this._stampContainer.setVisible(true).setScale(2.2).setAlpha(0);

    this.tweens.add({
      targets: this._stampContainer,
      scale: 1,
      alpha: 1,
      duration: 250,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.cameras.main.shake(120, 0.008);
        this.audioManager?.playBlockStamp();
      },
    });

    if (this._povStatusText) {
      this._povStatusText.setText('Diblokir').setColor('#ef4444');
    }

    this._addPhoneChatMessage({
      sender: 'system',
      text: '🔒 Akun @bayang_kelabu91 telah diblokir.',
    });
  }

  // --- Sistem Cutscene CG Sinematik (Jendela, Pelukan Orang Tua, Bukti Laporan Siber) ---
  _showCutsceneCg(textureKey) {
    const { width, height } = this.scale;

    // Turunkan container HP ke bawah agar cutscene CG terlihat luas dan sinematik
    if (this._povContainer) {
      this.tweens.add({
        targets: this._povContainer,
        y: height + 500,
        duration: 400,
        ease: 'Quad.easeIn',
      });
    }

    if (!this._cutsceneCgImages) {
      this._cutsceneCgImages = {};
    }

    // Sembunyikan cutscene lain yang sedang aktif secara halus
    Object.keys(this._cutsceneCgImages).forEach((k) => {
      const otherCg = this._cutsceneCgImages[k];
      if (k !== textureKey && otherCg && otherCg.visible) {
        this.tweens.add({
          targets: otherCg,
          alpha: 0,
          duration: 300,
          onComplete: () => {
            otherCg.setVisible(false);
          },
        });
      }
    });

    let cg = this._cutsceneCgImages[textureKey];
    if (!cg) {
      cg = this.add
        .image(width / 2, height / 2, textureKey)
        .setOrigin(0.5)
        .setDepth(16) // Di atas kamar tidur, tepat di bawah DialogueBox UI (depth 20)
        .setScrollFactor(0)
        .setAlpha(0);
      this._cutsceneCgImages[textureKey] = cg;
    }

    const baseScale = Math.max(width / cg.width, height / cg.height);
    cg.setPosition(width / 2, height / 2).setScale(baseScale).setVisible(true);

    this.tweens.killTweensOf(cg);
    this.tweens.add({
      targets: cg,
      alpha: 1,
      duration: 650,
      ease: 'Sine.easeOut',
    });

    this.tweens.add({
      targets: cg,
      scaleX: baseScale * 1.04,
      scaleY: baseScale * 1.04,
      duration: 7500,
      ease: 'Sine.easeOut',
    });

    // Efek audio-visual khusus per Cutscene:
    if (textureKey === 'ep3-window-cg') {
      if (!this._cgFlickerTimer) {
        this._cgFlickerTimer = this.time.addEvent({
          delay: 200,
          loop: true,
          callback: () => {
            if (!cg || !cg.visible) return;
            cg.setAlpha(0.92 + Math.random() * 0.08);
          },
        });
      }
      this.cameras.main.flash(260, 160, 200, 255, 0.25);
      this.cameras.main.shake(200, 0.007);
      this.audioManager?.playWindowSpookStinger();
    } else if (textureKey === 'ep3-parents-cg') {
      this.cameras.main.flash(400, 255, 235, 190, 0.22);
      this.audioManager?.playWarmChime?.();
    } else if (textureKey === 'ep3-evidence-cg') {
      this.cameras.main.flash(250, 70, 170, 255, 0.25);
      this.audioManager?.playEvidenceShutter?.();
    }
  }

  _hideCutsceneCg(onComplete) {
    if (this._cgFlickerTimer) {
      this._cgFlickerTimer.remove();
      this._cgFlickerTimer = null;
    }

    const activeCgs = Object.values(this._cutsceneCgImages || {}).filter(
      (img) => img && img.visible,
    );

    if (activeCgs.length === 0) {
      onComplete?.();
      return;
    }

    activeCgs.forEach((img) => {
      this.tweens.add({
        targets: img,
        alpha: 0,
        duration: 350,
        ease: 'Quad.easeOut',
        onComplete: () => {
          img.setVisible(false);
        },
      });
    });

    this.time.delayedCall(360, () => {
      onComplete?.();
    });
  }

  // Kembalikan kehangatan kamar setelah situasi teratasi
  _restoreRoomWarmth() {
    this._stopHeartbeat();

    // Kembalikan ke BGM eksplorasi yang hangat & tenang
    // (hentikan tema suspense dulu agar tidak bertabrakan)
    if (this.audioManager) {
      this.audioManager.stopBGM();
      this.audioManager.startBGM();
    }

    // Meredakan kegelapan dingin
    this.tweens.add({
      targets: this._ambientDarkness,
      fillAlpha: 0,
      duration: 800,
    });

    // Menyalakan cahaya hangat keemasan melegakan
    this.tweens.add({
      targets: this._warmSafeOverlay,
      fillAlpha: 0.22,
      duration: 900,
      onComplete: () => {
        this.tweens.add({
          targets: this._warmSafeOverlay,
          fillAlpha: 0.08,
          duration: 1500,
        });
      },
    });

    // Zoom kamera kembali normal
    this.cameras.main.zoomTo(1.0, 800, 'Sine.easeInOut');
  }

  // --- Reaksi Suasana Visual Tiap Obrolan (Scene per Dialogue) ---
  _handleDialogueVisuals(node) {
    if (!node) return;

    const id = node.id;
    const isBayang = node.speaker === 'bayang_kelabu';

    // 1. Kirim pesan ke antarmuka chat layar HP jika ada pesan teks
    if (isBayang) {
      const isThreatNode =
        id === 'n_cb3' ||
        id === 'n_cb4_msg' ||
        id === 'n_cb2_warn' ||
        id === 'n7' ||
        id === 'n8';
      this._addPhoneChatMessage({
        sender: 'bayang_kelabu',
        text: node.text,
        isThreat: isThreatNode,
      });
    }

    // 2. Transisi atmosfer kamar per fase cerita:
    // A. FASE AWAL (Normal / Mulai baca DM)
    if (id === 'n1' || id === 'n2' || id === 'n3' || id === 'n4') {
      if (id === 'n2') {
        this._shakePovPhone(3, 220); // Bzzzt getar pesan masuk
      }
      this.tweens.add({
        targets: this._ambientDarkness,
        fillAlpha: 0.1,
        duration: 500,
      });
      if (this._povStatusText) {
        this._povStatusText.setText('Online').setColor('#4ade80');
      }
    }

    // B. FASE CURIGA (Tahu kardigan / selalu di sekitar)
    else if (
      id === 'n_cb1_reply' ||
      id === 'n_cb1_ignore' ||
      id === 'n5' ||
      id === 'n_cb2'
    ) {
      this.tweens.add({
        targets: this._ambientDarkness,
        fillAlpha: 0.38,
        duration: 800,
      });
      this.cameras.main.zoomTo(1.03, 900, 'Sine.easeInOut');
      if (this._povStatusText) {
        this._povStatusText.setText('sedang mengetik...').setColor('#fbbf24');
      }
    }

    // C. FASE ANCAMAN & MANIPULASI (Minta nomor/foto, klaim bukti chat)
    else if (
      id === 'n_cb2_warn' ||
      id === 'n_cb2_freeze' ||
      id === 'n_cb3' ||
      id === 'n_cb3_choice' ||
      id === 'n_cb3_panic'
    ) {
      this.cameras.main.flash(180, 100, 0, 0, 0.2); // Flash merah kilas
      this.cameras.main.zoomTo(1.06, 600, 'Sine.easeInOut');
      this.audioManager?.playThreatStinger();

      this.tweens.add({
        targets: this._ambientDarkness,
        fillAlpha: 0.58,
        duration: 600,
      });

      this._startHeartbeat(); // Jantung berdegup tegang

      if (this._povStatusText) {
        this._povStatusText.setText('Online • Mendesak').setColor('#f87171');
      }
    }

    // D. FASE PUNCAK HOROR (Gorden jendela tersingkap & panggilan masuk!)
    else if (
      id === 'n_cb4_pesan_terakhir' ||
      id === 'n_cb4_msg' ||
      id === 'n_cb4' ||
      id === 'n_end_scared' ||
      id === 'n_end_window'
    ) {
      this.cameras.main.flash(250, 180, 0, 0, 0.35); // Flash bahaya
      this.cameras.main.zoomTo(1.08, 400, 'Sine.easeInOut');
      this.audioManager?.playThreatStinger();

      this.tweens.add({
        targets: this._ambientDarkness,
        fillAlpha: 0.72,
        duration: 400,
      });

      this._startHeartbeat();

      if (this._povStatusText) {
        this._povStatusText.setText('PANGGILAN MASUK...').setColor('#ef4444');
      }

      // Cutscene CG: Dara mengintip lewat celah tirai & melihat siluet di luar jendela!
      if (id === 'n_cb4' || id === 'n_end_scared' || id === 'n_end_window') {
        this._showCutsceneCg('ep3-window-cg');
      }
    }

    // E. FASE KEPUTUSAN TEPAT / AMAN (Blokir, panggil orang tua, lapor)
    else if (
      id === 'n_cb1_block' ||
      id === 'n_safe_outro' ||
      id === 'n_cb2_tell_parents' ||
      id === 'n_safe_outro2' ||
      id === 'n_cb3_report' ||
      id === 'n_cb3_report2' ||
      id === 'n_cb3_refuse' ||
      id === 'n_end_safe' ||
      id === 'n_end_safe2' ||
      id === 'n_end_safe3' ||
      id === 'n_end_scared2' ||
      id === 'n_end_window2'
    ) {
      if (id === 'n_cb3_report' || id === 'n_cb3_report2') {
        // Tampilkan Cutscene CG Bukti Screenshot & Laporan Resmi Kejahatan Siber
        this._showCutsceneCg('ep3-evidence-cg');
      } else if (
        id === 'n_cb2_tell_parents' ||
        id === 'n_safe_outro2' ||
        id === 'n_end_safe' ||
        id === 'n_end_safe2' ||
        id === 'n_end_scared2' ||
        id === 'n_end_window2'
      ) {
        // Tampilkan Cutscene CG Pelukan Hangat Orang Tua & Dukungan Keluarga
        this._showCutsceneCg('ep3-parents-cg');
      } else {
        this._hideCutsceneCg();
      }

      if (id !== 'n_end_scared2' && id !== 'n_end_window2') {
        this._triggerBlockStamp();
      }
      this._restoreRoomWarmth();
    }
  }

  // Membuka dialog sinematik HP
  _openPhoneDialogue() {
    if (this.npcInDialogue) return;
    this.npcInDialogue = true;
    this.npcPrompt.setVisible(false);
    this.uiInputLocked = true;
    this.player?.setVelocityX(0);
    this.player?.anims.stop();

    // Munculkan POV kedua tangan Dara memegang smartphone
    this._setupPovPhone();

    // Buka DialogueBox dengan listener visual per node & pilihan jawaban
    this.dialogueBox.open({
      dialogueTree: EPISODE3_DIALOGUE,
      npcPortraitKey: this.npcConfig?.portraitKey ?? null,
      npcName: '@bayang_kelabu91',
      playerName: getCharacterName(),
      onNodeChange: (node) => {
        this._handleDialogueVisuals(node);
      },
      onChoiceSelected: (choice) => {
        // Balasan Dara muncul sebagai bubble chat biru di sisi kanan layar HP HANYA JIKA tindakan tersebut membalas chat!
        if (choice && choice.chatReply) {
          this._addPhoneChatMessage({
            sender: 'dara',
            text: choice.chatReply,
          });
        }
      },
      onClose: async (collectedChoices) => {
        this._hideCutsceneCg();
        this.phoneTalked = true;
        this.npcChoices = collectedChoices;

        markNpcTalked(this.episodeId ?? 3, collectedChoices);
        this.setChatButtonVisible(true);
        this.updateQuestGuide();

        // Stop animasi getar ponsel meja
        this.tweens.killTweensOf([this._phoneSprite, this._phoneHalo, this._notifBadge]);
        this._phoneSprite?.setAlpha(0.65);
        this._phoneHalo?.destroy();
        this._notifBadge?.destroy();

        // Kembalikan kehangatan kamar dan turunkan tangan POV
        this._restoreRoomWarmth();

        if (this._breathingTween) {
          this._breathingTween.stop();
        }

        if (this._povContainer) {
          this.tweens.add({
            targets: this._povContainer,
            y: this.scale.height + 450,
            duration: 600,
            ease: 'Sine.easeIn',
            onUpdate: () => {
              this._updateChatMask();
            },
            onComplete: () => {
              this._chatMaskGfx?.destroy();
              this._chatMaskGfx = null;
              this._povContainer?.destroy();
              this._povContainer = null;
              this._chatBubbles = [];
            },
          });
        }

        // Tawaran bicara ke Kak Dara
        const ui = window.__nawasenadaraUI;
        if (ui?.offerCounseling) {
          await ui.offerCounseling({
            episodeId: this.episodeId ?? 3,
            npcName: '@bayang_kelabu91',
            autoContext: this.getCounselingAutoContext(),
          });
        }

        this.npcInDialogue = false;
        this.uiInputLocked = false;
        this._npcInteractCooldownUntil = this.time.now + 400;
      },
    });
  }

  getCounselingAutoContext() {
    return buildEpisode3CounselingContext(this.npcChoices);
  }

  onSceneUpdate() {
    if (this.finished) return;
    if (!this._phoneSprite) return;

    // Proximity check ke objek ponsel
    if (!this.npcInDialogue) {
      const dist = Math.abs(this.player.x - this._phoneSprite.x);
      const inRange = dist <= (this.npcConfig?.interactionRadius ?? 120);
      this.npcPrompt.setVisible(inRange);
      if (inRange && Phaser.Input.Keyboard.JustDown(this.interactKey)) {
        this._tryOpenPhone();
      }
    }

    if (this.npcInDialogue) return;

    const endZoneX = this.levelWidth - LEVEL_EDGE_MARGIN;

    // Blokir ujung level sebelum ponsel diperiksa
    if (!this.phoneTalked) {
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
      this.scene.start('EpisodeEndingScene', {
        episodeId: 3,
        isLastEpisode: false,
        choices,
      });
    }
  }
}
