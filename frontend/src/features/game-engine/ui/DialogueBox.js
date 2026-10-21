import Phaser from 'phaser';
import { getVisibleBounds, pxToWorld, isCompactLandscape } from '../utils/visibleBounds';
import speechVoiceManager from '../audio/SpeechVoiceManager';

// Dialog box gaya "Harvest Moon: Back to Nature" — label nama
// pembicara menempel di atas kotak teks, dan (kalau node dialog itu
// punya percabangan) daftar pilihan jawaban tampil di bagian paling
// bawah kartu itu.
//
// Murni Phaser (bukan overlay React) — sama seperti pause menu /
// settings di BasePlayerScene — supaya gampang diposisikan RELATIF ke
// NPC yang ada di dunia game & tidak perlu sinkronisasi tambahan
// dengan lapisan DOM.
//
// Pemakaian (lihat Episode1Scene.js):
//   this.dialogueBox = new DialogueBox(this);
//   this.dialogueBox.open({
//     dialogueTree: EPISODE1_DIALOGUE,
//     npcPortraitKey: 'npc-rafi-portrait',
//     npcName: 'Rafi',
//     playerName: 'Sekar',
//     onClose: (collectedChoices) => { ... lanjutkan quest ... },
//   });
//
// ================================================================
// NODE INPUT GUARD
// ================================================================
//
// Tap/klik/key yang sama yang digunakan untuk membuka dialog bisa
// "bocor" ke listener node pertama. Karena itu setelah sebuah node
// selesai tampil, input ditahan sebentar.
//
// Untuk node dialog AI, timer ini BARU dimulai setelah respons AI
// selesai muncul. Jadi pemain tidak dapat melewati dialog ketika
// masih menunggu GenAI.
//
const NODE_INPUT_GUARD_MS = 260;

// Maksimum waktu menunggu dialog NPC dari GenAI.
// Kalau lebih dari ini, DialogueBox memakai dialog statis sebagai
// fallback agar game tetap dapat berjalan.
const DYNAMIC_DIALOGUE_TIMEOUT_MS = 10000;

export default class DialogueBox {
  constructor(scene) {
    this.scene = scene;

    this.isOpen = false;

    this._collectedChoices = [];
    this._container = null;
    this._choiceObjects = [];

    this._advanceKeyHandler = null;
    this._advancePointerHandler = null;
    this._choiceKeyHandler = null;

    this._isUiHidden = false;
    this._hiddenHint = null;
    this._onKeyH = null;
    this._restorePointerHandler = null;

    this._nodeReadyAt = 0;

    this._hideTextBoxBackground = false;

    // ============================================================
    // DYNAMIC NPC DIALOGUE
    // ============================================================

    // Timer Phaser untuk animasi:
    //
    // .
    // ..
    // ...
    //
    this._loadingTimer = null;

    // Sequence request untuk mencegah response AI node lama
    // menimpa dialog node baru.
    //
    // Contoh:
    //
    // request node A ---- lambat --------> selesai
    //
    //         user sudah pindah node B
    //
    // Response node A tidak boleh mengganti teks node B.
    //
    this._dynamicRequestSeq = 0;
    this._onDynamicLine = null;
  }

  setTextBoxBackgroundVisible(visible) {
  this._hideTextBoxBackground = !visible;

  this._textBoxBg?.setVisible(visible);
  }

  // ==============================================================
  // OPEN
  // ==============================================================

  open({
    dialogueTree,
    npcPortraitKey,
    npcName,
    speakerNames,
    playerName,
    cardWidth,
    onClose,
    onNodeChange,
    onDynamicLine,
    onChoiceSelected,
  }) {
    if (this.isOpen) return;

    this.isOpen = true;

    this._dialogueTree = dialogueTree;
    this._npcPortraitKey = npcPortraitKey;
    this._npcName = npcName;
    // Opsional: satu episode dapat memiliki lebih dari satu pembicara.
    // Fallback tetap npcName agar dialog lama tidak perlu diubah.
    this._speakerNames = speakerNames || {};
    this._playerName = playerName || 'Kamu';
    this._customCardWidth = cardWidth || null;
    this._onClose = onClose;
    this._onNodeChange = onNodeChange;
    this._onDynamicLine = onDynamicLine;
    this._onChoiceSelected = onChoiceSelected;

    this._collectedChoices = [];
    this._lastChoiceLabel = null;
    this._lastCharacterSpeaker = null;
    this._lastCharacterText = null;
    this._dynamicCache = new Map();
    this._resolvedDynamicTexts = new Map();
    this._lastBounds = null;
    if (this._resizeTimer) {
      clearTimeout(this._resizeTimer);
      this._resizeTimer = null;
    }

    this._buildStaticFrame();

    this._prefetchInitialDynamicNodes();

    this._renderNode(dialogueTree.startNode);

    this._isUiHidden = false;
    this._onKeyH = (event) => {
      if (!this.isOpen) return;
      if (event.code === 'KeyH' || event.key === 'h' || event.key === 'H') {
        this._toggleHideUi();
      }
    };
    this.scene.input.keyboard.on('keydown', this._onKeyH);

    this.scene.scale.on('resize', this._onResize, this);

    this._shutdownHandler = () => this.close(true);

    this.scene.events.once('shutdown', this._shutdownHandler);
  }

  // ==============================================================
  // CLOSE
  // ==============================================================

  close(silent = false) {
    if (!this.isOpen) return;

    this.isOpen = false;
    this._customCardWidth = null;
    this._lastCharacterSpeaker = null;
    this._lastCharacterText = null;
    this._dynamicCache?.clear();
    this._resolvedDynamicTexts?.clear();
    this._lastBounds = null;
    if (this._resizeTimer) {
      clearTimeout(this._resizeTimer);
      this._resizeTimer = null;
    }

    // Hentikan loading GenAI kalau masih aktif.
    this._stopLoadingDots();

    // Invalidasi request async yang masih berjalan.
    // Response yang datang setelah dialog ditutup otomatis dianggap
    // response lama dan tidak akan dipakai.
    this._dynamicRequestSeq += 1;

    this.scene.scale.off('resize', this._onResize, this);

    if (this._shutdownHandler) {
      this.scene.events.off('shutdown', this._shutdownHandler);

      this._shutdownHandler = null;
    }

    this._cleanupHideUi();
    this._destroyChoiceObjects();
    this._detachAdvanceInput();

    this._container?.destroy();

    this._container = null;

    const choices = this._collectedChoices;

    if (!silent) {
      this._onClose?.(choices);
    }
  }

  // ==============================================================
  // INPUT GUARD
  // ==============================================================

  _isInputReady() {
    return this.isOpen && !this._isUiHidden && this.scene.time.now >= this._nodeReadyAt;
  }

  // ==============================================================
  // STATIC FRAME
  // ==============================================================

  _buildStaticFrame() {
    const scene = this.scene;
    const bounds = getVisibleBounds(scene);
    const compact = isCompactLandscape(scene);

    const baseCardWidth = this._customCardWidth || 640;
    const cardWidth = Math.min(bounds.width * 0.92, baseCardWidth);

    const cardX = bounds.centerX;

    // Pada compact mobile landscape (Pixel 9, iPhone landscape): geser lebih dekat ke atas agar ruang di bawah untuk pilihan & Kak Dara leluasa
    const cardTop = compact
      ? bounds.top + 8
      : bounds.top + bounds.height * 0.08;

    this._container = scene.add
      .container(0, 0)
      .setDepth(500)
      .setScrollFactor(0);

    // ============================================================
    // NAME TAG
    // ============================================================

    const nameFont = compact ? 17 : pxToWorld(scene, 21);
    const nameTagH = nameFont + (compact ? 8 : 14);

    this._nameTagBg = scene.add
      .rectangle(
        cardX - cardWidth / 2 + 4,
        cardTop,
        0,
        nameTagH,
        0x243b55,
        0.95,
      )
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0xffdd57, 0.85);

    this._container.add(this._nameTagBg);

    this._nameTag = scene.add
      .text(cardX - cardWidth / 2 + (compact ? 12 : 16), cardTop + (compact ? 4 : 7), this._npcName, {
        fontFamily: '"Jersey 15", monospace',
        fontSize: `${nameFont}px`,
        color: '#ffdd57',
      })
      .setOrigin(0, 0);

    this._container.add(this._nameTag);

    // ============================================================
    // HIDE / SHOW UI BUTTON (Untuk menikmati CG cutscene layar penuh)
    // ============================================================
    const hideBtnFont = compact ? 12 : pxToWorld(scene, 14);
    const hideBtnRight = cardX + cardWidth / 2 - 4;
    const hideBtnY = cardTop + nameTagH / 2;

    this._hideBtnText = scene.add
      .text(hideBtnRight - 10, hideBtnY, 'Sembunyikan UI [H]', {
        fontFamily: '"Pixelify Sans", monospace',
        fontSize: `${hideBtnFont}px`,
        color: '#93c5fd',
        align: 'right',
      })
      .setOrigin(1, 0.5);

    const btnWidth = Math.round(this._hideBtnText.width + (compact ? 14 : 20));
    const btnHeight = nameTagH;

    this._hideBtnBg = scene.add
      .rectangle(
        hideBtnRight - btnWidth / 2,
        hideBtnY,
        btnWidth,
        btnHeight,
        0x1e293b,
        0.9,
      )
      .setStrokeStyle(1.5, 0x38bdf8, 0.7)
      .setInteractive({ useHandCursor: true });

    this._hideBtnBg.on('pointerover', () => this._hideBtnBg.setFillStyle(0x334155, 0.95));
    this._hideBtnBg.on('pointerout', () => this._hideBtnBg.setFillStyle(0x1e293b, 0.9));
    this._hideBtnBg.on('pointerdown', (pointer) => {
      pointer?.event?.stopPropagation?.();
      this._toggleHideUi();
    });
    this._hideBtnText.setInteractive({ useHandCursor: true });
    this._hideBtnText.on('pointerdown', (pointer) => {
      pointer?.event?.stopPropagation?.();
      this._toggleHideUi();
    });

    this._container.add(this._hideBtnBg);
    this._container.add(this._hideBtnText);

    // ============================================================
    // DIALOGUE BOX
    // ============================================================

    const textBoxTop = cardTop + nameTagH + (compact ? 3 : 4);
    const defaultBoxHeight = compact ? 84 : Math.min(bounds.height * 0.22, 140);

    this._textBoxTop = textBoxTop;
    this._textBoxHeight = defaultBoxHeight;
    this._cardTop = cardTop;
    this._nameTagH = nameTagH;

    this._cardX = cardX;
    this._cardWidth = cardWidth;

    this._textBoxBg = scene.add
      .rectangle(
        cardX,
        textBoxTop + defaultBoxHeight / 2,
        cardWidth,
        defaultBoxHeight,
        0x0f0f22,
        0.95,
      )
      .setStrokeStyle(2, 0xffdd57, 0.6);

    this._container.add(this._textBoxBg);

    if (this._hideTextBoxBackground) {
      this._textBoxBg.setVisible(false);
    }

    // ============================================================
    // DIALOGUE TEXT
    // ============================================================

    const dialogueFont = compact ? 18 : pxToWorld(scene, 20);

    this._dialogueText = scene.add
      .text(cardX - cardWidth / 2 + 16, textBoxTop + (compact ? 10 : 14), '', {
        fontFamily: '"Pixelify Sans", monospace',
        fontSize: `${dialogueFont}px`,
        color: '#ffffff',
        wordWrap: {
          width: cardWidth - 32,
        },
        lineSpacing: compact ? 3 : 5,
      })
      .setOrigin(0, 0);

    this._container.add(this._dialogueText);

    // ============================================================
    // ADVANCE HINT
    // ============================================================

    const hintFont = compact ? 12 : pxToWorld(scene, 14);

    this._advanceHint = scene.add
      .text(
        cardX + cardWidth / 2 - 14,
        textBoxTop + defaultBoxHeight - (compact ? 6 : 10),
        '[E] / Spasi / Ketuk layar ▸',
        {
          fontFamily: '"Pixelify Sans", monospace',
          fontSize: `${hintFont}px`,
          color: '#cbd5e1',
        },
      )
      .setOrigin(1, 1);

    this._container.add(this._advanceHint);
    this._advanceHint.setVisible(false);

    // Posisi awal pilihan jawaban.
    this._choicesStartY = textBoxTop + defaultBoxHeight + (compact ? 6 : 12);

    this._lastBounds = {
      left: bounds.left,
      top: bounds.top,
      width: bounds.width,
      height: bounds.height,
    };

    this._container.setScrollFactor(0, 0, true);
  }

  // Menyesuaikan ukuran kotak dialog secara dinamis sesuai teks agar teks tidak offside
  // dan advance hint [E] / Spasi tidak pernah menabrak kalimat dialog.
  _updateTextBoxDimensions({ hasChoices = false } = {}) {
    if (!this._dialogueText || !this._textBoxBg) return;
    const scene = this.scene;
    const compact = isCompactLandscape(scene);
    const bounds = getVisibleBounds(scene);

    const padTop = compact ? 10 : 14;
    // Jika ada choices, kotak dialog tidak butuh advance hint sehingga padBottom lebih ringkas
    const padBottom = hasChoices
      ? (compact ? 10 : 14)
      : (compact ? 24 : 32);

    const textHeight = this._dialogueText.height;
    const minHeight = hasChoices
      ? (compact ? 62 : 90)
      : (compact ? 84 : Math.min(bounds.height * 0.22, 140));

    const neededHeight = Math.ceil(textHeight + padTop + padBottom);
    const finalHeight = Math.max(minHeight, neededHeight);

    this._textBoxHeight = finalHeight;
    this._textBoxBg.setSize(this._cardWidth, finalHeight);
    this._textBoxBg.setY(this._textBoxTop + finalHeight / 2);

    if (this._advanceHint) {
      this._advanceHint.setY(this._textBoxTop + finalHeight - (compact ? 6 : 10));
    }

    this._choicesStartY = this._textBoxTop + finalHeight + (compact ? 6 : 12);
  }

  // ==============================================================
  // TEXT PLACEHOLDER
  // ==============================================================

  _substitute(text = '') {
    return String(text).replace(/\{PLAYER_NAME\}/g, this._playerName);
  }

  _formatSpeechText(text = '', node = null) {
    const substituted = this._substitute(text);
    if (!substituted) return '';
    // Jika narasi, tampilkan apa adanya tanpa tanda kutip
    if (node?.speaker === 'narration') {
      return substituted;
    }
    // Jika dialog/obrolan karakter, pastikan selalu dibungkus tanda kutip
    const trimmed = substituted.trim();
    if (
      (!trimmed.startsWith('"') && !trimmed.startsWith('“') && !trimmed.startsWith("'")) ||
      (!trimmed.endsWith('"') && !trimmed.endsWith('”') && !trimmed.endsWith("'"))
    ) {
      const clean = trimmed.replace(/^["'“]|["'”]$/g, '').trim();
      return `"${clean}"`;
    }
    return substituted;
  }

  // ==============================================================
  // LOADING ANIMATION
  // ==============================================================

  _startLoadingDots() {
    this._stopLoadingDots();

    if (!this._dialogueText) {
      return;
    }

    let dotCount = 1;

    this._dialogueText.setText('.');
    this._updateTextBoxDimensions({ hasChoices: false });

    this._loadingTimer = this.scene.time.addEvent({
      delay: 350,

      loop: true,

      callback: () => {
        if (!this.isOpen || !this._dialogueText) {
          return;
        }

        dotCount = (dotCount % 3) + 1;

        this._dialogueText.setText('.'.repeat(dotCount));
      },
    });
  }

  _stopLoadingDots() {
    if (!this._loadingTimer) {
      return;
    }

    this._loadingTimer.remove(false);

    this._loadingTimer = null;
  }

  // ==============================================================
  // ACTIVATE NODE INTERACTION
  // ==============================================================

  _activateNodeInteraction(node, guidePrompt = null, { isResize = false } = {}) {
    if (!this.isOpen) return;

    // Beri jeda kecil SETELAH teks sudah siap.
    // Saat rebuild akibat resize/keluar fullscreen, jangan kunci input lagi
    // supaya tombol E / ketuk layar / pilihan jawaban langsung merespons.
    this._nodeReadyAt = isResize ? 0 : this.scene.time.now + NODE_INPUT_GUARD_MS;

    // ============================================================
    // NODE DENGAN CHOICES
    // ============================================================

    if (Array.isArray(node.choices) && node.choices.length > 0) {
      this._advanceHint.setVisible(false);

      this._renderChoices(node.choices, guidePrompt, { isResize });

      return;
    }

    // ============================================================
    // NODE LINEAR
    // ============================================================

    this._advanceHint.setVisible(true);

    this._attachAdvanceInput(() => {
      this._goToNext(node.next);
    });
  }

  // ==============================================================
  // RENDER NODE
  // ==============================================================

  _resolveSpeakerName(node) {
    if (node?.speaker === 'player' || node?.speaker === 'dara') {
      return this._playerName;
    }
    return this._speakerNames?.[node?.speaker] || this._npcName;
  }

  _renderNode(nodeId, { isResize = false } = {}) {
    const node = this._dialogueTree.nodes[nodeId];

    if (!node) {
      this.close();
      return;
    }

    // ============================================================
    // REQUEST SEQUENCE
    // ============================================================
    const requestSeq = ++this._dynamicRequestSeq;

    this._currentNode = node;
    if (!isResize) {
      this._onNodeChange?.(node);
    }

    // Hentikan loading node sebelumnya.
    this._stopLoadingDots();

    // Hapus interaction node sebelumnya.
    this._destroyChoiceObjects();
    this._detachAdvanceInput();

    // Selama proses render/loading, pemain tidak boleh lanjut.
    this._advanceHint.setVisible(false);

    // Nilai sangat besar sementara agar input tidak lolos.
    this._nodeReadyAt = Number.POSITIVE_INFINITY;

    // ============================================================
    // SPEAKER NAME & GUIDE PANEL
    // ============================================================

    const isNarration = node.speaker === 'narration';
    const isGuide = node.isGuide || node.speaker === 'dara_guide';
    const hasChoices = Array.isArray(node.choices) && node.choices.length > 0;
    const compact = isCompactLandscape(this.scene);
    const nameTagH = (compact ? 17 : pxToWorld(this.scene, 21)) + (compact ? 8 : 14);

    if (compact) {
      this._dialogueText.setFontSize(hasChoices ? 16 : 18);
      this._dialogueText.setLineSpacing(hasChoices ? 2 : 3);
    } else {
      this._dialogueText.setFontSize(pxToWorld(this.scene, 20));
      this._dialogueText.setLineSpacing(5);
    }

    // Jika node memiliki pilihan dan speaker adalah narration (hanya berisi pertanyaan instruksional
    // seperti "Gimana caramu merespons omongan Rafi?"), kita pisahkan dari obrolan:
    // Box obrolan karakter tetap menampilkan ucapan karakter terakhir,
    // sementara pertanyaan dipindahkan ke panel Panduan Kak Dara di bawah pilihan jawaban.
    const isInstructionChoiceNode = hasChoices && isNarration && Boolean(this._lastCharacterText);

    if (isInstructionChoiceNode) {
      this._nameTag.setVisible(true);
      this._nameTagBg.setVisible(true);
      this._nameTag.setText(this._lastCharacterSpeaker || this._npcName).setColor('#ffdd57');
      this._nameTagBg.setFillStyle(0x243b55, 0.95).setStrokeStyle(2, 0xffdd57, 0.85);
      this._nameTagBg.setSize(
        this._nameTag.width + (compact ? 16 : 24),
        nameTagH,
      );
      this._textBoxBg?.setStrokeStyle(2, 0xffdd57, 0.6);
      this._dialogueText.setText(this._lastCharacterText);
      this._updateTextBoxDimensions({ hasChoices: true });

      const prompt = this._substitute(node.text);
      this._activateNodeInteraction(node, prompt, { isResize });
      return;
    }

    if (isGuide) {
      // Guide Panel terpisah: biarkan kotak dialog atas menampilkan ucapan karakter terakhir
      // (atau judul situasi), sementara panduan Kak Dara muncul dengan motion di bagian bawah!
      this._nameTag.setVisible(true);
      this._nameTagBg.setVisible(true);
      this._nameTag.setText(this._lastCharacterSpeaker || this._npcName).setColor('#ffdd57');
      this._nameTagBg.setFillStyle(0x243b55, 0.95).setStrokeStyle(2, 0xffdd57, 0.85);
      this._nameTagBg.setSize(
        this._nameTag.width + (compact ? 16 : 24),
        nameTagH,
      );
      this._textBoxBg?.setStrokeStyle(2, 0xffdd57, 0.6);
      if (this._lastCharacterText) {
        this._dialogueText.setText(this._lastCharacterText);
      } else {
        this._dialogueText.setText(this._substitute(node.text));
      }
      this._updateTextBoxDimensions({ hasChoices: false });

      const bounds = getVisibleBounds(this.scene);
      const bottomGuideY = bounds.bottom - (compact ? 70 : pxToWorld(this.scene, 118));
      this._renderGuideMotionBanner(this._substitute(node.text), bottomGuideY, { isResize });
      this._activateNodeInteraction(node, this._substitute(node.text), { isResize });
      return;
    }

    // Obrolan Karakter Normal
    const speakerName = isNarration ? 'Narasi' : this._resolveSpeakerName(node);
    this._nameTag.setVisible(true);
    this._nameTagBg.setVisible(true);
    this._nameTag.setText(speakerName).setColor(isNarration ? '#94a3b8' : '#ffdd57');
    this._nameTagBg.setFillStyle(isNarration ? 0x1e293b : 0x243b55, 0.95).setStrokeStyle(2, isNarration ? 0x64748b : 0xffdd57, 0.85);
    this._nameTagBg.setSize(
      this._nameTag.width + (compact ? 16 : 24),
      nameTagH,
    );
    this._textBoxBg?.setStrokeStyle(2, 0xffdd57, 0.6);

    // ============================================================
    // DYNAMIC NPC NODE
    // ============================================================

    if (node.dynamic) {
      const alreadyResolved = this._resolvedDynamicTexts?.get(node.id);
      if (alreadyResolved) {
        this._dialogueText.setText(alreadyResolved);
        this._updateTextBoxDimensions({ hasChoices });
        if (!isNarration) {
          this._lastCharacterSpeaker = this._resolveSpeakerName(node);
          this._lastCharacterText = alreadyResolved;
        }
        const defaultPrompt = hasChoices
          ? (node.guidePrompt || 'Pilih salah satu jawaban di atas yang paling sesuai dengan langkahmu.')
          : null;
        this._activateNodeInteraction(node, defaultPrompt, { isResize });
        return;
      }
      this._startLoadingDots();
      void this._requestDynamicLine(node, requestSeq);
      return;
    }

    // ============================================================
    // STATIC NODE
    // ============================================================

    const staticFormatted = this._formatSpeechText(node.text, node);
    this._dialogueText.setText(staticFormatted);
    this._updateTextBoxDimensions({ hasChoices });
    if (!isNarration) {
      this._lastCharacterSpeaker = this._resolveSpeakerName(node);
      this._lastCharacterText = staticFormatted;
    }

    // Setelah teks siap baru tombol lanjut / choices aktif.
    const defaultPrompt = hasChoices
      ? (node.guidePrompt || 'Pilih salah satu jawaban di atas yang paling sesuai dengan langkahmu.')
      : null;
    this._activateNodeInteraction(node, defaultPrompt, { isResize });
  }

  // ==============================================================
  // PREFETCH DYNAMIC NPC LINES (Supaya teks dinamis instan)
  // ==============================================================

  _getDynamicCacheKey(nodeId, choiceLabel = '') {
    return `${nodeId}::${choiceLabel || ''}`;
  }

  _prefetchDynamicNode(node, playerChoiceLabel = null) {
    if (!node || !node.dynamic || !this._dynamicCache) return;
    const nlp = typeof window !== 'undefined' ? window.__nawasenadaraNlp : null;
    if (!nlp?.generateNpcLine) return;

    const key = this._getDynamicCacheKey(node.id, playerChoiceLabel);
    if (this._dynamicCache.has(key)) return;

    const fallbackLine = this._formatSpeechText(node.text, node);
    const promise = nlp
      .generateNpcLine({
        npcName: this._resolveSpeakerName(node),
        plottedLine: fallbackLine,
        situation: node.situationHint || null,
        playerChoiceLabel: playerChoiceLabel || null,
      })
      .catch(() => ({ line: fallbackLine }));

    this._dynamicCache.set(key, promise);
  }

  _prefetchInitialDynamicNodes() {
    const nodes = this._dialogueTree?.nodes;
    if (!nodes) return;
    let curId = this._dialogueTree.startNode;
    const visited = new Set();
    while (curId && !visited.has(curId)) {
      visited.add(curId);
      const n = nodes[curId];
      if (!n) break;
      if (n.dynamic) {
        this._prefetchDynamicNode(n, null);
      }
      if (Array.isArray(n.choices) && n.choices.length > 0) break;
      curId = n.next;
    }
  }

  _prefetchChoiceDynamicNodes(choices = []) {
    const nodes = this._dialogueTree?.nodes;
    if (!nodes || !Array.isArray(choices)) return;

    choices.forEach((choice) => {
      const responseText = this._substitute(choice.chatReply || choice.label);
      let nextId = choice.next;
      let hops = 0;
      while (nextId && hops < 3) {
        const nextNode = nodes[nextId];
        if (!nextNode) break;
        if (nextNode.dynamic) {
          this._prefetchDynamicNode(nextNode, responseText);
          break;
        }
        if (Array.isArray(nextNode.choices) && nextNode.choices.length > 0) break;
        nextId = nextNode.next;
        hops += 1;
      }
    });
  }

  // ==============================================================
  // REQUEST DYNAMIC NPC LINE
  // ==============================================================

  async _requestDynamicLine(node, requestSeq) {
    const nlp = typeof window !== 'undefined' ? window.__nawasenadaraNlp : null;

    const requestedNodeId = node.id;

    // Dialog asli tetap menjadi fallback.
    const fallbackLine = this._formatSpeechText(node.text, node);

    // ============================================================
    // NLP BRIDGE TIDAK TERSEDIA
    // ============================================================

    if (!nlp?.generateNpcLine) {
      if (!this._isDynamicRequestCurrent(requestedNodeId, requestSeq)) {
        return;
      }

      this._stopLoadingDots();

      this._dialogueText.setText(fallbackLine);
      if (node.speaker !== 'narration') {
        this._lastCharacterSpeaker = this._resolveSpeakerName(node);
        this._lastCharacterText = fallbackLine;
      }

      this._activateNodeInteraction(node);

      return;
    }

    let timeoutId = null;

    try {
      const cacheKey = this._getDynamicCacheKey(node.id, this._lastChoiceLabel);
      const fallbackCacheKey = this._getDynamicCacheKey(node.id, null);
      const cachedPromise =
        this._dynamicCache?.get(cacheKey) ||
        this._dynamicCache?.get(fallbackCacheKey) ||
        null;

      const aiRequest =
        cachedPromise ||
        nlp.generateNpcLine({
          npcName: this._resolveSpeakerName(node),
          plottedLine: fallbackLine,
          situation: node.situationHint || null,
          playerChoiceLabel: this._lastChoiceLabel || null,
        });

      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(
          () => {
            reject(
              new Error(
                `NPC dialogue generation timeout setelah ${
                  DYNAMIC_DIALOGUE_TIMEOUT_MS / 1000
                } detik`,
              ),
            );
          },
          DYNAMIC_DIALOGUE_TIMEOUT_MS,
        );
      });

      const result = await Promise.race([aiRequest, timeoutPromise]);

      if (!this._isDynamicRequestCurrent(requestedNodeId, requestSeq)) {
        return;
      }

      this._stopLoadingDots();

      const generatedLine =
        typeof result === 'string'
          ? result.trim()
          : result?.line?.trim();

      const finalLine = generatedLine || fallbackLine;
      const formattedFinalLine = this._formatSpeechText(finalLine, node);

      this._resolvedDynamicTexts?.set(node.id, formattedFinalLine);
      this._dialogueText.setText(formattedFinalLine);
      this._updateTextBoxDimensions({
        hasChoices: Array.isArray(node.choices) && node.choices.length > 0,
      });
      if (node.speaker !== 'narration') {
        this._lastCharacterSpeaker = this._resolveSpeakerName(node);
        this._lastCharacterText = formattedFinalLine;
      }

      // Kirim hasil dialog ke scene
      this._onDynamicLine?.({
        node,
        text: formattedFinalLine,
      });

      const defaultPrompt = (Array.isArray(node.choices) && node.choices.length > 0)
        ? (node.guidePrompt || 'Pilih salah satu jawaban di atas yang paling sesuai dengan langkahmu.')
        : null;
      this._activateNodeInteraction(node, defaultPrompt);
    } catch (error) {
      if (!this._isDynamicRequestCurrent(requestedNodeId, requestSeq)) {
        return;
      }

      this._stopLoadingDots();

      console.warn(
        '[DialogueBox] Dialog NPC GenAI gagal. Menggunakan plotted dialogue sebagai fallback.',
        error,
      );

      this._resolvedDynamicTexts?.set(node.id, fallbackLine);
      this._dialogueText.setText(fallbackLine);
      this._updateTextBoxDimensions({
        hasChoices: Array.isArray(node.choices) && node.choices.length > 0,
      });
      if (node.speaker !== 'narration') {
        this._lastCharacterSpeaker = this._resolveSpeakerName(node);
        this._lastCharacterText = fallbackLine;
      }

      const defaultPrompt = (Array.isArray(node.choices) && node.choices.length > 0)
        ? (node.guidePrompt || 'Pilih salah satu jawaban di atas yang paling sesuai dengan langkahmu.')
        : null;
      this._activateNodeInteraction(node, defaultPrompt);
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }

  // ==============================================================
  // DYNAMIC REQUEST RACE GUARD
  // ==============================================================

  _isDynamicRequestCurrent(requestedNodeId, requestSeq) {
    if (!this.isOpen) {
      return false;
    }

    if (this._currentNode?.id !== requestedNodeId) {
      return false;
    }

    if (requestSeq !== this._dynamicRequestSeq) {
      return false;
    }

    return true;
  }

  // ==============================================================
  // NEXT NODE
  // ==============================================================

  _goToNext(nextId) {
    if (!nextId) {
      this.close();
      return;
    }

    this._renderNode(nextId);
  }

  // ==============================================================
  // PANDUAN KAK DARA MOTION BANNER (DI BAWAH JAWABAN)
  // ==============================================================

  _renderGuideMotionBanner(promptText, startY, { isResize = false } = {}) {
    const scene = this.scene;
    const compact = isCompactLandscape(scene);
    const guideBox = scene.add.container(
      this._cardX,
      isResize ? startY : startY + (compact ? 8 : 20),
    );
    guideBox.setAlpha(isResize ? 1 : 0);
    guideBox.setScale(isResize ? 1 : 0.95);

    const badgeWidth = compact ? 136 : pxToWorld(scene, 174);
    const badgeHeight = compact ? 20 : pxToWorld(scene, 24);
    const badgeX = -this._cardWidth / 2 + badgeWidth / 2 + (compact ? 8 : 12);

    const guideTextFont = compact ? 13.5 : pxToWorld(scene, 17);
    const guideText = scene.add
      .text(-this._cardWidth / 2 + (compact ? 12 : 16), compact ? 18 : pxToWorld(scene, 26), promptText, {
        fontFamily: '"Pixelify Sans", monospace',
        fontSize: `${guideTextFont}px`,
        color: '#f8fafc',
        wordWrap: { width: this._cardWidth - (compact ? 24 : 32) },
        lineSpacing: compact ? 2 : 3,
      })
      .setOrigin(0, 0);

    const guideBoxHeight = Math.max(
      compact ? 40 : pxToWorld(scene, 56),
      guideText.y + guideText.height + (compact ? 8 : pxToWorld(scene, 12)),
    );

    const guideGlow = scene.add
      .rectangle(
        0,
        guideBoxHeight / 2,
        this._cardWidth + 6,
        guideBoxHeight + 6,
        0xffdd57,
        0.14,
      );

    const guideBg = scene.add
      .rectangle(0, guideBoxHeight / 2, this._cardWidth, guideBoxHeight, 0x14122a, 0.96)
      .setStrokeStyle(2, 0xffdd57, 0.9);

    const badgeBg = scene.add
      .rectangle(badgeX, 0, badgeWidth, badgeHeight, 0xffdd57, 1)
      .setStrokeStyle(1.5, 0x14122a, 1);

    const guideTag = scene.add
      .text(badgeX, 0, '✦ PANDUAN KAK DARA', {
        fontFamily: '"Jersey 15", monospace',
        fontSize: `${compact ? 13 : pxToWorld(scene, 17)}px`,
        color: '#14122a',
      })
      .setOrigin(0.5, 0.5);

    guideBox.add([guideGlow, guideBg, badgeBg, guideTag, guideText]);
    this._container.add(guideBox);
    this._choiceObjects.push(guideBox);
    this._container.setScrollFactor(0, 0, true);

    const floatOffset = compact ? 2 : 3;
    if (isResize) {
      scene.tweens.add({
        targets: guideBox,
        y: startY - floatOffset,
        duration: 1600,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    } else {
      // Motion Entrance: muncul dari bawah ke atas dengan efek pegas halus
      scene.tweens.add({
        targets: guideBox,
        y: startY,
        alpha: 1,
        scaleX: 1,
        scaleY: 1,
        duration: 420,
        delay: 140,
        ease: 'Back.easeOut',
        onComplete: () => {
          if (!guideBox.scene) return;
          // Motion Mengambang Lembut (floating)
          scene.tweens.add({
            targets: guideBox,
            y: startY - floatOffset,
            duration: 1600,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
          });
        },
      });
    }

    // Motion Glow Berdenyut
    scene.tweens.add({
      targets: guideGlow,
      alpha: { from: 0.08, to: 0.28 },
      duration: 1100,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    return guideBoxHeight;
  }

  // ==============================================================
  // CHOICES
  // ==============================================================

  _renderChoices(choices, guidePrompt = null, { isResize = false } = {}) {
    const scene = this.scene;
    const compact = isCompactLandscape(scene);

    // Pre-fetch dialog dinamis NPC untuk setiap cabang pilihan selagi pemain membaca opsi
    this._prefetchChoiceDynamicNodes(choices);

    const btnFont = compact ? 15.5 : pxToWorld(scene, 19);
    const minBtnHeight = compact ? 26 : pxToWorld(scene, 38);
    const padY = compact ? 3 : pxToWorld(scene, 6);
    const gap = compact ? 5 : 8;

    let currentY = this._choicesStartY;

    // 1. Render semua tombol pilihan jawaban lebih dulu (tepat di bawah kotak dialog)
    choices.forEach((choice, i) => {
      const label = scene.add
        .text(
          this._cardX - this._cardWidth / 2 + (compact ? 10 : 14),
          0,
          `${i + 1}. ${this._substitute(choice.label)}`,
          {
            fontFamily: '"Pixelify Sans", monospace',
            fontSize: `${btnFont}px`,
            color: '#ffffff',
            wordWrap: {
              width: this._cardWidth - (compact ? 20 : 28),
            },
            lineSpacing: compact ? 1 : 2,
          },
        );

      const btnHeight = Math.max(minBtnHeight, Math.round(label.height + padY * 2));
      const targetCenterY = currentY + btnHeight / 2;

      const bg = scene.add
        .rectangle(
          this._cardX,
          isResize ? targetCenterY : targetCenterY + (compact ? 4 : 10),
          this._cardWidth,
          btnHeight,
          0x243b55,
          0.95,
        )
        .setStrokeStyle(1.5, 0xffdd57, 0.5)
        .setAlpha(isResize ? 1 : 0)
        .setScrollFactor(0)
        .setInteractive({
          useHandCursor: true,
        });

      label.setY(isResize ? targetCenterY : targetCenterY + (compact ? 4 : 10));
      label.setOrigin(0, 0.5);
      label.setAlpha(isResize ? 1 : 0);
      label.setScrollFactor(0);

      if (!isResize) {
        scene.tweens.add({
          targets: [bg, label],
          y: targetCenterY,
          alpha: 1,
          duration: 280,
          delay: i * 55,
          ease: 'Cubic.easeOut',
        });
      }

      // Hanya `bg` yang dibuat interaktif (karena menutupi seluruh area tombol).
      // Membuat `label` ikut interaktif sebelumnya menyebabkan pointerout pada `bg`
      // dan pointerover pada `label` saling beradu ketika kursor melintasi teks,
      // sehingga tombol berkedip-kedip (blink) dan gagal diklik.
      bg.on('pointerover', () => {
        bg.setFillStyle(0x2f4d73, 0.98);
        bg.setStrokeStyle(2, 0xffdd57, 0.95);
      });
      bg.on('pointerout', () => {
        bg.setFillStyle(0x243b55, 0.95);
        bg.setStrokeStyle(1.5, 0xffdd57, 0.5);
      });
      bg.on('pointerdown', (pointer) => {
        pointer?.event?.stopPropagation?.();
        if (!this._isInputReady()) {
          return;
        }
        this._selectChoice(choice);
      });

      this._container.add(bg);
      this._container.add(label);
      this._choiceObjects.push(bg, label);

      currentY += btnHeight + gap;
    });

    // 2. Panel Panduan Kak Dara diletakkan DI BAWAH pilihan jawaban (dengan motion animasi)
    // supaya tidak berada di antara dialog dan jawaban yang menutupi karakter.
    const promptText =
      guidePrompt || 'Pilih salah satu jawaban di atas yang paling sesuai dengan langkahmu.';
    const guideStartY = currentY + (compact ? 6 : pxToWorld(scene, 14));
    this._renderGuideMotionBanner(promptText, guideStartY, { isResize });

    // Pastikan seluruh elemen baru di dalam container punya scrollFactor(0)
    this._container.setScrollFactor(0, 0, true);

    this._choiceKeyHandler = (event) => {
      if (!this._isInputReady()) {
        return;
      }

      const num = Number(event.key);

      if (num >= 1 && num <= choices.length) {
        this._selectChoice(choices[num - 1]);
      }
    };

    scene.input.keyboard.on('keydown', this._choiceKeyHandler);
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this._choiceKeyHandler);
    }
  }

  // ==============================================================
  // SELECT CHOICE
  // ==============================================================

  _selectChoice(choice) {
    if (!this.isOpen) return;

    const responseText = this._substitute(choice.chatReply || choice.label);

    this._collectedChoices.push({
      nodeId: this._currentNode.id,
      choiceId: choice.id,
      emotion: choice.emotion,
      responseText,
    });

    this._onChoiceSelected?.(choice);

    this._lastChoiceLabel = responseText;

    // Pastikan cabang dinamis NPC untuk pilihan ini sudah di-prefetch
    const nextNode = choice.next ? this._dialogueTree?.nodes?.[choice.next] : null;
    if (nextNode?.dynamic) {
      this._prefetchDynamicNode(nextNode, responseText);
    }

    if (this._choiceKeyHandler) {
      this.scene.input.keyboard.off('keydown', this._choiceKeyHandler);
      if (typeof window !== 'undefined') {
        window.removeEventListener('keydown', this._choiceKeyHandler);
      }
      this._choiceKeyHandler = null;
    }

    this._goToNext(choice.next);
  }

  // ==============================================================
  // DESTROY CHOICES
  // ==============================================================

  _destroyChoiceObjects() {
    this._choiceObjects.forEach((obj) => {
      obj.destroy();
    });

    this._choiceObjects = [];

    if (this._choiceKeyHandler) {
      this.scene.input.keyboard.off('keydown', this._choiceKeyHandler);
      if (typeof window !== 'undefined') {
        window.removeEventListener('keydown', this._choiceKeyHandler);
      }

      this._choiceKeyHandler = null;
    }
  }

  // ==============================================================
  // ADVANCE INPUT
  // ==============================================================

  _attachAdvanceInput(handler) {
    this._detachAdvanceInput();

    let lastTriggerAt = 0;
    const guardedHandler = () => {
      if (!this._isInputReady()) {
        return;
      }
      const now = Date.now();
      if (now - lastTriggerAt < 120) {
        return;
      }
      lastTriggerAt = now;

      handler();
    };

    this._advanceKeyHandler = guardedHandler;
    this._advancePointerHandler = guardedHandler;

    this._windowAdvanceKeyHandler = (event) => {
      if (!this._isInputReady()) return;
      const code = event?.code || '';
      const key = (event?.key || '').toLowerCase();
      if (code === 'KeyE' || code === 'Space' || key === 'e' || key === ' ') {
        guardedHandler();
      }
    };

    this.scene.input.keyboard.on('keydown-E', guardedHandler);
    this.scene.input.keyboard.on('keydown-SPACE', guardedHandler);
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this._windowAdvanceKeyHandler);
    }

    // Tap / klik di mana saja.
    this.scene.input.on('pointerdown', guardedHandler);
  }

  // ==============================================================
  // DETACH ADVANCE INPUT
  // ==============================================================

  _detachAdvanceInput() {
    if (this._advanceKeyHandler) {
      this.scene.input.keyboard.off('keydown-E', this._advanceKeyHandler);

      this.scene.input.keyboard.off('keydown-SPACE', this._advanceKeyHandler);

      this._advanceKeyHandler = null;
    }

    if (this._windowAdvanceKeyHandler) {
      if (typeof window !== 'undefined') {
        window.removeEventListener('keydown', this._windowAdvanceKeyHandler);
      }
      this._windowAdvanceKeyHandler = null;
    }

    if (this._advancePointerHandler) {
      this.scene.input.off('pointerdown', this._advancePointerHandler);

      this._advancePointerHandler = null;
    }
  }

  // ==============================================================
  // RESIZE
  // ==============================================================

  _onResize() {
    if (!this.isOpen) {
      return;
    }

    if (this._resizeTimer) {
      clearTimeout(this._resizeTimer);
    }

    this._resizeTimer = setTimeout(() => {
      this._resizeTimer = null;
      if (!this.isOpen || !this.scene?.sys?.game) {
        return;
      }

      const bounds = getVisibleBounds(this.scene);
      if (
        this._lastBounds &&
        Math.abs(bounds.width - this._lastBounds.width) < 2 &&
        Math.abs(bounds.height - this._lastBounds.height) < 2 &&
        Math.abs(bounds.left - this._lastBounds.left) < 2 &&
        Math.abs(bounds.top - this._lastBounds.top) < 2
      ) {
        return;
      }

      const currentNodeId = this._currentNode?.id;

      this._dynamicRequestSeq += 1;

      this._stopLoadingDots();

      this._destroyChoiceObjects();
      this._detachAdvanceInput();

      this._container?.destroy();

      this._container = null;

      this._buildStaticFrame();

      this._renderNode(currentNodeId ?? this._dialogueTree.startNode, {
        isResize: true,
      });
    }, 80);
  }

  // ==============================================================
  // HIDE / SHOW UI TOGGLE
  // ==============================================================

  _toggleHideUi() {
    if (!this.isOpen || !this._container) return;

    this._isUiHidden = !this._isUiHidden;

    if (this._isUiHidden) {
      this._container.setVisible(false);

      if (!this._hiddenHint) {
        const bounds = getVisibleBounds(this.scene);
        const hintY = bounds.bottom - pxToWorld(this.scene, 32);
        const fontSz = pxToWorld(this.scene, 15);

        this._hiddenHint = this.scene.add
          .text(
            bounds.centerX,
            hintY,
            'Mode Layar Penuh - Ketuk di mana saja atau tekan [H] untuk menampilkan dialog',
            {
              fontFamily: '"Pixelify Sans", monospace',
              fontSize: `${fontSz}px`,
              color: '#ffffff',
              backgroundColor: '#0f172aee',
              padding: { x: 16, y: 8 },
            },
          )
          .setOrigin(0.5)
          .setDepth(600)
          .setScrollFactor(0);
      } else {
        this._hiddenHint.setVisible(true);
      }

      this._restorePointerHandler = () => {
        if (this._isUiHidden) {
          this._toggleHideUi();
        }
      };

      this.scene.time.delayedCall(120, () => {
        if (this._isUiHidden && this.isOpen) {
          this.scene.input.once('pointerdown', this._restorePointerHandler);
        }
      });
    } else {
      this._container.setVisible(true);

      if (this._hiddenHint) {
        this._hiddenHint.setVisible(false);
      }

      if (this._restorePointerHandler) {
        this.scene.input.off('pointerdown', this._restorePointerHandler);
        this._restorePointerHandler = null;
      }
    }
  }

  _cleanupHideUi() {
    this._isUiHidden = false;

    if (this._hiddenHint) {
      this._hiddenHint.destroy();
      this._hiddenHint = null;
    }

    if (this._onKeyH) {
      this.scene.input.keyboard.off('keydown', this._onKeyH);
      this._onKeyH = null;
    }

    if (this._restorePointerHandler) {
      this.scene.input.off('pointerdown', this._restorePointerHandler);
      this._restorePointerHandler = null;
    }
  }
}
