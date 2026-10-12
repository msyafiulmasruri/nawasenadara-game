import Phaser from 'phaser';
import BasePlayerScene from './BasePlayerScene';
import { LEVEL_EDGE_MARGIN } from '../config/gameConfig';
import { getNpcByEpisode } from '../config/npcs';
import {
  EPISODE5_DIALOGUE,
  buildEpisode5RevisitDialogue,
  buildEpisode5CounselingContext,
} from '../dialogue/episode5Dialogue';
import DialogueBox from '../ui/DialogueBox';
import ObjectiveBriefing from '../ui/ObjectiveBriefing';
import { getCharacterName } from '../utils/characterName';
import { hasTalkedToNpc, markNpcTalked } from '../utils/progressStore';
import { getVisibleBounds, pxToWorld } from '../utils/visibleBounds';
import { getEpisodeById } from '../config/episodes';

// ================================================================
// EPISODE 5 — "Ketika Sahabat Berubah"
// ================================================================
// Latar: Taman belakang sekolah di bawah pohon rindang & bangku kayu.
// Karakter: Kirana (sahabat dekat Dara yang belakangan menarik diri
//           setelah menjadi sasaran perundungan di sekolah).
// ================================================================

export default class Episode5Scene extends BasePlayerScene {
  constructor() {
    super('Episode5Scene');
  }

  init(data) {
    super.init(data);
    this.episodeId = 5;
    this._cutsceneContainer = null;
    this._cutsceneBg = null;
    this._cutsceneImg = null;
    this._cutsceneVignette = null;
    this._cutsceneTitle = null;
    this._currentCutsceneKey = null;
  }

  create(data) {
    this._cutsceneContainer = null;
    this._cutsceneBg = null;
    this._cutsceneImg = null;
    this._cutsceneVignette = null;
    this._cutsceneTitle = null;
    this._currentCutsceneKey = null;

    super.create(data);

    this.events.once('shutdown', () => {
      this._cutsceneContainer = null;
      this._cutsceneBg = null;
      this._cutsceneImg = null;
      this._cutsceneVignette = null;
      this._cutsceneTitle = null;
      this._currentCutsceneKey = null;
    });

    this.uiInputLocked = true;
    this.player?.setVelocity(0, 0);
    this.player?.anims.stop();

    // Tambahkan partikel lembut dedaunan melayang di taman sekolah
    this._createGardenAtmosphere();

    const episodeData = getEpisodeById(5);
    this.objectiveBriefing = new ObjectiveBriefing(this);
    this.objectiveBriefing.show({
      title: 'TUJUAN EPISODE',
      objectiveText:
        episodeData?.objective ??
        'Hampiri Kirana di bangku taman sekolah dan dengarkan perasaannya dengan penuh empati.',
      onContinue: () => {
        this.uiInputLocked = false;
      },
    });
  }

  /** Efek atmosfer taman: daun-daun kecil yang melayang lembut terbawa angin */
  _createGardenAtmosphere() {
    const { height } = this.scale;
    const leafGroup = this.add.group();

    for (let i = 0; i < 12; i++) {
      const startX = Phaser.Math.Between(0, this.levelWidth || 1600);
      const startY = Phaser.Math.Between(-40, height * 0.7);
      const leaf = this.add.rectangle(startX, startY, 4, 3, 0x85bb65, 0.65);
      leaf.setDepth(2);
      leafGroup.add(leaf);

      this.tweens.add({
        targets: leaf,
        x: `+=${Phaser.Math.Between(80, 160)}`,
        y: `+=${Phaser.Math.Between(100, 220)}`,
        angle: Phaser.Math.Between(0, 360),
        alpha: { from: 0.7, to: 0.1 },
        duration: Phaser.Math.Between(4500, 8000),
        repeat: -1,
        delay: Phaser.Math.Between(0, 4000),
        onRepeat: () => {
          leaf.x = Phaser.Math.Between(0, this.levelWidth || 1600);
          leaf.y = Phaser.Math.Between(-30, 40);
          leaf.alpha = 0.7;
        },
      });
    }
  }

  createBackground(width, height) {
    this.finished = false;

    // Memuat background taman sekolah
    const bgKey = this.textures.exists('episode-5-bg')
      ? 'episode-5-bg'
      : this.textures.exists('episode5-bg')
      ? 'episode5-bg'
      : null;

    if (bgKey) {
      const source = this.textures.get(bgKey).getSourceImage();
      const scale = height / source.height;
      const naturalWidth = Math.round(source.width * scale);

      // Pastikan levelWidth minimal selebar layar viewport agar tidak ada ruang kosong
      this.levelWidth = Math.max(naturalWidth, width);

      // Gambar background tunggal yang mengisi seluruh levelWidth x height tanpa tile berulang
      this.bg = this.add.image(this.levelWidth / 2, height / 2, bgKey);
      this.bg.setDisplaySize(this.levelWidth, height);
      this.bg.setDepth(0);
    } else {
      // Fallback placeholder jika tekstur belum tersedia
      this.levelWidth = Math.max(1600, width);
      this.bg = this.add.rectangle(this.levelWidth / 2, height / 2, this.levelWidth, height, 0x234238);
      this.bg.setDepth(0);
    }

    this._createNpc();
  }

  // --- Setup NPC Kirana --------------------------------------------
  _createNpc() {
    const npcConfig = getNpcByEpisode(5);
    if (!npcConfig) return;

    this.npcConfig = npcConfig;
    this.npcInDialogue = false;
    // Pemain selalu bisa memulai dialog quest dan memilih alur cerita saat bermain episode
    this.npcTalked = false;

    const npcX = this.levelWidth * npcConfig.xRatio;
    const spriteKey =
      npcConfig.worldSpriteKey || npcConfig.textureKey || npcConfig.portraitKey || 'kirana';
    const npcTexture = this.textures.exists(spriteKey) ? spriteKey : (this.textures.exists('kirana') ? 'kirana' : null);

    if (npcTexture) {
      // Menyesuaikan tinggi Kirana agar seimbang dan sama persis dengan tinggi karakter utama (Dara)
      const targetHeight = 224;
      const contentHeight = npcConfig.contentHeight || 853;
      const bottomPadding = npcConfig.bottomPadding ?? 88;
      const scale = targetHeight / contentHeight;

      this.npcSprite = this.add.image(
        npcX,
        this.groundY + bottomPadding * scale,
        npcTexture,
      );
      this.npcSprite.setOrigin(0.5, 1);
      this.npcSprite.setScale(scale);
      this._npcVisualHeight = contentHeight * scale;
    } else {
      this.npcSprite = this.add.rectangle(npcX, this.groundY, 80, 200, 0x2b4a3f);
      this.npcSprite.setOrigin(0.5, 1);
      this._npcVisualHeight = 200;
    }

    this.npcSprite.setDepth(1);
    this.npcSprite.setInteractive({ useHandCursor: true });
    this.npcSprite.on('pointerdown', () => this._tryTalkToNpc());
    this.registerLockable(this.npcSprite);

    // Prompt mengambang di atas kepala Kirana
    const promptFont = pxToWorld(this, 15);
    const promptY = this.groundY - this._npcVisualHeight - 26;
    this.npcPrompt = this.add
      .text(npcX, promptY, '[E] Sapa Kirana (Klik)', {
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

    // Peringatan di ujung level jika belum berbicara dengan Kirana
    const hintFont = pxToWorld(this, 15);
    this.endBlockHint = this.add
      .text(
        this.levelWidth - LEVEL_EDGE_MARGIN,
        this.groundY - 60,
        'Kamu melihat Kirana menyendiri di taman...\nCoba hampiri sahabatmu terlebih dahulu.',
        {
          fontFamily: '"Pixelify Sans", monospace',
          fontSize: `${hintFont}px`,
          color: '#ffffff',
          align: 'center',
          backgroundColor: '#1a1a2e',
          padding: { x: 12, y: 7 },
        },
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
      this.setQuestGuide(`○ ── Temui ${this.npcConfig?.name || 'Kirana'} di taman ──`);
    }
  }

  _tryTalkToNpc() {
    if (this.npcInDialogue) return;
    if (!this.npcPrompt?.visible) return;
    if (this.time.now < (this._npcInteractCooldownUntil || 0)) return;

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
      dialogueTree: buildEpisode5RevisitDialogue(),
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
            markNpcTalked(this.episodeId ?? 5, questChoices);
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
      dialogueTree: EPISODE5_DIALOGUE,
      npcPortraitKey: this.npcConfig.portraitKey,
      npcName: this.npcConfig.name,
      playerName: getCharacterName(),
      cardWidth: 710,
      onNodeChange: (node) => {
        this._updateCutsceneForNode(node);
      },
      onClose: async (collectedChoices) => {
        this._hideCutscene();
        this.npcTalked = true;
        this.npcChoices = collectedChoices;

        markNpcTalked(this.episodeId ?? 5, collectedChoices);
        this.setChatButtonVisible(true);
        this.updateQuestGuide();

        const ui = window.__nawasenadaraUI;
        if (ui?.offerCounseling) {
          await ui.offerCounseling({
            episodeId: this.episodeId ?? 5,
            npcName: this.npcConfig.name,
            autoContext: this.getCounselingAutoContext(),
          });
        }

        this.npcInDialogue = false;
        this.uiInputLocked = false;
        this._npcInteractCooldownUntil = this.time.now + 400;
      },
    });
  }

  /**
   * Menentukan tampilan cutscene visual penuh sesuai alur 5 babak Episode 5
   */
  _updateCutsceneForNode(node) {
    if (!node || !node.id) {
      this._hideCutscene();
      return;
    }

    const id = node.id;

    // Babak 1: Bangku Taman Sekolah (Obrolan santai, sapaan awal, & berbagi minuman)
    if (
      id === 'n1' ||
      id === 'n1_approach' ||
      id === 'n1b' ||
      id === 'n1c' ||
      id === 'n_icebreak' ||
      id.startsWith('n_icebreak_res') ||
      id === 'n2_shift' ||
      id === 'n2' ||
      id === 'n3' ||
      id === 'n4a' ||
      id === 'n4b' ||
      id === 'n4c'
    ) {
      this._showCutscene(
        'ep5-garden-bench-cg',
        '✦ Bangku Taman Sekolah — Obrolan Santai & Berbagi Minuman ✦'
      );
    }
    // Babak 2: Ancaman Notifikasi Ponsel & Tanda Kekerasan (Tetap duduk di bangku, Kirana panik pegang HP)
    else if (
      id === 'n2_threat_intro' ||
      id === 'n2_threat' ||
      id === 'n_threat' ||
      id.startsWith('n_threat_res') ||
      id === 'n3_memory_narr' ||
      id === 'n3_memory_intro' ||
      id === 'n5' ||
      id === 'n2_whisper_intro' ||
      id === 'n2_whisper' ||
      id === 'n_whisper'
    ) {
      this._showCutscene(
        'ep5-phone-threat-cg',
        '✦ Ancaman Notifikasi Ponsel — Ketakutan di Bawah Bayang-Bayang Kontrol ✦'
      );
    }
    // Babak 3: Flashback Memori Perpustakaan & Pengakuan Curahan Hati
    else if (
      id === 'n3_memory' ||
      id === 'n3_confession_narr' ||
      id === 'n3_confession' ||
      id === 'n_confession' ||
      id.startsWith('n_confession_res') ||
      id === 'n_friendship' ||
      id === 'n5_bridge' ||
      id === 'n5_bridge2' ||
      id === 'n6'
    ) {
      this._showCutscene(
        'ep5-library-cg',
        '✦ Flashback: Memori Hangat di Perpustakaan Sekolah Sebelum Badai Datang ✦'
      );
    }
    // Babak 4: Ruang Bimbingan Konseling / Ruang BK bersama Bu Ratih
    else if (
      id === 'n4_bell' ||
      id === 'n4_kirana_plea' ||
      id === 'n4_bk_intro' ||
      id === 'n_action' ||
      id.startsWith('n_action_res') ||
      id === 'n7a' ||
      id === 'n7b' ||
      id === 'n7c'
    ) {
      this._showCutscene(
        'ep5-bk-room-cg',
        '✦ Ruang Bimbingan Konseling (BK) — Ruang Aman Bersama Bu Ratih ✦'
      );
    }
    // Babak 5: Halte Bus Senja (Puncak kehangatan persahabatan di ujung sore)
    else if (
      id === 'n5_halte' ||
      id === 'n5_halte_narr' ||
      id === 'n5_outro' ||
      id === 'n5_halte_neutral' ||
      id === 'n5_halte_neutral_narr' ||
      id === 'n5_outro_neutral' ||
      id === 'n5_outro_confront' ||
      id === 'n5_outro_passive' ||
      id === 'n5_outro_sad' ||
      id === 'n8a' ||
      id === 'n8b' ||
      id === 'n8c'
    ) {
      this._showCutscene(
        'ep5-halte-cg',
        '✦ Menanti di Halte Sepulang Sekolah — Berdua di Ujung Senja ✦'
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

    // Pastikan container & komponennya masih aktif di scene ini dan belum di-destroy
    const needsNewContainer =
      !this._cutsceneContainer ||
      !this._cutsceneContainer.scene ||
      !this._cutsceneBg ||
      !this._cutsceneBg.scene ||
      !this._cutsceneBg.geom;

    if (needsNewContainer) {
      if (this._cutsceneContainer) {
        try {
          this._cutsceneContainer.destroy();
        } catch (_) {}
      }

      // Depth 100 agar berada di atas world gameplay (background, NPC, player),
      // namun di bawah DialogueBox (depth 500) & HUD jeda.
      this._cutsceneContainer = this.add.container(0, 0).setDepth(100).setScrollFactor(0);

      // Background hitam pekat penutup layar penuh
      this._cutsceneBg = this.add
        .rectangle(bounds.centerX, bounds.centerY, width * 1.5, height * 1.5, 0x000000, 1)
        .setOrigin(0.5);

      // Gambar CG cutscene layar penuh
      this._cutsceneImg = this.add.image(bounds.centerX, bounds.centerY, textureKey).setOrigin(0.5);

      // Lapisan suasana hangat/nostalgia flashback
      this._cutsceneVignette = this.add
        .rectangle(bounds.centerX, bounds.centerY, width * 1.5, height * 1.5, 0x241208, 0.16)
        .setOrigin(0.5);

      // Banner judul sinematik di bagian atas layar
      this._cutsceneTitle = this.add
        .text(bounds.centerX, bounds.top + pxToWorld(this, 22), '', {
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
    if (this._cutsceneBg?.setPosition) {
      this._cutsceneBg.setPosition(bounds.centerX, bounds.centerY);
      if (this._cutsceneBg.geom) {
        this._cutsceneBg.setSize(bounds.width * 1.3, bounds.height * 1.3);
      }
    }

    if (this._cutsceneVignette?.setPosition) {
      this._cutsceneVignette.setPosition(bounds.centerX, bounds.centerY);
      if (this._cutsceneVignette.geom) {
        this._cutsceneVignette.setSize(bounds.width * 1.3, bounds.height * 1.3);
      }
    }

    if (this._cutsceneTitle) {
      this._cutsceneTitle.setText(titleText || '');
      this._cutsceneTitle.setFontSize(`${pxToWorld(this, 14)}px`);
      this._cutsceneTitle.setPosition(bounds.centerX, bounds.top + pxToWorld(this, 22));
    }

    // Jika adegan yang diminta sama persis dengan yang sedang aktif, pertahankan tampilan tanpa flicker
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
          this._cutsceneImg.setPosition(bounds.centerX, bounds.centerY);
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
      this._cutsceneImg.setPosition(bounds.centerX, bounds.centerY);
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
    if (!this._cutsceneContainer || !this._cutsceneContainer.scene || !this._cutsceneContainer.visible) return;
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
    return buildEpisode5CounselingContext(this.npcChoices);
  }

  onSceneUpdate() {
    if (this.finished) return;
    if (!this.npcSprite) return;

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
        episodeId: 5,
        isLastEpisode: false,
        choices,
      });
    }
  }
}
