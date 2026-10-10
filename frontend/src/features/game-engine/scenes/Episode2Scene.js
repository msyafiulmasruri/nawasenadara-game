import Phaser from 'phaser';

import BasePlayerScene from './BasePlayerScene';

import {
  EPISODE2_DIALOGUE,
  buildEpisode2CounselingContext,
} from '../dialogue/episode2Dialogue';

import DialogueBox from '../ui/DialogueBox';
import ObjectiveBriefing from '../ui/ObjectiveBriefing';

import { getCharacterName } from '../utils/characterName';
import { getEpisodeById } from '../config/episodes';
import { LEVEL_EDGE_MARGIN } from '../config/gameConfig';
import { pxToWorld } from '../utils/visibleBounds';

// ================================================================
// EPISODE 2 — RAHASIA DI GRUP KELAS
// ================================================================
//
// Background Episode 2:
// 2048 x 1143
//
// Background tetap dirender dengan pola yang sama seperti Episode 1:
//
// scale = tinggi world / tinggi gambar
//
// Tidak ada crop manual.
// Tidak ada resize khusus background.
//
// Perbedaan visual Episode 2:
//
// Player diperbesar sedikit karena perspektif kamar membuat karakter
// terasa lebih kecil dibanding ketika berada di koridor Episode 1.
//
// ================================================================

// ================================================================
// PLAYER SCALE EPISODE 2
// ================================================================
//
// BasePlayerScene mempunyai spriteScale sendiri dan akan memakai
// this.spriteScale setiap frame.
//
// Karena itu kita HARUS mengubah this.spriteScale,
// bukan hanya player.displayHeight.
//
// 1.30 = karakter Episode 2 menjadi 130% dari ukuran standar.
//
// Kalau masih kecil:
//     1.35
//
// Kalau terlalu besar:
//     1.25
//
const EPISODE2_PLAYER_SCALE_MULTIPLIER = 1.55;

// ================================================================
// POSISI HP PADA ARTWORK ASLI 2048 x 1143
// ================================================================

const PHONE_REF_X = 1620;
const PHONE_REF_Y = 900;

// Jarak horizontal agar prompt HP muncul.
const PHONE_INTERACTION_RADIUS = 115;

// ================================================================
// SCENE
// ================================================================

export default class Episode2Scene extends BasePlayerScene {
  constructor() {
    super('Episode2Scene');
  }

  // ==============================================================
  // INIT
  // ==============================================================

  init(data) {
    super.init(data);

    this.episodeId = 2;

    this.finished = false;

    this.phoneInDialogue = false;

    this.phoneQuestComplete = false;

    this.phoneChoices = [];

    this._phoneInteractCooldownUntil = 0;

    this._povContainer = null;

    this._phonePovSprite = null;

    this._chatStreamContainer = null;

    this._povUserTitle = null;

    this._povShown = false;
  }

  // ==============================================================
  // CREATE
  // ==============================================================

  create(data) {
    // ============================================================
    // BASE PLAYER
    // ============================================================
    //
    // BasePlayerScene membuat:
    //
    // - player
    // - ground
    // - physics
    // - movement
    // - animasi
    // - camera
    // - HUD
    // - touch controls
    //
    super.create(data);

    // ============================================================
    // PERBESAR PLAYER KHUSUS EPISODE 2
    // ============================================================
    //
    // PENTING:
    //
    // Jangan pakai:
    //
    // this.player.displayHeight = ...
    //
    // karena BasePlayerScene akan memanggil:
    //
    // this.player.setScale(this.spriteScale)
    //
    // lagi ketika update movement.
    //
    // Jadi yang harus dibesarkan adalah spriteScale itu sendiri.
    //
    this.spriteScale *= EPISODE2_PLAYER_SCALE_MULTIPLIER;

    if (this.player) {
      this.player.setScale(this.spriteScale);
    }

    // Karena origin player adalah:
    //
    // setOrigin(0.5, 1)
    //
    // memperbesar sprite tidak mengubah posisi kaki.
    //
    // Kaki tetap berada tepat pada groundY.

    // ============================================================
    // CHATBOT
    // ============================================================

    this.setChatButtonVisible(false);

    // ============================================================
    // QUEST GUIDE
    // ============================================================

    this.setQuestGuide('○ ── Periksa HP di meja ──');

    // ============================================================
    // OBJECTIVE BRIEFING
    // ============================================================

    this.uiInputLocked = true;

    this.player?.setVelocity(0, 0);

    this.player?.anims.stop();

    const episodeData = getEpisodeById(2);

    this.objectiveBriefing = new ObjectiveBriefing(this);

    this.objectiveBriefing.show({
      title: 'TUJUAN EPISODE',

      objectiveText:
        episodeData?.objective ??
        'Periksa ponsel di meja dan perhatikan percakapan ' +
          'di grup kelas. Tentukan bagaimana kamu akan ' +
          'merespons ketika melihat teman mengalami cyberbullying.',

      onContinue: () => {
        this.uiInputLocked = false;
      },
    });
  }

  // ==============================================================
  // BACKGROUND
  // ==============================================================
  //
  // Background memakai metode yang sama seperti Episode 1:
  //
  // tinggi gambar -> tinggi world
  //
  // lebar mengikuti aspect ratio asli.
  //
  // Ground sengaja TIDAK diubah.
  //
  // BasePlayerScene sudah memakai:
  //
  // groundY = WORLD_HEIGHT - 120
  //
  // sehingga titik kaki player konsisten.
  //
  // ==============================================================

  createBackground(width, height) {
    this.finished = false;

    // ============================================================
    // FALLBACK
    // ============================================================

    if (!this.textures.exists('episode2-bg')) {
      this.levelWidth = width;

      this.add
        .rectangle(width / 2, height / 2, width, height, 0x5b4a55)
        .setDepth(0);

      this._backgroundScale = 1;

      this._bgLeft = 0;

      this.walkMinX = LEVEL_EDGE_MARGIN;

      this.walkMaxX = Math.max(
        LEVEL_EDGE_MARGIN,

        this.levelWidth - LEVEL_EDGE_MARGIN,
      );

      this.phoneX = width * 0.58;

      this.phoneY = height * 0.56;

      this._createPhoneObject();

      return;
    }

    // ============================================================
    // SOURCE BACKGROUND
    // ============================================================

    const source = this.textures.get('episode2-bg').getSourceImage();

    // ============================================================
    // SCALE BACKGROUND
    // ============================================================
    //
    // Sama seperti Episode 1.
    //
    const scale = height / source.height;

    const naturalWidth = Math.round(source.width * scale);

    this._backgroundScale = scale;

    this._bgLeft = 0;

    // ============================================================
    // LEVEL WIDTH
    // ============================================================

    this.levelWidth = Math.max(naturalWidth, width);

    // ============================================================
    // BACKGROUND UTAMA
    // ============================================================

    this.bg = this.add.image(naturalWidth / 2, height / 2, 'episode2-bg');

    this.bg.setDisplaySize(naturalWidth, height);

    this.bg.setDepth(0);

    // ============================================================
    // EXTRA AREA
    // ============================================================
    //
    // Kalau viewport lebih lebar daripada background,
    // isi sisa kanan menggunakan tile kecil seperti pola Episode 1.
    //
    const extraWidth = this.levelWidth - naturalWidth;

    if (extraWidth > 0) {
      const tile = this.add.tileSprite(
        naturalWidth + extraWidth / 2,

        height / 2,

        extraWidth,

        height,

        'episode2-bg',
      );

      tile.setTileScale(scale, scale);

      tile.setDepth(0);
    }

    // ============================================================
    // WALKABLE AREA
    // ============================================================
    //
    // Sama dengan Episode 1.
    //
    this.walkMinX = LEVEL_EDGE_MARGIN;

    this.walkMaxX = Math.max(
      LEVEL_EDGE_MARGIN,

      this.levelWidth - LEVEL_EDGE_MARGIN,
    );

    // ============================================================
    // PHONE POSITION
    // ============================================================
    //
    // Koordinat berdasarkan artwork asli.
    //
    this.phoneX = PHONE_REF_X * scale;

    this.phoneY = PHONE_REF_Y * scale;

    this._createPhoneObject();
  }

  // ==============================================================
  // CREATE PHONE
  // ==============================================================

  _createPhoneObject() {
    const scene = this;

    // ============================================================
    // PHONE BODY
    // ============================================================

    this.phoneBody = scene.add
      .rectangle(this.phoneX, this.phoneY, 31, 13, 0x171a22, 1)
      .setStrokeStyle(2, 0x596273, 1)
      .setDepth(0.8)
      .setAngle(-4);

    // ============================================================
    // PHONE SCREEN
    // ============================================================

    this.phoneScreen = scene.add
      .rectangle(this.phoneX, this.phoneY, 23, 7, 0x35445c, 1)
      .setDepth(0.81)
      .setAngle(-4);

    // ============================================================
    // HIT AREA
    // ============================================================

    this.phoneHitArea = scene.add
      .rectangle(this.phoneX, this.phoneY, 72, 60, 0xffffff, 0.001)
      .setDepth(1.5)
      .setInteractive({
        useHandCursor: true,
      });

    this.phoneHitArea.on('pointerdown', () => {
      this._tryOpenPhone();
    });

    // ============================================================
    // PROMPT
    // ============================================================

    const promptFont = pxToWorld(this, 15);

    this.phonePrompt = this.add
      .text(
        this.phoneX,

        this.phoneY - 42,

        '[E] Buka HP (Klik)',

        {
          fontFamily: '"Pixelify Sans", monospace',

          fontSize: `${promptFont}px`,

          color: '#ffffff',

          backgroundColor: '#1a1a2e',

          padding: {
            x: 9,
            y: 5,
          },
        },
      )
      .setOrigin(0.5, 1)
      .setDepth(3)
      .setVisible(false)
      .setInteractive({
        useHandCursor: true,
      });

    this.phonePrompt.on('pointerdown', () => {
      this._tryOpenPhone();
    });

    // ============================================================
    // INTERACTION KEY
    // ============================================================

    this.interactKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.E,
    );

    this.registerLockable(this.phoneHitArea);

    this.registerLockable(this.phonePrompt);

    // ============================================================
    // DIALOGUE BOX
    // ============================================================

    this.dialogueBox = new DialogueBox(this);
  }

  // ==============================================================
  // TRY OPEN PHONE
  // ==============================================================

  _tryOpenPhone() {
    if (this.phoneInDialogue || this.phoneQuestComplete) {
      return;
    }

    if (this.uiInputLocked) {
      return;
    }

    if (!this.phonePrompt?.visible) {
      return;
    }

    if (this.time.now < this._phoneInteractCooldownUntil) {
      return;
    }

    this._startPhoneDialogue();
  }

  // ==============================================================
  // SET POV PHONE
  // ==============================================================

  _setupPovPhone() {
      if (this._povShown) return;

      this._povShown = true;

      const width = this.scale.width;
      const height = this.scale.height;

      this._povContainer = this.add.container(
          width / 2,
          height / 2 + height
      );

      this._phonePovSprite = this.add.image(
          0,
          0,
          'ep2-phone-pov'
      );

      // Sesuaikan ukuran POV dengan layar
      const maxHeight = height * 0.75;
      const povScale = maxHeight / this._phonePovSprite.height;

      this._phonePovSprite
          .setScale(povScale)
          .setOrigin(0.5);

      this._povContainer.add(this._phonePovSprite);
      this._povContainer.setDepth(5);

      // Tambahkan nama chat
      this._povUserTitle = this.add.text(
          -55,
          -210,
          'Grup Kelas',
          {
              fontFamily: 'Arial',
              fontSize: '9px',
              color: '#ffffff',
              fontStyle: 'bold',
              stroke: '#000000',
              strokeThickness: 2,
          }
      );

      this._povUserTitle.setOrigin(0.5);
      this._povContainer.add(this._povUserTitle);
      this._povUserTitleDefaultX = this._povUserTitle.x;

      // Container untuk chat bubble
      this._chatStreamContainer = this.add.container(0, 0);

      this._povContainer.add(this._chatStreamContainer);

      // Munculkan POV dari bawah
      this.tweens.add({
          targets: this._povContainer,
          y: height / 2 + 135,
          duration: 500,
          ease: 'Cubic.easeOut'
      });
  }

  // ==============================================================
  // SHOW GROUP CHAT
  // ==============================================================

  _showGroupChat() {
    if (!this._chatStreamContainer) return;

    this._chatStreamContainer.removeAll(true);

    const messages = [
        {
            text: 'Tadi Kirana kenapa sih diem terus?',
            align: 'left'
        },
        {
            text: 'Sok misterius banget wkwk',
            align: 'left'
        },
        {
            text: 'Jangan ajak dia dulu deh, bikin suasana aneh.',
            align: 'left'
        }
    ];

    // Posisi relatif terhadap titik tengah POV
    const startY = -160;
    const gapY = 56;

    messages.forEach((message, index) => {
        const isLeft = message.align === 'left';

        const x = isLeft ? -120 : 35;

        const bubble = this.add.text(
            x,
            startY + index * gapY,
            message.text,
            {
                fontFamily: 'Arial',
                fontSize: '11px',
                color: '#111111',

                backgroundColor: isLeft
                    ? '#ffffff'
                    : '#d8f8d8',

                padding: {
                    left: 10,
                    right: 10,
                    top: 7,
                    bottom: 7,
                },

                wordWrap: {
                    width: 117,
                },

                lineSpacing: 1,
            },
        );

        bubble.setOrigin(
            isLeft ? 0 : 1,
            0.5,
        );

        this._chatStreamContainer.add(bubble);

        bubble.setAlpha(0);
        bubble.setScale(0.92);

        const targetY = bubble.y;

        // Bubble mulai sedikit di bawah posisi akhirnya
        bubble.setY(targetY + 18);

        this.tweens.add({
            targets: bubble,
            alpha: 1,
            y: targetY,
            duration: 240,
            delay: index * 180,
            ease: 'Cubic.easeOut',
        });

        // Pop-in kecil
        this.tweens.add({
            targets: bubble,
            scaleX: 1,
            scaleY: 1,
            duration: 240,
            delay: index * 180,
            ease: 'Back.easeOut',
        });
    });
  }

// ==============================================================
// NOTIF CHAT RAFI
// ==============================================================

_showRafiNotification() {
    if (!this._povContainer) return;

    // Hapus notification lama kalau ada
    if (this._rafiNotificationContainer) {
        this._rafiNotificationContainer.destroy();
        this._rafiNotificationContainer = null;
    }

    const container = this.add.container(-145, -100);

    // ==========================================================
    // BOX NOTIF
    // ==========================================================

    const box = this.add.rectangle(
        0,
        0,
        235,
        48,
        0x111a2e,
        0.96
    );

    box.setOrigin(0, 0.5);

    // Border
    box.setStrokeStyle(1, 0x35415f, 1);

    // ==========================================================
    // DOT HIJAU
    // ==========================================================

    const dot = this.add.circle(
        14,
        0,
        4,
        0x45d483
    );

    // ==========================================================
    // TEKS
    // ==========================================================

    const text = this.add.text(
        28,
        0,
        'Rafi\n1 new message',
        {
            fontFamily: 'Arial',
            fontSize: '9px',
            color: '#ffffff',
            fontStyle: 'bold',
            lineSpacing: 2,
        }
    );

    text.setOrigin(0, 0.5);

    // Masukkan semua ke container
    container.add([
        box,
        dot,
        text,
    ]);

    // Posisi layer
    this._povContainer.add(container);

    this._rafiNotificationContainer = container;

    // ==========================================================
    // ANIMASI MASUK
    // ==========================================================

    container.setAlpha(0);
    container.setY(-65);

    this.tweens.add({
        targets: container,
        alpha: 1,
        y: -75,
        duration: 220,
        ease: 'Cubic.easeOut',
    });
}


// ==============================================================
// HIDE RAFI NOTIFICATION
// ==============================================================

_hideRafiNotification() {
    if (!this._rafiNotificationContainer) return;

    this.tweens.killTweensOf(this._rafiNotificationContainer);

    this.tweens.add({
        targets: this._rafiNotificationContainer,
        alpha: 0,
        y: -85,
        duration: 220,
        ease: 'Cubic.easeIn',
        onComplete: () => {
            if (this._rafiNotificationContainer) {
                this._rafiNotificationContainer.destroy();
                this._rafiNotificationContainer = null;
            }
        },
    });
}

  // ==============================================================
  // SHOW RAFI CHAT
  // ==============================================================

  _showRafiChat(text) {
    if (!this._chatStreamContainer) return;

    // Hapus chat grup
    this._chatStreamContainer.removeAll(true);

    // Ganti nama kontak
    if (this._povUserTitle) {
        this._povUserTitle.setText('Rafi');
        this._povUserTitle.x = this._povUserTitleDefaultX - 15;
    }

    // Bubble chat Rafi
    const bubble = this.add.text(
        -120,
        -50,
        text,
        {
            fontFamily: 'Arial',
            fontSize: '11px',
            color: '#111111',

            backgroundColor: '#ffffff',

            padding: {
                left: 10,
                right: 10,
                top: 7,
                bottom: 7,
            },

            wordWrap: {
                width: 117,
            },

            lineSpacing: 1,
        },
    );

    bubble.setOrigin(0, 0.5);

    // =========================
    // ANIMASI CHAT MASUK
    // =========================

    const targetY = bubble.y;

    // Mulai sedikit dari bawah
    bubble.setY(targetY + 18);

    // Mulai transparan + sedikit mengecil
    bubble.setAlpha(0);
    bubble.setScale(0.92);

    this._chatStreamContainer.add(bubble);

    // Gerakan naik + fade in
    this.tweens.add({
        targets: bubble,
        y: targetY,
        alpha: 1,
        duration: 240,
        ease: 'Cubic.easeOut',
    });

    // Efek pop kecil
    this.tweens.add({
        targets: bubble,
        scaleX: 1,
        scaleY: 1,
        duration: 240,
        ease: 'Back.easeOut',
    });
}
  
  // ==========================================================
  // GETARAN SAAT NOTIF RAFI MASUK
  // ==========================================================

  _startPhoneShake() {
    if (!this._phonePovSprite) return;

    // Hentikan tween shake sebelumnya kalau ada
    this.tweens.killTweensOf(this._phonePovSprite);

    const originalX = this._phonePovSprite.x;
    const originalAngle = this._phonePovSprite.angle;

    // Getaran horizontal + sedikit rotasi
    this.tweens.add({
        targets: this._phonePovSprite,
        x: originalX - 4,
        angle: originalAngle - 1.5,
        duration: 45,
        yoyo: true,
        repeat: 5,
        ease: 'Sine.easeInOut',

        onComplete: () => {
            this._phonePovSprite.x = originalX;
            this._phonePovSprite.angle = originalAngle;
        },
    });
  }

// ==============================================================
// POV BLUR SAAT PILIHAN JAWABAN
// ==============================================================

_setPovBlur(blurred) {
    if (!this._povContainer) return;

    this._povBlurred = blurred;

    // ==========================================================
    // BLUR BACKGROUND, PLAYER, HP DI MEJA
    // ==========================================================

    const backgroundObjects = [
        this.bg,
        this.player,
        this.phoneBody,
        this.phoneScreen,
    ];

    backgroundObjects.forEach((obj) => {
        if (!obj?.postFX) return;

        obj.postFX.clear();

        if (blurred) {
            obj.postFX.addBlur(
                2.2,
                2.2,
                1
            );
        }
    });

    // ==========================================================
    // OVERLAY TIPIS
    // ==========================================================

    if (!this._choiceFocusOverlay) {
        this._choiceFocusOverlay = this.add
            .rectangle(
                this.scale.width / 2,
                this.scale.height / 2,
                this.scale.width,
                this.scale.height,
                0x10131a,
                0.10
            )
            .setScrollFactor(0)
            .setDepth(14.5)
            .setVisible(false);
    }

    this._choiceFocusOverlay.setVisible(blurred);
}

  // ==========================================================
  // TUTUP POV HP
  // ==========================================================

  _closePovPhone() {
    // Hapus blur
    this._setPovBlur(false);

    // Hapus overlay pilihan
    if (this._choiceFocusOverlay) {
        this._choiceFocusOverlay.setVisible(false);
    }

    // Hentikan shake POV kalau masih aktif
    if (this._phonePovSprite) {
        this.tweens.killTweensOf(this._phonePovSprite);
    }

    // Animasi tutup POV 
    if (this._povContainer) {
        this.tweens.add({
            targets: this._povContainer,
            alpha: 0,
            y: this._povContainer.y + 150,
            duration: 650,
            ease: 'Cubic.easeOut',
            onComplete: () => {
                if (this._povContainer) {
                    this._povContainer.destroy();
                    this._povContainer = null;
                }

                this._phonePovSprite = null;
                this._chatStreamContainer = null;
                this._povUserTitle = null;
                this._rafiNotificationContainer = null;
            },
        });
    }
  }

  // ==========================================================
  // HUBUNGKAN POV DENGAN DIALOG NODE
  // ==========================================================

_handlePhoneVisuals(node) {
    if (!node) return;

    // POV HP muncul
    if (node.id === 'n1c') {
        this._setupPovPhone();
        this._setPovBlur(false);
        return;
    }

    // Chat grup kelas
    if (node.id === 'n2') {
        this._showGroupChat();
        this._setPovBlur(false);
        return;
    }

    // Notifikasi pribadi dari Rafi masuk
    if (node.id === 'n2c') {
        // Hapus 3 bubble chat grup
        if (this._chatStreamContainer) {
            this._chatStreamContainer.removeAll(true);
        }
        
        // Muncul notif Rafi
        this._showRafiNotification();

        // Shake HP + tangan
        this._startPhoneShake();
        return;
    }

    // Chat pribadi Rafi
    if (node.id === 'n3') {
        // Tutup notif Rafi
        this._hideRafiNotification();

        // Ganti ke chat pribadi Rafi
        this._showRafiChat(node.text);
    }
    
    // ==========================================================
    // OPSI JAWABAN
    // ==========================================================

    if (
        Array.isArray(node.choices) &&
        node.choices.length > 0
    ) {
        this._setPovBlur(true);
    } else {
        this._setPovBlur(false);
    }
  }

  // ==============================================================
  // START DIALOGUE
  // ==============================================================

  _startPhoneDialogue() {
    if (this.phoneInDialogue) {
      return;
    }

    this.phoneInDialogue = true;

    this.phonePrompt?.setVisible(false);

    // ============================================================
    // STOP PLAYER
    // ============================================================

    this.uiInputLocked = true;

    this.player?.setVelocity(0, 0);

    this.player?.anims.stop();

    // ============================================================
    // OPEN DIALOGUE
    // ============================================================

    this.dialogueBox.open({
      dialogueTree: EPISODE2_DIALOGUE,

      npcPortraitKey: 'npc-rafi-portrait',

      npcName: 'Rafi',

      playerName: getCharacterName(),

      onNodeChange: (node) => {
          this._handlePhoneVisuals(node);
      },

      onDynamicLine: ({ node, text }) => {
          if (node?.speaker === 'rafi') {
              this._showRafiChat(text);
          }

          // Update blur berdasarkan apakah node ini punya pilihan
          if (
              Array.isArray(node?.choices) &&
              node.choices.length > 0
          ) {
              this._setPovBlur(true);
          } else {
              this._setPovBlur(false);
          }
      },

      // ==========================================================
      // DIALOGUE FINISHED
      // ==========================================================

      onClose: async (collectedChoices) => {
        this.phoneChoices = collectedChoices;

        this.phoneQuestComplete = true;

        this.clearQuestGuide();

        // Kak Dara sekarang boleh digunakan.
        this.setChatButtonVisible(true);
        
        // Tutup POV HP
        this._closePovPhone();

        // ======================================================
        // COUNSELING
        // ======================================================

        const ui = window.__nawasenadaraUI;

        if (ui?.offerCounseling) {
          await ui.offerCounseling({
            episodeId: 2,

            npcName: 'Rafi',

            autoContext: this.getCounselingAutoContext(),
          });
        }

        if (!this.scene.isActive()) {
          return;
        }

        this.phoneInDialogue = false;

        this._phoneInteractCooldownUntil = this.time.now + 400;
      },
    });
  }

  // ==============================================================
  // COUNSELING CONTEXT
  // ==============================================================

  getCounselingAutoContext() {
    return buildEpisode2CounselingContext(this.phoneChoices);
  }

  // ==============================================================
  // FINISH EPISODE
  // ==============================================================

  _finishEpisode2() {
    if (this.finished) {
      return;
    }

    this.finished = true;

    this.uiInputLocked = true;

    this.phonePrompt?.setVisible(false);

    this.player?.setVelocity(0, 0);

    this.player?.anims.stop();

    const choices = this.phoneChoices || [];

    // ============================================================
    // PLAYER FADE
    // ============================================================

    if (this.player) {
      this.tweens.add({
        targets: this.player,

        alpha: 0,

        duration: 300,

        ease: 'Sine.easeOut',

        onComplete: () => {
          this.scene.start(
            'EpisodeEndingScene',

            {
              episodeId: 2,

              isLastEpisode: false,

              choices,
            },
          );
        },
      });

      return;
    }

    this.scene.start(
      'EpisodeEndingScene',

      {
        episodeId: 2,

        isLastEpisode: false,

        choices,
      },
    );
  }

  // ==============================================================
  // UPDATE
  // ==============================================================

onSceneUpdate() {
  if (!this.player || this.finished) {
    return;
  }

  // ============================================================
  // WALK AREA
  // ============================================================

  this.player.x = Phaser.Math.Clamp(
    this.player.x,
    this.walkMinX,
    this.walkMaxX,
  );

  const endZoneX = this.levelWidth - LEVEL_EDGE_MARGIN;

  // ============================================================
  // BELUM SELESAI QUEST
  // ============================================================

  if (!this.phoneQuestComplete) {
    this.phonePrompt?.setVisible(false);

      const distance = Math.abs(this.player.x - this.phoneX);
      const inRange = distance <= PHONE_INTERACTION_RADIUS;

    this.phonePrompt?.setVisible(inRange);

    // ============================================================
    // KEY E
    // ============================================================

    if (
      inRange &&
      Phaser.Input.Keyboard.JustDown(this.interactKey)
    ) {
      this._tryOpenPhone();
    }

    return;
  }

  // ============================================================
  // QUEST SUDAH SELESAI
  // Sudah dialog + konsultasi Kak Dara
  // ============================================================

  this.phonePrompt?.setVisible(false);

  // Jalan ke kanan sampai ujung = selesai episode
  if (this.player.x >= endZoneX) {
    this._finishEpisode2();
  }
}}
