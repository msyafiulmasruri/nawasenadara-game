import Phaser from 'phaser';
import BasePlayerScene from './BasePlayerScene';
import { LEVEL_EDGE_MARGIN } from '../config/gameConfig';
import { getEpisodeById } from '../config/episodes';
import { getNpcByEpisode } from '../config/npcs';
import {
  EPISODE4_DIALOGUE,
  buildEpisode4RevisitDialogue,
  buildEpisode4CounselingContext,
} from '../dialogue/episode4Dialogue';
import DialogueBox from '../ui/DialogueBox';
import ObjectiveBriefing from '../ui/ObjectiveBriefing';
import { getCharacterName } from '../utils/characterName';
import { markNpcTalked, hasTalkedToNpc } from '../utils/progressStore';
import { pxToWorld } from '../utils/visibleBounds';

// Episode 4 — "Candaan yang Tidak Nyaman"
// Latar: Kantin sekolah saat jam istirahat.
// Karakter: Senior Kantin.
export default class Episode4Scene extends BasePlayerScene {
  constructor() {
    super('Episode4Scene');
    this._branchCutsceneImage = null;
  }

  create(data) {
    this.episodeId = 4;
    super.create(data);

    this.uiInputLocked = true;
    this.player?.setVelocity(0, 0);
    this.player?.anims.stop();

    const episodeData = getEpisodeById(4);
    this.objectiveBriefing = new ObjectiveBriefing(this);
    this.objectiveBriefing.show({
      title: 'TUJUAN EPISODE',
      objectiveText:
        episodeData?.objective ??
        'Kenali komentar fisik yang dibungkus sebagai candaan. Nyatakan batas secara jelas, jaga jarak aman, dan cari guru atau orang tepercaya bila perilaku berlanjut.',
      onContinue: () => {
        this.uiInputLocked = false;
      },
    });
  }

  createBackground(width, height) {
    this.finished = false;
    this.episodeData = getEpisodeById(4);

    const bgKey = 'episode4-bg';
    if (this.textures.exists(bgKey)) {
      const source = this.textures.get(bgKey).getSourceImage();
      const scale = height / source.height;
      const naturalWidth = Math.round(source.width * scale);
      this.levelWidth = Math.max(naturalWidth, width);

      this.bg = this.add.image(naturalWidth / 2, height / 2, bgKey);
      this.bg.setDisplaySize(naturalWidth, height);
      this.bg.setDepth(0);

      const extraWidth = this.levelWidth - naturalWidth;
      if (extraWidth > 0) {
        const extension = this.add.tileSprite(
          naturalWidth + extraWidth / 2,
          height / 2,
          extraWidth,
          height,
          bgKey,
        );
        extension.setTileScale(scale, scale).setDepth(0);
      }
    } else {
      this.levelWidth = Math.max(1600, width);
      this.bg = this.add.rectangle(
        this.levelWidth / 2,
        height / 2,
        this.levelWidth,
        height,
        0x3a2e2e,
      );
      this.bg.setDepth(0);
    }

    this._createNpc();
  }

  _createNpc() {
    const npcConfig = getNpcByEpisode(4);
    if (!npcConfig) return;

    this.npcConfig = npcConfig;
    this.npcInDialogue = false;
    // Pemain selalu bisa memulai dialog quest utama saat memasuki episode
    this.npcTalked = false;
    this.npcChoices = [];

    const npcX = this.levelWidth * npcConfig.xRatio;
    const hasPortrait =
      npcConfig.portraitKey && this.textures.exists(npcConfig.portraitKey);

    if (hasPortrait) {
      const source = this.textures.get(npcConfig.portraitKey).getSourceImage();
      const contentHeight = npcConfig.contentHeight || source.height;
      const bottomPadding = npcConfig.bottomPadding || 0;
      const scale = this.playerDisplayHeight / contentHeight;

      this.npcSprite = this.add
        .image(
          npcX,
          this.groundY + bottomPadding * scale,
          npcConfig.portraitKey,
        )
        .setOrigin(0.5, 1)
        .setScale(scale)
        .setDepth(2);
      this._npcVisualHeight = contentHeight * scale;
    } else {
      this.npcSprite = this.add
        .rectangle(npcX, this.groundY, 80, 200, 0xb55f54)
        .setOrigin(0.5, 1)
        .setDepth(2);
      this._npcVisualHeight = 200;
    }

    // Hit area interaksi
    this.npcHitArea = this.add
      .rectangle(
        npcX,
        this.groundY - this._npcVisualHeight / 2,
        Math.max(120, this.npcSprite.displayWidth || 0),
        this._npcVisualHeight,
        0xffffff,
        0.001,
      )
      .setDepth(3)
      .setInteractive({ useHandCursor: true });
    this.npcHitArea.on('pointerdown', () => this._tryTalkToNpc());
    this.registerLockable(this.npcHitArea);

    // Prompt teks interaksi di atas kepala NPC
    const promptFont = pxToWorld(this, 15);
    const promptY = this.groundY - this._npcVisualHeight - 24;
    this.npcPrompt = this.add
      .text(npcX, promptY, '[E] Ajak bicara (Klik)', {
        fontFamily: '"Pixelify Sans", monospace',
        fontSize: `${promptFont}px`,
        color: '#ffdd57',
        backgroundColor: '#1a1a2ecc',
        padding: { x: 10, y: 5 },
      })
      .setOrigin(0.5)
      .setDepth(4)
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

    // Hint di zona akhir jika belum menyelesaikan dialog
    const hintFont = pxToWorld(this, 15);
    this.endBlockHint = this.add
      .text(
        this.levelWidth - LEVEL_EDGE_MARGIN,
        this.groundY - 60,
        'Sepertinya ada yang perlu\ndiselesaikan dulu di kantin...',
        {
          fontFamily: '"Pixelify Sans", monospace',
          fontSize: `${hintFont}px`,
          color: '#ffffff',
          align: 'center',
          backgroundColor: '#1a1a2e',
          padding: { x: 10, y: 6 },
        },
      )
      .setOrigin(0.5, 1)
      .setDepth(2)
      .setVisible(false);

    this.dialogueBox = new DialogueBox(this);
    this.interactKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.E,
    );

    this.setChatButtonVisible(Boolean(this.npcTalked || hasTalkedToNpc(4)));
    this.updateQuestGuide();
  }

  updateQuestGuide() {
    if (this.npcTalked) {
      this.clearQuestGuide();
    } else {
      this.setQuestGuide(`○ ── Bicara dengan ${this.npcConfig?.name || 'Senior Kantin'} ──`);
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
      dialogueTree: buildEpisode4RevisitDialogue(),
      npcPortraitKey: this.npcConfig?.portraitKey,
      npcName: this.npcConfig?.name || 'Senior Kantin',
      speakerNames: { senior_kantin: this.npcConfig?.name || 'Senior Kantin' },
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
      dialogueTree: EPISODE4_DIALOGUE,
      npcPortraitKey: this.npcConfig?.portraitKey,
      npcName: this.npcConfig?.name || 'Senior Kantin',
      speakerNames: { senior_kantin: this.npcConfig?.name || 'Senior Kantin' },
      playerName: getCharacterName(),
      onNodeChange: (node) => {
        this._handleCutsceneNode(node);
      },
      onClose: async (collectedChoices) => {
        this._hideCutsceneBackground();
        this.npcTalked = true;
        this.npcChoices = collectedChoices;

        markNpcTalked(4, collectedChoices);
        this.setChatButtonVisible(true);
        this.updateQuestGuide();

        const ui = window.__nawasenadaraUI;
        if (ui?.offerCounseling) {
          await ui.offerCounseling({
            episodeId: 4,
            npcName: this.npcConfig?.name || 'Senior Kantin',
            autoContext: this.getCounselingAutoContext(),
          });
        }

        this.npcInDialogue = false;
        this.uiInputLocked = false;
        this._npcInteractCooldownUntil = this.time.now + 400;
      },
    });
  }

  _handleCutsceneNode(node) {
    const textureByNode = {
      cutsceneA1: 'ep4-canteen-choice-a',
      cutsceneB1: 'ep4-canteen-choice-b',
      cutsceneC1: 'ep4-canteen-choice-c',
    };

    const textureKey = textureByNode[node?.id];
    if (textureKey) {
      this._showCutsceneBackground(textureKey);
      return;
    }

    if (['n8a', 'n8b', 'n8c'].includes(node?.id)) {
      this._hideCutsceneBackground();
    }
  }

  _showCutsceneBackground(textureKey) {
    if (!this.textures.exists(textureKey)) return;
    const camera = this.cameras.main;

    if (this._branchCutsceneImage) {
      this.tweens.killTweensOf(this._branchCutsceneImage);
      this._branchCutsceneImage.destroy();
      this._branchCutsceneImage = null;
    }

    const image = this.add
      .image(camera.width / 2, camera.height / 2, textureKey)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDisplaySize(camera.width, camera.height)
      .setDepth(400)
      .setAlpha(0);

    this._branchCutsceneImage = image;

    this.tweens.add({
      targets: image,
      alpha: 1,
      duration: 350,
      ease: 'Sine.easeInOut',
    });
  }

  _hideCutsceneBackground() {
    const image = this._branchCutsceneImage;
    if (!image) return;

    this.tweens.killTweensOf(image);
    this.tweens.add({
      targets: image,
      alpha: 0,
      duration: 300,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        image.destroy();
        if (this._branchCutsceneImage === image) {
          this._branchCutsceneImage = null;
        }
      },
    });
  }

  getCounselingAutoContext() {
    return buildEpisode4CounselingContext(this.npcChoices);
  }

  onSceneUpdate() {
    if (this.finished || !this.npcSprite) return;

    if (!this.npcInDialogue) {
      const distance = Math.abs(this.player.x - this.npcSprite.x);
      const inRange = distance <= (this.npcConfig?.interactionRadius || 105);
      this.npcPrompt?.setVisible(inRange);
      if (inRange && Phaser.Input.Keyboard.JustDown(this.interactKey)) {
        this._tryTalkToNpc();
      }
    }

    if (this.npcInDialogue) return;

    const endZoneX = this.levelWidth - LEVEL_EDGE_MARGIN;
    if (!this.npcTalked) {
      if (this.player.x > endZoneX) {
        this.player.x = endZoneX;
        this.player.setVelocityX(0);
      }
      this.endBlockHint?.setVisible(this.player.x >= endZoneX - 4);
      return;
    }

    this.endBlockHint?.setVisible(false);
    if (this.player.x > endZoneX) {
      this.finished = true;
      this.finishEpisode({
        episodeId: 4,
        isLastEpisode: false,
        choices: this.npcChoices || [],
      });
    }
  }
}
