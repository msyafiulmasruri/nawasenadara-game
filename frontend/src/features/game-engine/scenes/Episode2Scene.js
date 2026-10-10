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
const PHONE_INTERACTION_RADIUS = 115;

export default class Episode2Scene extends BasePlayerScene {
  constructor() {
    super('Episode2Scene');
  }

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

  create(data) {
    super.create(data);

    // ============================================================
    // SELARASKAN UKURAN KARAKTER (PERSIS ACUAN EPISODE 3)
    // ============================================================
    const newGroundY = 720 - 60;
    const newDisplayHeight = 485;
    const newScale = newDisplayHeight / 400;

    this.groundY = newGroundY;
    this.playerDisplayHeight = newDisplayHeight;
    this.spriteScale = newScale;

    if (this.player) {
      this.player.setScale(newScale);
      this.player.setY(newGroundY);
      this.player.setDepth(5);
      this.physics.world.setBounds(0, 0, this.levelWidth, 720);
    }

    this.setChatButtonVisible(false);
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
        'Buka ponsel di meja kamar dan perhatikan percakapan di grup kelas. Buat keputusan yang tepat untuk membantu Kirana dan menghentikan perundungan siber.',
      onContinue: () => {
        this.uiInputLocked = false;
        if (this.audioManager) {
          this.audioManager.resume();
        }
      },
    });
  }

  createBackground(width, height) {
    this.finished = false;

    if (!this.textures.exists('episode2-bg')) {
      this.levelWidth = width;
      this.add.rectangle(width / 2, height / 2, width, height, 0x5b4a55).setDepth(0);
      this._backgroundScale = 1;
      this._bgLeft = 0;
      this.walkMinX = LEVEL_EDGE_MARGIN;
      this.walkMaxX = Math.max(LEVEL_EDGE_MARGIN, this.levelWidth - LEVEL_EDGE_MARGIN);
      this.phoneX = 760;
      this.phoneY = 420;
      this._createPhoneObject();
      return;
    }

    const source = this.textures.get('episode2-bg').getSourceImage();
    const scale = height / source.height;
    const naturalWidth = Math.round(source.width * scale);

    this._backgroundScale = scale;
    this._bgLeft = 0;
    this.levelWidth = naturalWidth;

    this.walkMinX = LEVEL_EDGE_MARGIN;
    this.walkMaxX = Math.max(LEVEL_EDGE_MARGIN, this.levelWidth - LEVEL_EDGE_MARGIN);

    this.phoneX = 760;
    this.phoneY = 420;

    // Backdrop gelap elegan untuk layar lebar / split screen
    this.add
      .rectangle(
        naturalWidth / 2,
        height / 2,
        Math.max(naturalWidth * 2, width * 2),
        height * 2,
        0x05050f,
      )
      .setDepth(-1);

    this.bg = this.add.image(naturalWidth / 2, height / 2, 'episode2-bg');
    this.bg.setDisplaySize(naturalWidth, height);
    this.bg.setDepth(0);

    this._createAtmosphericLayers(width, height);
    this._createPhoneObject();
  }

  // --- Lapisan Suasana Dinamis ---
  _createAtmosphericLayers(width, height) {
    this._ambientDarkness = this.add
      .rectangle(width / 2, height / 2, width * 1.5, height * 1.5, 0x050718, 0)
      .setScrollFactor(0)
      .setDepth(8);

    this._warmSafeOverlay = this.add
      .rectangle(width / 2, height / 2, width * 1.5, height * 1.5, 0xffd175, 0)
      .setScrollFactor(0)
      .setDepth(10);
  }

  // ==============================================================
  // OBJEK PONSEL INTERAKTIF DI MEJA (PERSIS EPISODE 3)
  // ==============================================================
  _createPhoneObject() {
    const phoneX = this.phoneX;
    const phoneY = this.phoneY;

    // Halo cahaya biru neon di meja
    this._phoneHalo = this.add
      .ellipse(phoneX, phoneY + 16, 44, 14, 0x00f0ff, 0.45)
      .setDepth(1);

    // Sprite pixel art smartphone di atas meja
    this._phoneSprite = this.add
      .image(phoneX, phoneY, 'phone-ep3')
      .setScale(0.55)
      .setDepth(2)
      .setInteractive({ useHandCursor: true });

    // Animasi getar berkala ponsel di meja
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
      .circle(phoneX + 14, phoneY - 18, 6, 0xff3b30)
      .setDepth(3);

    this.tweens.add({
      targets: this._notifBadge,
      scale: { from: 0.8, to: 1.3 },
      duration: 400,
      yoyo: true,
      repeat: -1,
    });

    // SFX getar berkala
    this._tableVibrateTimer = this.time.addEvent({
      delay: 3800,
      loop: true,
      callback: () => {
        if (!this.phoneQuestComplete && !this.phoneInDialogue) {
          this.audioManager?.playPhoneVibrate();
        }
      },
    });

    // Prompt teks interaksi di atas ponsel
    const promptFont = pxToWorld(this, 14);
    const promptBaseY = phoneY - 42;
    this.phonePrompt = this.add
      .text(phoneX, promptBaseY, '[E] Buka Pesan Grup (Klik)', {
        fontFamily: '"Pixelify Sans", monospace',
        fontSize: `${promptFont}px`,
        color: '#ffdd57',
        backgroundColor: '#1a0a2ecc',
        padding: { x: 10, y: 5 },
      })
      .setOrigin(0.5)
      .setDepth(6)
      .setVisible(false)
      .setInteractive({ useHandCursor: true });

    this.phonePrompt.on('pointerdown', () => this._tryOpenPhone());
    this._phoneSprite.on('pointerdown', () => this._tryOpenPhone());

    this.registerLockable(this.phonePrompt);
    this.registerLockable(this._phoneSprite);

    this.tweens.add({
      targets: this.phonePrompt,
      y: promptBaseY - 8,
      duration: 600,
      yoyo: true,
      repeat: -1,
    });

    this.interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.dialogueBox = new DialogueBox(this);
  }

  // ==============================================================
  // POV SMARTPHONE (TANGAN MEMEGANG HP DI LAYAR)
  // ==============================================================
  _setupPovPhone() {
    const { width, height } = this.scale;

    if (this._povContainer) {
      this._povContainer.destroy();
    }

    this._povContainer = this.add.container(width / 2, height + 450).setDepth(15).setScrollFactor(0);

    // Sprite Tangan + Smartphone POV
    this._phonePovSprite = this.add
      .image(0, 0, 'phone-ep3-pov')
      .setOrigin(0.5, 1);

    const targetH = height * 0.72;
    const povScale = targetH / this._phonePovSprite.height;
    this._phonePovSprite.setScale(povScale);
    this._povScale = povScale;

    const screenCenterX = -33.5 * povScale;
    const screenW = (508 - 269) * povScale;

    const chatTopY = (94 - 685) * povScale;
    const chatBottomY = (316 - 685) * povScale;
    const chatH = chatBottomY - chatTopY;

    this._screenCenterX = screenCenterX;
    this._screenW = screenW;
    this._chatTopY = chatTopY;
    this._chatBottomY = chatBottomY;
    this._chatH = chatH;

    // Header Grup Kelas
    const headerTextX = (316 - 422) * povScale;
    const headerTitleY = (69 - 685) * povScale;
    const headerStatusY = (81 - 685) * povScale;

    this._povUserTitle = this.add
      .text(headerTextX, headerTitleY, 'Grup Kelas X-B', {
        fontFamily: '"Pixelify Sans", monospace',
        fontSize: '9.5px',
        fontStyle: 'bold',
        color: '#f8fafc',
      })
      .setOrigin(0, 0.5);

    this._povStatusText = this.add
      .text(headerTextX, headerStatusY, '32 Anggota • 14 Online', {
        fontFamily: '"Pixelify Sans", monospace',
        fontSize: '8px',
        color: '#4ade80',
      })
      .setOrigin(0, 0.5);

    // Container aliran bubble chat
    this._chatStreamContainer = this.add.container(screenCenterX, chatBottomY - 4);
    this._chatBubbles = [];
    this._chatStreamTotalH = 0;

    // Mask membatasi chat agar tetap di dalam layar kaca
    this._chatMaskGfx = this.make.graphics();
    this._chatMask = this._chatMaskGfx.createGeometryMask();
    this._chatStreamContainer.setMask(this._chatMask);
    this._updateChatMask();

    this._povContainer.add([
      this._phonePovSprite,
      this._povUserTitle,
      this._povStatusText,
      this._chatStreamContainer,
    ]);

    // Slide up masuk layar
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

  _updateChatMask() {
    if (!this._chatMaskGfx || !this._povContainer) return;
    this._chatMaskGfx.clear();
    const screenLeft = this._povContainer.x + this._screenCenterX - this._screenW / 2 + 2;
    const screenTop = this._povContainer.y + this._chatTopY + 2;
    this._chatMaskGfx.fillRect(screenLeft, screenTop, this._screenW - 4, this._chatH - 4);
  }

  _addPhoneChatMessage({ sender, text }) {
    if (!this._chatStreamContainer || !this._povContainer) return;

    const cleanText = text.replace(/^"|"$/g, '').trim();
    if (!cleanText) return;

    const screenW = this._screenW || 172;
    const maxBubbleW = Math.floor(screenW * 0.82);
    const isPlayer = sender === 'player' || sender === 'sekar';
    const isSystem = sender === 'system' || sender === 'narration';

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
      color: isSystem ? '#cbd5e1' : '#f8fafc',
      wordWrap: { width: maxBubbleW - paddingX * 2 },
      lineSpacing: 1,
      align: isSystem ? 'center' : 'left',
    });

    const bubbleW = Math.max(Math.ceil(msgText.width + paddingX * 2), 40);
    const bubbleH = Math.ceil(msgText.height + paddingY * 2);

    let bgColor = 0x1e293b;
    let strokeColor = 0x475569;
    if (isSystem) {
      bgColor = 0x0f172a;
      strokeColor = 0x334155;
    } else if (isPlayer) {
      bgColor = 0x0284c7; // Biru DM balasan Sekar
      strokeColor = 0x38bdf8;
    }

    const bubbleBg = this.add
      .rectangle(0, 0, bubbleW, bubbleH, bgColor, 0.95)
      .setStrokeStyle(1, strokeColor, 0.8);

    let posX = 0;
    if (isSystem) {
      posX = 0;
    } else if (isPlayer) {
      posX = screenW / 2 - bubbleW / 2 - 6;
    } else {
      posX = -screenW / 2 + bubbleW / 2 + 6;
    }

    bubbleBg.setPosition(posX, 0);
    msgText.setPosition(posX - bubbleW / 2 + paddingX, -bubbleH / 2 + paddingY);

    bubbleContainer.add([bubbleBg, msgText]);
    this._chatStreamContainer.add(bubbleContainer);

    this._chatBubbles.push({
      container: bubbleContainer,
      height: bubbleH,
    });

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

    this._relayoutChatBubbles(true);

    bubbleContainer.setScale(0.92);
    this.tweens.add({
      targets: bubbleContainer,
      scaleX: 1,
      scaleY: 1,
      duration: 150,
      ease: 'Back.easeOut',
    });

    this._shakePovPhone(2, 90);

    if (this.audioManager) {
      if (isPlayer) {
        this.audioManager.playMessageSent();
      } else {
        this.audioManager.playMessageReceived(false);
      }
    }
  }

  _relayoutChatBubbles(animate = true) {
    if (!this._chatBubbles || this._chatBubbles.length === 0) return;

    const gap = 8;
    const maxFeedH = Math.max((this._chatH || 155) - 25, 110);
    let currentBottomY = 0;

    for (let i = this._chatBubbles.length - 1; i >= 0; i--) {
      const b = this._chatBubbles[i];
      const targetY = currentBottomY - b.height / 2;
      currentBottomY -= (b.height + gap);

      b.targetY = targetY;
      const bubbleTop = targetY - b.height / 2;
      const isOutAbove = bubbleTop < -maxFeedH;

      if (isOutAbove) {
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

  _shakePovPhone(intensity = 2, duration = 100) {
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

  _tryOpenPhone() {
    if (this.phoneInDialogue || this.phoneQuestComplete) return;
    if (this.uiInputLocked) return;
    if (!this.phonePrompt?.visible) return;
    if (this.time.now < this._phoneInteractCooldownUntil) return;

    if (this._tableVibrateTimer) {
      this._tableVibrateTimer.remove();
      this._tableVibrateTimer = null;
    }
    if (this.audioManager) {
      this.audioManager.resume();
      this.audioManager.playPhoneVibrate();
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
    if (this.phoneInDialogue) return;
    this.phoneInDialogue = true;
    this.phonePrompt?.setVisible(false);

    this.uiInputLocked = true;
    this.player?.setVelocity(0, 0);
    this.player?.anims.stop();

    // Munculkan layar POV smartphone
    this._setupPovPhone();

    this.dialogueBox.open({
      dialogueTree: EPISODE2_DIALOGUE,
      npcPortraitKey: 'npc-rafi-portrait',
      npcName: 'Rafi',
      playerName: getCharacterName(),
      onNodeChange: (node) => {
          if (!node) return;
          const isRafi = node.speaker === 'rafi';
          const isDiving = node.id && node.id.startsWith('n5');

          if (isDiving) {
            this.tweens.add({
              targets: this._ambientDarkness,
              fillAlpha: 0.45,
              duration: 600,
            });
          } else if (node.id && node.id.startsWith('n7')) {
            this.tweens.add({
              targets: this._ambientDarkness,
              fillAlpha: 0,
              duration: 600,
            });
          }

          if (isRafi) {
            this._addPhoneChatMessage({
              sender: 'rafi',
              text: `Rafi: "${node.text}"`,
            });
          }
      },
      onChoiceSelected: (choice) => {
        if (choice && choice.label) {
          this._addPhoneChatMessage({
            sender: 'player',
            text: choice.label,
          });
        }
      },
      onClose: async (collectedChoices) => {
        this.phoneChoices = collectedChoices;
        this.phoneQuestComplete = true;
        this.clearQuestGuide();

        // Hentikan efek getar meja
        this.tweens.killTweensOf([this._phoneSprite, this._phoneHalo, this._notifBadge]);
        this._phoneSprite?.setAlpha(0.65);
        this._phoneHalo?.destroy();
        this._notifBadge?.destroy();

        // Kembalikan cahaya kamar
        this.tweens.add({
          targets: this._ambientDarkness,
          fillAlpha: 0,
          duration: 400,
        });

        // Slide down POV phone
        if (this._povContainer) {
          this.tweens.add({
            targets: this._povContainer,
            y: this.scale.height + 450,
            duration: 550,
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

        this.setChatButtonVisible(true);

        this._closePovPhone();

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

  getCounselingAutoContext() {
    return buildEpisode2CounselingContext(this.phoneChoices);
  }

  _finishEpisode2() {
    if (this.finished) return;
    this.finished = true;

    this.uiInputLocked = true;
    this.phonePrompt?.setVisible(false);
    this.player?.setVelocity(0, 0);
    this.player?.anims.stop();

    const choices = this.phoneChoices || [];

    if (this.player) {
      this.tweens.add({
        targets: this.player,
        alpha: 0,
        duration: 300,
        ease: 'Sine.easeOut',
        onComplete: () => {
          this.scene.start('EpisodeEndingScene', {
            episodeId: 2,
            isLastEpisode: false,
            choices,
          });
        },
      });
      return;
    }

    this.scene.start('EpisodeEndingScene', {
      episodeId: 2,
      isLastEpisode: false,
      choices,
    });
  }

  onSceneUpdate() {
    if (!this.player || this.finished) return;

    this.player.x = Phaser.Math.Clamp(this.player.x, this.walkMinX, this.walkMaxX);

    if (this.phoneInDialogue || this.phoneQuestComplete) {
      this.phonePrompt?.setVisible(false);
      return;
    }

    const distance = Math.abs(this.player.x - this.phoneX);
    const inRange = distance <= PHONE_INTERACTION_RADIUS;
    this.phonePrompt?.setVisible(inRange);

    if (inRange && Phaser.Input.Keyboard.JustDown(this.interactKey)) {
      this._tryOpenPhone();
    }
  }
}
