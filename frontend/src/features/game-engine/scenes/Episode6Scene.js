import Phaser from 'phaser';
import BasePlayerScene from './BasePlayerScene';
import { LEVEL_EDGE_MARGIN } from '../config/gameConfig';
import { getNpcByEpisode } from '../config/npcs';
import {
  EPISODE6_DIALOGUE,
  buildEpisode6RevisitDialogue,
  buildEpisode6CounselingContext,
} from '../dialogue/episode6Dialogue';
import DialogueBox from '../ui/DialogueBox';
import ObjectiveBriefing from '../ui/ObjectiveBriefing';
import { getCharacterName } from '../utils/characterName';
import { hasTalkedToNpc, markNpcTalked } from '../utils/progressStore';
import { getVisibleBounds, pxToWorld } from '../utils/visibleBounds';
import { getEpisodeById } from '../config/episodes';

// ================================================================
// EPISODE 6 — "Langkah Berani Bersama"
// ================================================================
// Latar: Depan gerbang utama SMA Negeri 1 & Pos Satpam di ujung sore.
// Karakter: Naya (sahabat setia Dara yang selalu mendampingi dan
//           membantu menginisiasi gerakan 'Teman Aman').
// ================================================================

export default class Episode6Scene extends BasePlayerScene {
  constructor() {
    super('Episode6Scene');
  }

  create(data) {
    super.create(data);

    this.uiInputLocked = true;
    this.player?.setVelocity(0, 0);
    this.player?.anims.stop();

    // Tambahkan efek atmosfer angin sore dan kilau hangat di halaman sekolah
    this._createAfternoonAtmosphere();

    const episodeData = getEpisodeById(6);
    this.objectiveBriefing = new ObjectiveBriefing(this);
    this.objectiveBriefing.show({
      title: 'TUJUAN EPISODE',
      objectiveText:
        episodeData?.objective ??
        'Hampiri Naya di depan gerbang sekolah, berlatih menetapkan batasan asertif, dan bersama-sama bangun tempat yang aman.',
      onContinue: () => {
        this.uiInputLocked = false;
      },
    });
  }

  /** Efek atmosfer sore hari: partikel kilau debu & hembusan angin keemasan */
  _createAfternoonAtmosphere() {
    const { height } = this.scale;
    const breezeGroup = this.add.group();

    for (let i = 0; i < 14; i++) {
      const startX = Phaser.Math.Between(0, this.levelWidth || 1600);
      const startY = Phaser.Math.Between(-30, height * 0.75);
      const particle = this.add.rectangle(
        startX,
        startY,
        Phaser.Math.Between(3, 5),
        Phaser.Math.Between(2, 4),
        0xffe082,
        0.55
      );
      particle.setDepth(2);
      breezeGroup.add(particle);

      this.tweens.add({
        targets: particle,
        x: `+=${Phaser.Math.Between(90, 180)}`,
        y: `+=${Phaser.Math.Between(80, 160)}`,
        angle: Phaser.Math.Between(0, 360),
        alpha: { from: 0.6, to: 0.05 },
        duration: Phaser.Math.Between(5000, 8500),
        repeat: -1,
        delay: Phaser.Math.Between(0, 4500),
        onRepeat: () => {
          particle.x = Phaser.Math.Between(0, this.levelWidth || 1600);
          particle.y = Phaser.Math.Between(-25, 30);
          particle.alpha = 0.6;
        },
      });
    }
  }

  createBackground(width, height) {
    this.finished = false;

    // Set titik pijak kaki tepat di atas permukaan trotoar paving (~88% tinggi layar)
    // Supaya kedua kaki Dara dan Naya menapak mantap di tanah tanpa melayang.
    this.groundY = Math.round(height * 0.88);

    // Memuat background depan gerbang sekolah / pos satpam yang rapi
    const bgKey = this.textures.exists('episode-6-bg')
      ? 'episode-6-bg'
      : this.textures.exists('episode6-bg')
      ? 'episode6-bg'
      : null;

    if (bgKey) {
      const source = this.textures.get(bgKey).getSourceImage();
      const scale = height / source.height;
      const naturalWidth = Math.round(source.width * scale);

      // Pastikan levelWidth minimal selebar layar viewport agar tidak ada ruang kosong
      this.levelWidth = Math.max(naturalWidth, width);

      this.bg = this.add.image(this.levelWidth / 2, height / 2, bgKey);
      this.bg.setDisplaySize(this.levelWidth, height);
      this.bg.setDepth(0);
    } else {
      // Fallback placeholder jika tekstur belum tersedia
      this.levelWidth = Math.max(1600, width);
      this.bg = this.add.rectangle(this.levelWidth / 2, height / 2, this.levelWidth, height, 0x1a1a2e);
      this.bg.setDepth(0);
    }

    this._createNpc();
  }

  // --- Setup NPC Naya ----------------------------------------------
  _createNpc() {
    const npcConfig = getNpcByEpisode(6);
    if (!npcConfig) return;

    this.npcConfig = npcConfig;
    this.npcInDialogue = false;
    this.npcTalked = false;

    const npcX = this.levelWidth * npcConfig.xRatio;
    const spriteKey =
      npcConfig.worldSpriteKey || npcConfig.textureKey || npcConfig.portraitKey || 'naya';
    const npcTexture = this.textures.exists(spriteKey)
      ? spriteKey
      : this.textures.exists('naya')
      ? 'naya'
      : null;

    if (npcTexture) {
      // Menyesuaikan tinggi Naya utuh (dari kepala hingga sepatu) agar seimbang dengan Dara
      const targetHeight = 224;
      const contentHeight = npcConfig.contentHeight || 980;
      const bottomPadding = npcConfig.bottomPadding ?? 24;
      const scale = targetHeight / contentHeight;

      this.npcSprite = this.add.image(
        npcX,
        this.groundY + bottomPadding * scale,
        npcTexture
      );
      this.npcSprite.setOrigin(0.5, 1);
      this.npcSprite.setScale(scale);
      this._npcVisualHeight = contentHeight * scale;
    } else {
      this.npcSprite = this.add.rectangle(npcX, this.groundY, 80, 200, 0x334155);
      this.npcSprite.setOrigin(0.5, 1);
      this._npcVisualHeight = 200;
    }

    this.npcSprite.setDepth(1);
    this.npcSprite.setInteractive({ useHandCursor: true });
    this.npcSprite.on('pointerdown', () => this._tryTalkToNpc());
    this.registerLockable(this.npcSprite);

    // Prompt mengambang di atas kepala Naya
    const promptFont = pxToWorld(this, 15);
    const promptY = this.groundY - this._npcVisualHeight - 26;
    this.npcPrompt = this.add
      .text(npcX, promptY, '[E] Sapa Naya (Klik)', {
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

    // Peringatan di ujung level jika belum berbicara dengan Naya
    const hintFont = pxToWorld(this, 15);
    this.endBlockHint = this.add
      .text(
        this.levelWidth - LEVEL_EDGE_MARGIN,
        this.groundY - 60,
        'Kamu melihat Naya melambaikan tangan di depan gerbang...\nCoba hampiri sahabatmu terlebih dahulu.',
        {
          fontFamily: '"Pixelify Sans", monospace',
          fontSize: `${hintFont}px`,
          color: '#ffffff',
          align: 'center',
          backgroundColor: '#1a1a2e',
          padding: { x: 12, y: 7 },
        }
      )
      .setOrigin(0.5, 1)
      .setDepth(2)
      .setVisible(false);

    this.dialogueBox = new DialogueBox(this);
    this.interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);

    this.setChatButtonVisible(Boolean(this.npcTalked));
    this.updateQuestGuide();
  }

  updateQuestGuide() {
    if (this.npcTalked) {
      this.clearQuestGuide();
    } else {
      this.setQuestGuide(`○ ── Temui ${this.npcConfig?.name || 'Naya'} di depan gerbang sekolah ──`);
    }
  }

  _tryTalkToNpc() {
    if (this.npcInDialogue) return;
    if (this.time.now < (this._npcInteractCooldownUntil || 0)) return;

    // Radius interaksi responsif — tombol prompt atau klik sprite langsung memicu dialog
    const dist = Math.abs(this.player.x - this.npcSprite.x);
    const triggerRadius = (this.npcConfig.interactionRadius || 150) + 40;
    if (dist > triggerRadius) return;

    if (this.npcTalked) {
      this._startRevisitDialogue();
    } else {
      this._startNpcDialogue();
    }
  }

  _startRevisitDialogue() {
    if (this.npcInDialogue) return;
    this.npcInDialogue = true;
    this.npcPrompt.setVisible(false);
    this.uiInputLocked = true;
    this.player?.setVelocityX(0);
    this.player?.anims.stop();

    this.dialogueBox.open({
      dialogueTree: buildEpisode6RevisitDialogue(),
      npcPortraitKey: this.npcConfig.portraitKey,
      npcName: this.npcConfig.name,
      playerName: getCharacterName(),
      cardWidth: 710,
      onNodeChange: (node) => {
        this._updateCutsceneForNode(node);
      },
      onClose: async (collectedChoices) => {
        this._hideCutscene();
        if (Array.isArray(collectedChoices) && collectedChoices.length > 0) {
          const questChoices = collectedChoices.filter((c) => c.nodeId?.startsWith('n'));
          if (questChoices.length > 0) {
            this.npcChoices = questChoices;
            markNpcTalked(this.episodeId ?? 6, questChoices);
          }
        }
        this.npcTalked = true;
        this.setChatButtonVisible(true);
        this.updateQuestGuide();

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
      dialogueTree: EPISODE6_DIALOGUE,
      npcPortraitKey: this.npcConfig.portraitKey,
      npcName: this.npcConfig.name,
      playerName: getCharacterName(),
      cardWidth: 710,
      onNodeChange: (node) => {
        this._updateCutsceneForNode(node);
        // Sinkronisasi alur cerita: Naya kembali masuk ke dalam gedung saat Babak 2
        if (node.id === 'n2' || node.id.startsWith('n2_') || node.id === 'n3') {
          this.npcSprite?.setVisible(false);
          this.npcPrompt?.setVisible(false);
        }
      },
      onClose: async (collectedChoices) => {
        this._hideCutscene();
        this.npcTalked = true;
        this.npcChoices = collectedChoices;

        markNpcTalked(this.episodeId ?? 6, collectedChoices);
        this.setChatButtonVisible(true);
        this.updateQuestGuide();

        const ui = window.__nawasenadaraUI;
        if (ui?.offerCounseling) {
          await ui.offerCounseling({
            episodeId: this.episodeId ?? 6,
            npcName: this.npcConfig.name,
            autoContext: this.getCounselingAutoContext(),
          });
        }

        // Transisi pamungkas otomatis ke Ending Scene sebagai penutup 6 episode
        this.finished = true;
        this.uiInputLocked = true;
        this.player?.setVelocity(0, 0);
        this.player?.anims.stop();

        this.tweens.add({
          targets: this.player,
          alpha: 0,
          duration: 300,
          ease: 'Sine.easeOut',
          onComplete: () => {
            this.scene.start('EpisodeEndingScene', {
              episodeId: 6,
              isLastEpisode: true,
              choices: collectedChoices || [],
            });
          },
        });
      },
    });
  }

  /**
   * Menentukan tampilan cutscene sinematik visual penuh sesuai alur 5 babak Episode 6
   */
  _updateCutsceneForNode(node) {
    if (!node || !node.id) {
      this._hideCutscene();
      return;
    }

    const id = node.id;

    // Babak 1: Kilas Sore (Obrolan Santai & Hangat Sepulang Ekskul Bersama Naya)
    if (
      id === 'n1' ||
      id === 'n1_banter1' ||
      id === 'n1_dara_reply1' ||
      id === 'n1_banter2' ||
      id === 'n1_dara_reply2' ||
      id === 'n1_banter3' ||
      id === 'n_chat_icebreak' ||
      id.startsWith('n1_res_') ||
      id === 'n1_keys_notice' ||
      id === 'n1_dara_wait' ||
      id === 'n1_naya_instruct' ||
      id === 'n1_corridor_end'
    ) {
      this._showCutscene(
        'ep6-corridor-chat-cg',
        '✦ Kilas Sore: Obrolan Hangat Sepulang Ekskul Bersama Naya ✦'
      );
    }
    // Babak 2: Halaman Dekat Gerbang Sekolah (Tekanan Senior & Batasan Asertif)
    else if (
      id === 'n2' ||
      id === 'n2_senior_entry' ||
      id === 'n2_senior_talk' ||
      id === 'n2_senior_insist' ||
      id === 'n3' ||
      id === 'n4a' ||
      id === 'n4b' ||
      id === 'n4c' ||
      id === 'n4d'
    ) {
      this._showCutscene(
        'ep6-gate-pressure-cg',
        '✦ Gerbang Depan Sekolah: Menghadapi Tekanan & Batasan Asertif ✦'
      );
    }
    // Babak 3 & 4: Pos Satpam (Perlindungan Aman & Perencanaan Bersama)
    else if (
      id === 'n4_rescue_shout' ||
      id === 'n4_senior_flee' ||
      id === 'n5_haven_arrival' ||
      id === 'n5' ||
      id === 'n5_grounding_complete' ||
      id === 'n5_validation' ||
      id === 'n6' ||
      id === 'n7a' ||
      id === 'n7b' ||
      id === 'n7c' ||
      id === 'n7d'
    ) {
      this._showCutscene(
        'ep6-safety-haven-cg',
        '✦ Pos Satpam: Ruang Aman, Menenangkan Diri & Rencana Melapor ✦'
      );
    }
    // Babak 5: Aula Sekolah (Puncak Epik: Deklarasi "Teman Aman")
    else if (
      id === 'n8_transition' ||
      id === 'n8_movement_born' ||
      id === 'n8_hall_ceremony' ||
      id === 'n8_naya_proud' ||
      id === 'n8_epilogue' ||
      id === 'n8_final' ||
      id.startsWith('rev_')
    ) {
      this._showCutscene(
        'ep6-teman-aman-cg',
        '✦ Aula Sekolah: Deklarasi Gerakan Solidaritas "Teman Aman" ✦'
      );
    } else {
      this._hideCutscene();
    }
  }

  /** Menampilkan cutscene sinematik layar penuh dengan transisi halus antar babak */
  _showCutscene(textureKey, titleText) {
    if (!this.textures.exists(textureKey)) return;

    const bounds = getVisibleBounds(this);
    const { width, height } = this.scale;
    const centerX = bounds.centerX;
    const centerY = bounds.centerY;

    if (!this._cutsceneContainer) {
      // Depth 100 agar berada di atas world gameplay (background, NPC, player),
      // namun di bawah DialogueBox (depth 500) & HUD jeda.
      this._cutsceneContainer = this.add.container(0, 0).setDepth(100).setScrollFactor(0);

      // Background hitam pekat penutup layar penuh
      this._cutsceneBg = this.add
        .rectangle(centerX, centerY, width * 1.5, height * 1.5, 0x000000, 1)
        .setOrigin(0.5);

      // Gambar CG cutscene layar penuh
      this._cutsceneImg = this.add.image(centerX, centerY, textureKey).setOrigin(0.5);

      // Lapisan suasana hangat/senja
      this._cutsceneVignette = this.add
        .rectangle(centerX, centerY, width * 1.5, height * 1.5, 0x1f140e, 0.16)
        .setOrigin(0.5);

      // Banner judul sinematik di bagian atas layar
      this._cutsceneTitle = this.add
        .text(centerX, bounds.top + pxToWorld(this, 22), '', {
          fontFamily: '"Pixelify Sans", monospace',
          fontSize: `${pxToWorld(this, 14)}px`,
          color: '#ffdd57',
          backgroundColor: '#0a0a16e0',
          padding: { x: 16, y: 7 },
          align: 'center',
        })
        .setOrigin(0.5, 0)
        .setStroke('#11111b', 2);

      this._cutsceneContainer.add([
        this._cutsceneBg,
        this._cutsceneImg,
        this._cutsceneVignette,
        this._cutsceneTitle,
      ]);
    }

    // Posisikan dan sesuaikan ukuran ke layar penuh (cover full screen)
    this._cutsceneBg.setPosition(centerX, centerY);
    this._cutsceneBg.setSize(bounds.width * 1.3, bounds.height * 1.3);

    this._cutsceneVignette.setPosition(centerX, centerY);
    this._cutsceneVignette.setSize(bounds.width * 1.3, bounds.height * 1.3);

    this._cutsceneTitle.setText(titleText || '');
    this._cutsceneTitle.setFontSize(`${pxToWorld(this, 14)}px`);
    this._cutsceneTitle.setPosition(centerX, bounds.top + pxToWorld(this, 22));

    if (
      this._currentCutsceneKey === textureKey &&
      this._cutsceneContainer.visible &&
      this._cutsceneContainer.alpha > 0.8
    ) {
      return;
    }

    const previousKey = this._currentCutsceneKey;
    this._currentCutsceneKey = textureKey;

    const imgSource = this.textures.get(textureKey).getSourceImage();
    const scaleX = bounds.width / imgSource.width;
    const scaleY = bounds.height / imgSource.height;
    const coverScale = Math.max(scaleX, scaleY);

    if (this._cutsceneContainer.visible && previousKey && previousKey !== textureKey) {
      // Transisi halus antar scene cutscene (Crossfade)
      this.tweens.killTweensOf(this._cutsceneContainer);
      this.tweens.add({
        targets: this._cutsceneContainer,
        alpha: 0.35,
        duration: 180,
        ease: 'Sine.easeIn',
        onComplete: () => {
          this._cutsceneImg.setTexture(textureKey);
          this._cutsceneImg.setScale(coverScale);
          this._cutsceneImg.setPosition(centerX, centerY);
          this.tweens.add({
            targets: this._cutsceneContainer,
            alpha: 1,
            duration: 250,
            ease: 'Sine.easeOut',
          });
        },
      });
    } else {
      // Muncul pertama kali dari gameplay
      this._cutsceneImg.setTexture(textureKey);
      this._cutsceneImg.setScale(coverScale);
      this._cutsceneImg.setPosition(centerX, centerY);
      this._cutsceneContainer.setAlpha(0).setVisible(true);
      this.tweens.killTweensOf(this._cutsceneContainer);
      this.tweens.add({
        targets: this._cutsceneContainer,
        alpha: 1,
        duration: 380,
        ease: 'Sine.easeOut',
      });
    }
  }

  _hideCutscene() {
    this._currentCutsceneKey = null;
    if (!this._cutsceneContainer || !this._cutsceneContainer.visible) return;
    this.tweens.killTweensOf(this._cutsceneContainer);
    this.tweens.add({
      targets: this._cutsceneContainer,
      alpha: 0,
      duration: 280,
      ease: 'Sine.easeIn',
      onComplete: () => {
        this._cutsceneContainer?.setVisible(false);
      },
    });
  }

  getCounselingAutoContext() {
    return buildEpisode6CounselingContext(this.npcChoices);
  }

  onSceneUpdate() {
    if (this.finished) return;
    if (!this.npcSprite) return;

    if (!this.npcInDialogue) {
      const dist = Math.abs(this.player.x - this.npcSprite.x);
      const inRange = dist <= (this.npcConfig.interactionRadius || 150);
      this.npcPrompt.setVisible(inRange);
      if (inRange && Phaser.Input.Keyboard.JustDown(this.interactKey)) {
        this._tryTalkToNpc();
      }
    }

    if (this.npcInDialogue) return;

    const endZoneX = this.levelWidth - LEVEL_EDGE_MARGIN;

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
        episodeId: 6,
        isLastEpisode: true,
        choices,
      });
    }
  }
}
