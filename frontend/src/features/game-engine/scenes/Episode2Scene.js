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
const EPISODE2_PLAYER_SCALE_MULTIPLIER = 1.4;

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

      // ==========================================================
      // DIALOGUE FINISHED
      // ==========================================================

      onClose: async (collectedChoices) => {
        this.phoneChoices = collectedChoices;

        this.phoneQuestComplete = true;

        this.clearQuestGuide();

        // Kak Dara sekarang boleh digunakan.
        this.setChatButtonVisible(true);

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

    // ============================================================
    // DIALOGUE / QUEST FINISHED
    // ============================================================

    if (this.phoneInDialogue || this.phoneQuestComplete) {
      this.phonePrompt?.setVisible(false);

      return;
    }

    // ============================================================
    // PHONE PROXIMITY
    // ============================================================

    const distance = Math.abs(this.player.x - this.phoneX);

    const inRange = distance <= PHONE_INTERACTION_RADIUS;

    this.phonePrompt?.setVisible(inRange);

    // ============================================================
    // KEY E
    // ============================================================

    if (inRange && Phaser.Input.Keyboard.JustDown(this.interactKey)) {
      this._tryOpenPhone();
    }
  }
}
