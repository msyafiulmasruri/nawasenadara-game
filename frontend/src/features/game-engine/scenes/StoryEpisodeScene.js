import Phaser from 'phaser';
import BasePlayerScene from './BasePlayerScene';
import { LEVEL_EDGE_MARGIN } from '../config/gameConfig';
import { getEpisodeById } from '../config/episodes';
import { getNpcByEpisode } from '../config/npcs';
import {
  EPISODE4_DIALOGUE,
  buildEpisode4CounselingContext,
} from '../dialogue/episode4Dialogue';
import {
  EPISODE5_DIALOGUE,
  buildEpisode5CounselingContext,
} from '../dialogue/episode5Dialogue';
import {
  EPISODE6_DIALOGUE,
  buildEpisode6CounselingContext,
} from '../dialogue/episode6Dialogue';
import DialogueBox from '../ui/DialogueBox';
import ObjectiveBriefing from '../ui/ObjectiveBriefing';
import { getCharacterName } from '../utils/characterName';
import {
  getEpisodeChoices,
  hasTalkedToNpc,
  markNpcTalked,
} from '../utils/progressStore';
import { pxToWorld } from '../utils/visibleBounds';

const STORY_CONTENT = {
  4: {
    dialogue: EPISODE4_DIALOGUE,
    buildCounselingContext: buildEpisode4CounselingContext,
  },
  5: {
    dialogue: EPISODE5_DIALOGUE,
    buildCounselingContext: buildEpisode5CounselingContext,
  },
  6: {
    dialogue: EPISODE6_DIALOGUE,
    buildCounselingContext: buildEpisode6CounselingContext,
  },
};

// Scene bersama Episode 4-6. Background, NPC, naskah, dan konteks Kak
// Dara tetap berasal dari config sehingga aset dummy dapat diganti nanti
// tanpa menulis ulang mekanik episode.
export default class StoryEpisodeScene extends BasePlayerScene {
  constructor() {
    super('StoryEpisodeScene');
  }

  create(data) {
    super.create(data);

    this.uiInputLocked = true;
    this.player?.setVelocity(0, 0);
    this.player?.anims.stop();

    this.objectiveBriefing = new ObjectiveBriefing(this);
    this.objectiveBriefing.show({
      title: 'TUJUAN EPISODE',
      objectiveText:
        this.episodeData?.objective ||
        'Temui karakter pendamping, dengarkan situasinya, lalu pilih respons yang paling aman.',
      onContinue: () => {
        this.uiInputLocked = false;
      },
    });
  }

  createBackground(width, height) {
    this.finished = false;
    this.episodeData = getEpisodeById(this.episodeId);
    this.storyContent = STORY_CONTENT[this.episodeId];

    const backgroundLoaded =
      this.episodeData?.bgKey && this.textures.exists(this.episodeData.bgKey);

    if (backgroundLoaded) {
      // Rumusnya sengaja sama dengan Episode 1: gambar dipasang menurut
      // tinggi asli, tidak diregangkan, dan groundY tetap 600. Karena itu
      // telapak karakter berpijak konsisten di semua episode.
      const source = this.textures.get(this.episodeData.bgKey).getSourceImage();
      const scale = height / source.height;
      const naturalWidth = Math.round(source.width * scale);
      this.levelWidth = Math.max(naturalWidth, width);

      this.bg = this.add.image(
        naturalWidth / 2,
        height / 2,
        this.episodeData.bgKey,
      );
      this.bg.setDisplaySize(naturalWidth, height).setDepth(0);

      const extraWidth = this.levelWidth - naturalWidth;
      if (extraWidth > 0) {
        const extension = this.add.tileSprite(
          naturalWidth + extraWidth / 2,
          height / 2,
          extraWidth,
          height,
          this.episodeData.bgKey,
        );
        extension.setTileScale(scale, scale).setDepth(0);
      }
    } else {
      this._createEpisodeSixFallback(width, height);
    }

    this._createNpc();
  }

  _createEpisodeSixFallback(width, height) {
    this.levelWidth = Math.max(width, 1280);
    const baseColor = this.episodeData?.placeholderColor || 0x1a1a2e;

    this.add
      .rectangle(this.levelWidth / 2, height / 2, this.levelWidth, height, baseColor)
      .setDepth(0);
    this.add
      .rectangle(this.levelWidth / 2, height * 0.34, this.levelWidth, height * 0.38, 0x718aa0)
      .setDepth(0);
    this.add
      .rectangle(this.levelWidth / 2, height * 0.57, this.levelWidth, height * 0.22, 0xd7c7a7)
      .setDepth(0);
    this.add
      .rectangle(this.levelWidth / 2, height - 58, this.levelWidth, 116, 0x676272)
      .setDepth(0);

    const safePost = this.add
      .rectangle(this.levelWidth * 0.78, this.groundY, 165, 250, 0x3f5568)
      .setOrigin(0.5, 1)
      .setDepth(0);
    safePost.setStrokeStyle(5, 0xf4d88b, 0.9);
    this.add
      .text(this.levelWidth * 0.78, this.groundY - 205, 'POS AMAN', {
        fontFamily: '"Pixelify Sans", monospace',
        fontSize: `${pxToWorld(this, 18)}px`,
        color: '#fff5c2',
      })
      .setOrigin(0.5)
      .setDepth(1);
  }

  _createNpc() {
    const npcConfig = getNpcByEpisode(this.episodeId);
    if (!npcConfig || !this.storyContent) return;

    this.npcConfig = npcConfig;
    this.npcInDialogue = false;
    this.npcTalked = hasTalkedToNpc(this.episodeId);
    this.npcChoices = getEpisodeChoices(this.episodeId);

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
      this.npcSprite = this._createDummyCharacter(npcX, npcConfig);
      this._npcVisualHeight = 300;
    }

    // Gunakan hitbox terpisah yang benar-benar menutupi badan karakter.
    // Container dummy ber-origin di titik kaki, jadi setInteractive()
    // langsung pada container sebelumnya hanya mengenai separuh bawah.
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

    const promptY = this.groundY - this._npcVisualHeight - 24;
    this.npcPrompt = this.add
      .text(npcX, promptY, '[E] Ajak bicara (Klik)', {
        fontFamily: '"Pixelify Sans", monospace',
        fontSize: `${pxToWorld(this, 15)}px`,
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
      y: promptY - 7,
      duration: 550,
      yoyo: true,
      repeat: -1,
    });

    this.endBlockHint = this.add
      .text(
        this.levelWidth - LEVEL_EDGE_MARGIN,
        this.groundY - 56,
        `Temui ${npcConfig.name} dulu\nsebelum melanjutkan.`,
        {
          fontFamily: '"Pixelify Sans", monospace',
          fontSize: `${pxToWorld(this, 15)}px`,
          color: '#ffffff',
          align: 'center',
          backgroundColor: '#1a1a2ecc',
          padding: { x: 10, y: 6 },
        },
      )
      .setOrigin(0.5, 1)
      .setDepth(3)
      .setVisible(false);

    this.dialogueBox = new DialogueBox(this);
    this.interactKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.E,
    );
    this.setChatButtonVisible(Boolean(this.npcTalked));
    this._updateQuestGuide();
  }

  _createDummyCharacter(x, config) {
    const container = this.add.container(x, this.groundY).setDepth(2);
    const bodyColor = config.dummyColor || 0x64748b;
    const accentColor = config.dummyAccent || 0x293548;

    const shadow = this.add.ellipse(0, 0, 88, 20, 0x111827, 0.28);
    const leftLeg = this.add.rectangle(-18, -36, 25, 72, accentColor);
    const rightLeg = this.add.rectangle(18, -36, 25, 72, accentColor);
    const body = this.add.rectangle(0, -116, 92, 118, bodyColor);
    const neck = this.add.rectangle(0, -181, 24, 25, 0xd6a57f);
    const head = this.add.circle(0, -207, 37, 0xe4b58d);
    const hair = this.add.ellipse(0, -229, 78, 52, accentColor);
    const leftEye = this.add.circle(-13, -207, 3, 0x1f2937);
    const rightEye = this.add.circle(13, -207, 3, 0x1f2937);
    const badge = this.add
      .text(0, -270, `${config.name}\nKARAKTER DUMMY`, {
        fontFamily: '"Pixelify Sans", monospace',
        fontSize: `${pxToWorld(this, 13)}px`,
        color: '#ffffff',
        align: 'center',
        backgroundColor: '#111827cc',
        padding: { x: 7, y: 4 },
      })
      .setOrigin(0.5);

    container.add([
      shadow,
      leftLeg,
      rightLeg,
      body,
      neck,
      head,
      hair,
      leftEye,
      rightEye,
      badge,
    ]);
    container.setSize(112, 300);
    return container;
  }

  _updateQuestGuide() {
    if (this.npcTalked) {
      this.clearQuestGuide();
    } else {
      this.setQuestGuide(`○ ── Ajak bicara ${this.npcConfig.name} ──`);
    }
  }

  _tryTalkToNpc() {
    if (this.npcInDialogue || this.uiInputLocked) return;
    const distance = Math.abs(this.player.x - this.npcSprite.x);
    if (distance > this.npcConfig.interactionRadius) return;
    if (this.time.now < (this._npcInteractCooldownUntil || 0)) return;

    if (this.npcTalked) {
      this._startRevisitDialogue();
    } else {
      this._startStoryDialogue();
    }
  }

  _startRevisitDialogue() {
    const speakerId = this.npcConfig.id;
    this._openDialogue({
      npcId: speakerId,
      startNode: 'revisit',
      nodes: {
        revisit: {
          id: 'revisit',
          speaker: speakerId,
          text: 'Terima kasih sudah mau mendengar. Kita bisa melanjutkan dengan langkah yang lebih aman.',
          dynamic: true,
          situationHint:
            'Percakapan utama kami sudah selesai. Sampaikan sapaan ulang yang hangat dan singkat tanpa memberi pilihan baru atau mengubah kejadian.',
        },
      },
    });
  }

  _startStoryDialogue() {
    this._openDialogue(this.storyContent.dialogue, async (collectedChoices) => {
      this.npcTalked = true;
      this.npcChoices = collectedChoices;
      markNpcTalked(this.episodeId, collectedChoices);
      this.setChatButtonVisible(true);
      this._updateQuestGuide();

      const ui = window.__nawasenadaraUI;
      if (ui?.offerCounseling) {
        await ui.offerCounseling({
          episodeId: this.episodeId,
          npcName: this.npcConfig.name,
          autoContext: this.getCounselingAutoContext(),
        });
      }
    });
  }

  _openDialogue(dialogueTree, afterClose) {
    this.npcInDialogue = true;
    this.npcPrompt.setVisible(false);
    this.uiInputLocked = true;
    this.player?.setVelocityX(0);
    this.player?.anims.stop();

    const hasPortrait =
      this.npcConfig.portraitKey &&
      this.textures.exists(this.npcConfig.portraitKey);

    this.dialogueBox.open({
      dialogueTree,
      npcPortraitKey: hasPortrait ? this.npcConfig.portraitKey : null,
      npcName: this.npcConfig.name,
      speakerNames: { [this.npcConfig.id]: this.npcConfig.name },
      playerName: getCharacterName(),
      onClose: async (collectedChoices) => {
        try {
          await afterClose?.(collectedChoices);
        } finally {
          this.npcInDialogue = false;
          this.uiInputLocked = false;
          this._npcInteractCooldownUntil = this.time.now + 400;
        }
      },
    });
  }

  getCounselingAutoContext() {
    return this.storyContent?.buildCounselingContext(this.npcChoices) || null;
  }

  onSceneUpdate() {
    if (this.finished || !this.npcSprite) return;

    if (!this.npcInDialogue) {
      const distance = Math.abs(this.player.x - this.npcSprite.x);
      const inRange = distance <= this.npcConfig.interactionRadius;
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
        this.player.setVelocityX(0);
      }
      this.endBlockHint.setVisible(this.player.x >= endZoneX - 4);
      return;
    }

    this.endBlockHint.setVisible(false);
    if (this.player.x > endZoneX) {
      this.finished = true;
      this.finishEpisode({
        episodeId: this.episodeId,
        isLastEpisode: this.episodeId === 6,
        choices: this.npcChoices || [],
      });
    }
  }
}
