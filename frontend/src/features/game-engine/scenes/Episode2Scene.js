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
import {
  DESK_PHONE_STYLE,
  getDeskPhonePosition,
} from '../utils/deskPhone';
import {
  getEpisodeChoices,
  hasTalkedToNpc,
  markNpcTalked,
} from '../utils/progressStore';

// ================================================================
// EPISODE 2 — RAHASIA DI GRUP KELAS
// ================================================================
//
// Background Episode 2:
// 2750 x 1536
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

    this.phoneQuestComplete = hasTalkedToNpc(2);

    this.phoneChoices = getEpisodeChoices(2);

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
      this.player.setDepth(5);
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

    this.setChatButtonVisible(Boolean(this.phoneQuestComplete));

    // ============================================================
    // QUEST GUIDE
    // ============================================================

    if (this.phoneQuestComplete) {
      this.clearQuestGuide();
    } else {
      this.setQuestGuide('○ ── Periksa HP di meja ──');
    }

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

      const phonePosition = getDeskPhonePosition(width, height);
      this.phoneX = phonePosition.x;
      this.phoneY = phonePosition.y;

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

    const extraWidth = this.levelWidth - naturalWidth;
    if (extraWidth > 0) {
      const tile = this.add.tileSprite(
        naturalWidth + extraWidth / 2,
        height / 2,
        extraWidth,
        height,
        'episode2-bg',
      );
      tile.setTileScale(scale, scale).setDepth(0);
    }

    // ============================================================
    // WALKABLE AREA
    // ============================================================

    this.walkMinX = LEVEL_EDGE_MARGIN;

    this.walkMaxX = Math.max(
      LEVEL_EDGE_MARGIN,

      this.levelWidth - LEVEL_EDGE_MARGIN,
    );

    // ============================================================
    // PHONE POSITION
    // ============================================================

    const phonePosition = getDeskPhonePosition(naturalWidth, height);
    this.phoneX = phonePosition.x;
    this.phoneY = phonePosition.y;

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

    this.phoneHalo = scene.add
      .ellipse(
        this.phoneX,
        this.phoneY + 5,
        DESK_PHONE_STYLE.haloWidth,
        DESK_PHONE_STYLE.haloHeight,
        0x38bdf8,
        0.3,
      )
      .setDepth(2);

    this.phoneBody = scene.add
      .image(this.phoneX, this.phoneY, 'phone-ep3')
      .setScale(DESK_PHONE_STYLE.scale)
      .setDepth(3)
      .setAngle(DESK_PHONE_STYLE.angle);

    // ============================================================
    // PHONE SCREEN
    // ============================================================

    // Dipertahankan sebagai properti agar kode fokus/blur lama tetap
    // kompatibel; layar sudah menjadi bagian dari sprite bersama.
    this.phoneScreen = null;

    // ============================================================
    // HIT AREA
    // ============================================================

    this.phoneHitArea = scene.add
      .rectangle(
        this.phoneX,
        this.phoneY,
        DESK_PHONE_STYLE.hitWidth,
        DESK_PHONE_STYLE.hitHeight,
        0xffffff,
        0.001,
      )
      .setDepth(DESK_PHONE_STYLE.hitDepth)
      .setInteractive({
        useHandCursor: true,
      });

    this.phoneHitArea.on('pointerdown', () => {
      this._tryOpenPhone();
    });

    // ============================================================
    // PROMPT
    // ============================================================

    const promptFont = pxToWorld(this, DESK_PHONE_STYLE.promptFontPx);

    this.phonePrompt = this.add
      .text(
        this.phoneX,

        this.phoneY - DESK_PHONE_STYLE.promptOffsetY,

        this.phoneQuestComplete
          ? '[E] Buka kembali HP (Klik)'
          : '[E] Buka HP (Klik)',

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
    if (this.phoneInDialogue) {
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

    const { width, height } = this.scale;
    this._povContainer = this.add
      .container(width / 2, height + 450)
      .setDepth(15)
      .setScrollFactor(0);

    // Episode 2 dan 3 sengaja memakai bingkai tangan/ponsel yang sama.
    // Perbedaannya hanya isi: grup kelas di sini, DM pribadi di Episode 3.
    this._phonePovSprite = this.add
      .image(0, 0, 'phone-ep3-pov')
      .setOrigin(0.5, 1);
    const targetHeight = height * 0.72;
    const povScale = targetHeight / this._phonePovSprite.height;
    this._phonePovSprite.setScale(povScale);

    const screenCenterX = -33.5 * povScale;
    const screenWidth = (508 - 269) * povScale;
    const chatTopY = (94 - 685) * povScale;
    const chatBottomY = (316 - 685) * povScale;
    const headerTextX = (316 - 422) * povScale;
    const headerTitleY = (69 - 685) * povScale;
    const headerStatusY = (81 - 685) * povScale;

    this._povScreenCenterX = screenCenterX;
    this._povScreenWidth = screenWidth;
    this._povChatTopY = chatTopY;
    this._povChatBottomY = chatBottomY;
    this._povChatHeight = chatBottomY - chatTopY;

    this._povUserTitle = this.add
      .text(headerTextX, headerTitleY, 'Grup Kelas XI-A', {
        fontFamily: '"Pixelify Sans", monospace',
        fontSize: '9.5px',
        fontStyle: 'bold',
        color: '#f8fafc',
      })
      .setOrigin(0, 0.5);
    this._povStatusText = this.add
      .text(headerTextX, headerStatusY, '32 anggota • GRUP', {
        fontFamily: '"Pixelify Sans", monospace',
        fontSize: '8px',
        color: '#94a3b8',
      })
      .setOrigin(0, 0.5);
    this._povUserTitleDefaultX = headerTextX;

    this._chatStreamContainer = this.add.container(
      screenCenterX,
      chatBottomY - 4,
    );
    this._chatMaskGfx = this.make.graphics();
    this._chatMask = this._chatMaskGfx.createGeometryMask();
    this._chatStreamContainer.setMask(this._chatMask);

    this._povContainer.add([
      this._phonePovSprite,
      this._povUserTitle,
      this._povStatusText,
      this._chatStreamContainer,
    ]);

    this.tweens.add({
      targets: this._povContainer,
      y: height + 20,
      duration: 650,
      ease: 'Back.easeOut',
      onUpdate: () => this._updatePovChatMask(),
      onComplete: () => this._updatePovChatMask(),
    });
  }

  _updatePovChatMask() {
    if (!this._chatMaskGfx || !this._povContainer) return;
    this._chatMaskGfx.clear();
    const left =
      this._povContainer.x +
      this._povScreenCenterX -
      this._povScreenWidth / 2 +
      2;
    const top = this._povContainer.y + this._povChatTopY + 2;
    this._chatMaskGfx.fillRect(
      left,
      top,
      this._povScreenWidth - 4,
      this._povChatHeight - 4,
    );
  }

  // ==============================================================
  // SHOW GROUP CHAT
  // ==============================================================

  _showGroupChat() {
    if (!this._chatStreamContainer) return;

    this._chatStreamContainer.removeAll(true);

    const messages = [
      { sender: 'Alya', text: 'Tadi Kirana kenapa sih diam terus?' },
      { sender: 'Bimo', text: 'Sok misterius banget, wkwk.' },
      { sender: 'Dina', text: 'Jangan ajak dia dulu, bikin suasana aneh.' },
    ];

    const bubbles = messages.map((message) => this._createPovBubble(message));
    let cursorY = -this._povChatHeight + 12;
    bubbles.forEach(({ container, height }, index) => {
      const targetY = cursorY + height / 2;
      cursorY += height + 5;
      container.setY(targetY + 12).setAlpha(0).setScale(0.94);
      this.tweens.add({
        targets: container,
        y: targetY,
        alpha: 1,
        scaleX: 1,
        scaleY: 1,
        duration: 230,
        delay: index * 170,
        ease: 'Cubic.easeOut',
      });
    });
  }

  _createPovBubble({ sender, text, isPlayer = false }) {
    const maxBubbleWidth = Math.floor(this._povScreenWidth * 0.84);
    const paddingX = 7;
    const paddingY = 5;
    const messageText = this.add.text(0, 0, `${sender}\n${text}`, {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '8.5px',
      color: '#f1f5f9',
      wordWrap: { width: maxBubbleWidth - paddingX * 2 },
      lineSpacing: 1,
    });
    const bubbleWidth = Math.min(
      maxBubbleWidth,
      Math.max(54, Math.ceil(messageText.width + paddingX * 2)),
    );
    const bubbleHeight = Math.ceil(messageText.height + paddingY * 2);
    const x = isPlayer
      ? this._povScreenWidth / 2 - bubbleWidth / 2 - 6
      : -this._povScreenWidth / 2 + bubbleWidth / 2 + 6;
    const background = this.add
      .rectangle(
        x,
        0,
        bubbleWidth,
        bubbleHeight,
        isPlayer ? 0x0284c7 : 0x1e293b,
        0.96,
      )
      .setStrokeStyle(1, isPlayer ? 0x38bdf8 : 0x475569, 0.85);
    messageText.setPosition(
      x - bubbleWidth / 2 + paddingX,
      -bubbleHeight / 2 + paddingY,
    );

    const container = this.add.container(0, 0, [background, messageText]);
    this._chatStreamContainer.add(container);
    return { container, height: bubbleHeight };
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

    const container = this.add.container(
        this._povScreenCenterX,
        this._povChatTopY + 28,
    );

    // ==========================================================
    // BOX NOTIF
    // ==========================================================

    const box = this.add.rectangle(
        0,
        0,
        this._povScreenWidth - 12,
        38,
        0x1e293b,
        0.96
    );

    // Border
    box.setStrokeStyle(1, 0x35415f, 1);

    // ==========================================================
    // DOT HIJAU
    // ==========================================================

    const dot = this.add.circle(
        -this._povScreenWidth / 2 + 18,
        0,
        4,
        0x4ade80
    );

    // ==========================================================
    // TEKS
    // ==========================================================

    const text = this.add.text(
        -this._povScreenWidth / 2 + 30,
        0,
        'Rafi\n1 pesan baru',
        {
            fontFamily: '"Pixelify Sans", monospace',
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
    container.setY(this._povChatTopY + 18);

    this.tweens.add({
        targets: container,
        alpha: 1,
        y: this._povChatTopY + 28,
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
        y: this._rafiNotificationContainer.y - 10,
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
        this._povUserTitle.x = this._povUserTitleDefaultX;
    }
    this._povStatusText?.setText('Online • DM').setColor('#4ade80');

    const cleanText = String(text || '').replace(/^"|"$/g, '').trim();
    const { container, height } = this._createPovBubble({
      sender: 'Rafi',
      text: cleanText,
    });
    const targetY = -height / 2 - 8;
    container.setY(targetY + 12).setAlpha(0).setScale(0.94);
    this.tweens.add({
        targets: container,
        y: targetY,
        alpha: 1,
        scaleX: 1,
        scaleY: 1,
        duration: 240,
        ease: 'Cubic.easeOut',
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
            onUpdate: () => this._updatePovChatMask(),
            onComplete: () => {
                if (this._povContainer) {
                    this._povContainer.destroy();
                    this._povContainer = null;
                }

                this._phonePovSprite = null;
                this._chatStreamContainer = null;
                this._povUserTitle = null;
                this._povStatusText = null;
                this._rafiNotificationContainer = null;
                this._chatMask?.destroy();
                this._chatMask = null;
                this._chatMaskGfx?.destroy();
                this._chatMaskGfx = null;
                this._povShown = false;
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

        markNpcTalked(2, collectedChoices);

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

            waitForEpisodeContinue: true,
          });
        }

        if (!this.scene.isActive()) {
          return;
        }

        // Pilih "Lanjut Main" langsung menuju hasil episode. Jika
        // pemain memilih Kak Dara, Promise di atas baru selesai setelah
        // tombol "Lanjut ke Episode Selanjutnya" di chat ditekan.
        this._finishEpisode2();
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

  // HP tetap dapat dibuka ketika episode dimainkan ulang. Sebelumnya
  // progres tersimpan membuat seluruh interaksi HP dimatikan, sehingga
  // ponsel tampak tidak berfungsi setelah satu kali permainan.
  const distance = Math.abs(this.player.x - this.phoneX);
  const inRange = distance <= PHONE_INTERACTION_RADIUS;
  this.phonePrompt?.setVisible(!this.phoneInDialogue && inRange);

  if (inRange && Phaser.Input.Keyboard.JustDown(this.interactKey)) {
    this._tryOpenPhone();
  }

}}
