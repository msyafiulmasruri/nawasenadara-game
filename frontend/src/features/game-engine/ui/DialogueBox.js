import Phaser from 'phaser';
import { getVisibleBounds, pxToWorld } from '../utils/visibleBounds';
import { setMood } from '../utils/moodStore';

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

    this._nodeReadyAt = 0;

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

  // ==============================================================
  // OPEN
  // ==============================================================

  open({ dialogueTree, npcPortraitKey, npcName, playerName, onClose, onNodeChange, onDynamicLine, onChoiceSelected }) {
    if (this.isOpen) return;

    this.isOpen = true;

    this._dialogueTree = dialogueTree;
    this._npcPortraitKey = npcPortraitKey;
    this._npcName = npcName;
    this._playerName = playerName || 'Kamu';
    this._onClose = onClose;
    this._onNodeChange = onNodeChange;
    this._onDynamicLine = onDynamicLine;
    this._onChoiceSelected = onChoiceSelected;

    this._collectedChoices = [];
    this._lastChoiceLabel = null;

    this._buildStaticFrame();

    this._renderNode(dialogueTree.startNode);

    this.scene.scale.on('resize', this._onResize, this);

    // ============================================================
    // SCENE SHUTDOWN SAFETY
    // ============================================================
    //
    // Kalau scene berhenti secara paksa saat dialog masih aktif
    // (misalnya restart / kembali pilih episode), DialogueBox harus
    // dibersihkan supaya listener global seperti resize tidak tertinggal.
    //
    // close(true) artinya:
    //
    // - bersihkan dialog
    // - JANGAN jalankan onClose()
    //
    // karena scene memang dihentikan secara paksa.
    //
    this._shutdownHandler = () => this.close(true);

    this.scene.events.once('shutdown', this._shutdownHandler);
  }

  // ==============================================================
  // CLOSE
  // ==============================================================

  close(silent = false) {
    if (!this.isOpen) return;

    this.isOpen = false;

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
    return this.isOpen && this.scene.time.now >= this._nodeReadyAt;
  }

  // ==============================================================
  // STATIC FRAME
  // ==============================================================

  _buildStaticFrame() {
    const scene = this.scene;
    const bounds = getVisibleBounds(scene);

    const cardWidth = Math.min(bounds.width * 0.92, 640);

    const cardX = bounds.centerX;

    const cardTop = bounds.top + bounds.height * 0.08;

    this._container = scene.add
      .container(0, 0)
      .setDepth(500)
      .setScrollFactor(0);

    // ============================================================
    // NAME TAG
    // ============================================================

    const nameFont = pxToWorld(scene, 19);

    this._nameTagBg = scene.add
      .rectangle(
        cardX - cardWidth / 2 + 4,
        cardTop,
        0,
        nameFont + 14,
        0x243b55,
        0.95,
      )
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0xffdd57, 0.85);

    this._container.add(this._nameTagBg);

    this._nameTag = scene.add
      .text(cardX - cardWidth / 2 + 16, cardTop + 7, this._npcName, {
        fontFamily: '"Jersey 15", monospace',

        fontSize: `${nameFont}px`,

        color: '#ffdd57',
      })
      .setOrigin(0, 0);

    this._container.add(this._nameTag);

    // ============================================================
    // DIALOGUE BOX
    // ============================================================

    const textBoxTop = cardTop + nameFont + 14 + 4;

    const textBoxHeight = Math.min(bounds.height * 0.22, 140);

    this._textBoxTop = textBoxTop;
    this._textBoxHeight = textBoxHeight;

    this._cardX = cardX;
    this._cardWidth = cardWidth;

    this._textBoxBg = scene.add
      .rectangle(
        cardX,
        textBoxTop + textBoxHeight / 2,
        cardWidth,
        textBoxHeight,
        0x0f0f22,
        0.95,
      )
      .setStrokeStyle(2, 0xffdd57, 0.6);

    this._container.add(this._textBoxBg);

    // ============================================================
    // DIALOGUE TEXT
    // ============================================================

    const dialogueFont = pxToWorld(scene, 18);

    this._dialogueText = scene.add
      .text(cardX - cardWidth / 2 + 16, textBoxTop + 14, '', {
        fontFamily: '"Pixelify Sans", monospace',

        fontSize: `${dialogueFont}px`,

        color: '#ffffff',

        wordWrap: {
          width: cardWidth - 32,
        },

        lineSpacing: 4,
      })
      .setOrigin(0, 0);

    this._container.add(this._dialogueText);

    // ============================================================
    // ADVANCE HINT
    // ============================================================

    const hintFont = pxToWorld(scene, 13);

    this._advanceHint = scene.add
      .text(
        cardX + cardWidth / 2 - 14,
        textBoxTop + textBoxHeight - 10,
        '[E] / Ketuk layar ▸',
        {
          fontFamily: '"Pixelify Sans", monospace',

          fontSize: `${hintFont}px`,

          color: '#aaaaaa',
        },
      )
      .setOrigin(1, 1);

    this._container.add(this._advanceHint);

    // Default disembunyikan dulu.
    //
    // Nanti _activateNodeInteraction()
    // yang menentukan kapan hint muncul.
    this._advanceHint.setVisible(false);

    // Posisi awal pilihan jawaban.
    this._choicesStartY = textBoxTop + textBoxHeight + 12;
  }

  // ==============================================================
  // TEXT PLACEHOLDER
  // ==============================================================

  _substitute(text = '') {
    return String(text).replace(/\{PLAYER_NAME\}/g, this._playerName);
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

  _activateNodeInteraction(node) {
    if (!this.isOpen) return;

    // Beri jeda kecil SETELAH teks sudah siap.
    //
    // Untuk node AI, berarti timer input baru dimulai setelah AI
    // selesai menghasilkan dialog.
    this._nodeReadyAt = this.scene.time.now + NODE_INPUT_GUARD_MS;

    // ============================================================
    // NODE DENGAN CHOICES
    // ============================================================

    if (Array.isArray(node.choices) && node.choices.length > 0) {
      this._advanceHint.setVisible(false);

      this._renderChoices(node.choices);

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

  _renderNode(nodeId) {
    const node = this._dialogueTree.nodes[nodeId];

    if (!node) {
      this.close();
      return;
    }

    // Beri tahu scene bahwa dialogue berpindah ke node ini
    this._onNodeChange?.(node);

    // ============================================================
    // REQUEST SEQUENCE
    // ============================================================
    //
    // Setiap render node membuat sequence baru.
    //
    // Response AI dengan sequence lama akan diabaikan.
    //
    const requestSeq = ++this._dynamicRequestSeq;

    this._currentNode = node;
    this._onNodeChange?.(node);

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
    // SPEAKER NAME
    // ============================================================

    const isNarration = node.speaker === 'narration';

    if (isNarration) {
      // Node narasi tidak punya pembicara fisik. Sembunyikan tab nama
      // supaya teks seperti deskripsi kamar / isi grup chat tidak
      // salah terlihat seolah-olah diucapkan oleh Rafi.
      this._nameTag.setVisible(false);
      this._nameTagBg.setVisible(false);
    } else {
      this._nameTag.setVisible(true);
      this._nameTagBg.setVisible(true);

      this._nameTag.setText(
        node.speaker === 'player' || node.speaker === 'dara'
          ? this._playerName
          : this._npcName,
      );

      this._nameTagBg.setSize(
        this._nameTag.width + 24,
        this._nameTag.height + 14,
      );
    }

    // ============================================================
    // DYNAMIC NPC NODE
    // ============================================================
    //
    // INI PERUBAHAN UTAMA.
    //
    // Kalau:
    //
    // dynamic: true
    //
    // maka node.text TIDAK ditampilkan.
    //
    // node.text hanya digunakan sebagai:
    //
    // 1. plottedLine untuk GenAI
    // 2. patokan makna
    // 3. fallback jika AI gagal
    //
    if (node.dynamic) {
      this._startLoadingDots();

      // Sengaja tidak di-await supaya fungsi render tidak memblokir
      // game loop Phaser.
      void this._requestDynamicLine(node, requestSeq);

      return;
    }

    // ============================================================
    // STATIC NODE
    // ============================================================

    this._dialogueText.setText(this._substitute(node.text));

    // Setelah teks siap baru tombol lanjut / choices aktif.
    this._activateNodeInteraction(node);
  }

  // ==============================================================
  // REQUEST DYNAMIC NPC LINE
  // ==============================================================

  async _requestDynamicLine(node, requestSeq) {
    const nlp = typeof window !== 'undefined' ? window.__nawasenadaraNlp : null;

    const requestedNodeId = node.id;

    // Dialog asli tetap menjadi fallback.
    const fallbackLine = this._substitute(node.text);

    // ============================================================
    // NLP BRIDGE TIDAK TERSEDIA
    // ============================================================

    if (!nlp?.generateNpcLine) {
      // Pastikan node/request masih aktif.
      if (!this._isDynamicRequestCurrent(requestedNodeId, requestSeq)) {
        return;
      }

      this._stopLoadingDots();

      this._dialogueText.setText(fallbackLine);

      this._activateNodeInteraction(node);

      return;
    }

    let timeoutId = null;

    try {
      // ==========================================================
      // REQUEST GEN AI
      // ==========================================================

      const aiRequest = nlp.generateNpcLine({
        npcName: this._npcName,

        // Ini dialog patokan.
        //
        // Tidak ditampilkan sebelum AI selesai.
        plottedLine: fallbackLine,

        situation: node.situationHint || null,

        playerChoiceLabel: this._lastChoiceLabel || null,
      });

      // ==========================================================
      // FRONTEND TIMEOUT
      // ==========================================================

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

      // Yang selesai duluan:
      //
      // AI request
      //
      // atau
      //
      // timeout.
      //
      const result = await Promise.race([aiRequest, timeoutPromise]);

      // ==========================================================
      // RACE GUARD
      // ==========================================================

      if (!this._isDynamicRequestCurrent(requestedNodeId, requestSeq)) {
        return;
      }

      // ==========================================================
      // AI SELESAI
      // ==========================================================

      this._stopLoadingDots();

      // Mendukung dua kemungkinan response:
      //
      // { line: "..." }
      //
      // maupun langsung string "..."
      //
      const generatedLine =
          typeof result === 'string'
              ? result.trim()
              : result?.line?.trim();

      const finalLine = generatedLine || fallbackLine;

      this._dialogueText.setText(finalLine);

      // Kirim hasil dialog ke scene
      this._onDynamicLine?.({
          node,
          text: finalLine,
      });

      // Baru sekarang pemain boleh:
      //
      // - menekan E
      // - menekan Space
      // - tap layar
      // - memilih pilihan dialog
      //
      this._activateNodeInteraction(node);
    } catch (error) {
      // ==========================================================
      // AI ERROR / TIMEOUT
      // ==========================================================

      if (!this._isDynamicRequestCurrent(requestedNodeId, requestSeq)) {
        return;
      }

      this._stopLoadingDots();

      console.warn(
        '[DialogueBox] Dialog NPC GenAI gagal. Menggunakan plotted dialogue sebagai fallback.',
        error,
      );

      // Baru pada kondisi gagal teks aslinya ditampilkan.
      this._dialogueText.setText(fallbackLine);

      this._activateNodeInteraction(node);
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
    // Dialog sudah ditutup.
    if (!this.isOpen) {
      return false;
    }

    // Pemain sudah berada di node lain.
    if (this._currentNode?.id !== requestedNodeId) {
      return false;
    }

    // Request lama.
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
  // CHOICES
  // ==============================================================

  _renderChoices(choices) {
    const scene = this.scene;

    const btnFont = pxToWorld(scene, 17);

    const btnHeight = pxToWorld(scene, 34);

    const gap = 8;

    choices.forEach((choice, i) => {
      const y = this._choicesStartY + i * (btnHeight + gap);

      // ========================================================
      // BUTTON BACKGROUND
      // ========================================================

      const bg = scene.add
        .rectangle(
          this._cardX,
          y + btnHeight / 2,
          this._cardWidth,
          btnHeight,
          0x243b55,
          0.95,
        )
        .setStrokeStyle(1.5, 0xffdd57, 0.5)
        .setInteractive({
          useHandCursor: true,
        });

      // ========================================================
      // BUTTON TEXT
      // ========================================================

      const label = scene.add
        .text(
          this._cardX - this._cardWidth / 2 + 14,

          y + btnHeight / 2,

          `${i + 1}. ${this._substitute(choice.label)}`,

          {
            fontFamily: '"Pixelify Sans", monospace',

            fontSize: `${btnFont}px`,

            color: '#ffffff',

            wordWrap: {
              width: this._cardWidth - 28,
            },
          },
        )
        .setOrigin(0, 0.5);

      // ========================================================
      // POINTER EVENTS
      // ========================================================

      bg.on('pointerover', () => bg.setFillStyle(0x2f4d73, 0.95));

      bg.on('pointerout', () => bg.setFillStyle(0x243b55, 0.95));

      bg.on('pointerdown', () => {
        if (!this._isInputReady()) {
          return;
        }

        this._selectChoice(choice);
      });

      this._container.add(bg);
      this._container.add(label);

      this._choiceObjects.push(bg, label);
    });

    // ============================================================
    // KEYBOARD 1 - 9
    // ============================================================

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
  }

  // ==============================================================
  // SELECT CHOICE
  // ==============================================================

  _selectChoice(choice) {
    if (!this.isOpen) return;

    this._collectedChoices.push({
      nodeId: this._currentNode.id,

      choiceId: choice.id,

      emotion: choice.emotion,
    });

    this._onChoiceSelected?.(choice);

    // ============================================================
    // LAST PLAYER CHOICE
    // ============================================================
    //
    // Disimpan supaya node NPC selanjutnya punya konteks:
    //
    // "Baris yang barusan dikatakan pemain"
    //
    // Ini membantu GenAI membuat parafrase yang lebih natural
    // tanpa mengubah plot.
    //
    this._lastChoiceLabel = this._substitute(choice.chatReply || choice.label);

    // ============================================================
    // MOOD HUD
    // ============================================================

    if (choice.emotion) {
      setMood(choice.emotion, 0.75);
    }

    // Keyboard choices tidak boleh tetap aktif ketika pindah node.
    if (this._choiceKeyHandler) {
      this.scene.input.keyboard.off('keydown', this._choiceKeyHandler);

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

      this._choiceKeyHandler = null;
    }
  }

  // ==============================================================
  // ADVANCE INPUT
  // ==============================================================

  _attachAdvanceInput(handler) {
    this._detachAdvanceInput();

    const guardedHandler = () => {
      if (!this._isInputReady()) {
        return;
      }

      handler();
    };

    this._advanceKeyHandler = guardedHandler;

    this._advancePointerHandler = guardedHandler;

    this.scene.input.keyboard.on('keydown-E', guardedHandler);

    this.scene.input.keyboard.on('keydown-SPACE', guardedHandler);

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

    const currentNodeId = this._currentNode?.id;

    // ============================================================
    // INVALIDATE OLD AI REQUEST
    // ============================================================
    //
    // Resize membangun ulang DialogueBox.
    //
    // Kalau saat itu request AI lama masih berlangsung, responsnya
    // tidak boleh menimpa UI baru.
    //
    this._dynamicRequestSeq += 1;

    this._stopLoadingDots();

    this._destroyChoiceObjects();
    this._detachAdvanceInput();

    this._container?.destroy();

    this._container = null;

    this._buildStaticFrame();

    this._renderNode(currentNodeId ?? this._dialogueTree.startNode);
  }
}
