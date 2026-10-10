'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/features/auth/context/AuthContext';
import { setMood } from '@/features/game-engine/utils/moodStore';
import apiClient from '@/lib/apiClient';

// Overlay HTML/React di ATAS kanvas Phaser untuk dua UI yang perlu
// input teks bebas & percakapan multi-baris — hal yang jauh lebih
// gampang dibuat dengan DOM biasa daripada dirender manual di canvas
// Phaser. Dipasang sekali di game/page.js, dikendalikan Phaser scene
// manapun lewat window.__nawasenadaraUI:
//
//   const result = await window.__nawasenadaraUI.openJournal(episodeId);
//   // result = { label, confidence, risk_level, suggest_counseling }
//
//   window.__nawasenadaraUI.openChatbot({ triggerSource, episodeId });
//
// Journal PAKAI Promise (scene menunggu sampai pemain submit) karena
// alur episode (lihat BasePlayerScene.finishEpisode()) memang harus
// berhenti sejenak sampai jurnal terisi sebelum lanjut ke episode
// berikutnya. Chatbot TIDAK pakai Promise — dia modal independen yang
// bisa dibuka/tutup kapan saja tanpa memblokir gameplay di baliknya.
export default function GameUIBridge() {
  const { getAccessToken } = useAuth();
  const [journal, setJournal] = useState(null); // { episodeId, resolve }
  const [journalText, setJournalText] = useState('');
  const [journalSubmitting, setJournalSubmitting] = useState(false);
  const [journalResultNote, setJournalResultNote] = useState(null);

  // Form masukan pada menu awal. Promise membuat MenuScene tetap
  // terkunci sampai pemain membatalkan atau selesai mengirim masukan.
  const [feedback, setFeedback] = useState(null); // { resolve }
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackError, setFeedbackError] = useState(null);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  // Overlay pengisian nama tokoh — dipicu MenuScene saat pemain
  // menekan "Start Story" untuk PERTAMA KALI (belum punya
  // character_name tersimpan). Sama polanya dengan `journal`: pakai
  // Promise supaya Phaser scene menunggu sampai pemain submit nama
  // sebelum lanjut ke EpisodeSelectScene.
  const [namePrompt, setNamePrompt] = useState(null); // { resolve }
  const [nameInput, setNameInput] = useState('');
  const [nameSubmitting, setNameSubmitting] = useState(false);
  const [nameError, setNameError] = useState(null);

  const [chat, setChat] = useState(null); // { open, sessionId, episodeId, triggerSource }
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatSending, setChatSending] = useState(false);
  // Maximize/restore ala jendela desktop — diminta khusus untuk
  // antisipasi layar HP yang kecil. Direset ke false tiap kali chat
  // ditutup, supaya buka lagi lain kali selalu mulai dari ukuran
  // normal (bukan "nyangkut" maximize dari sesi sebelumnya).
  const [chatMaximized, setChatMaximized] = useState(false);
  // Berapa piksel keyboard virtual HP menutupi bagian BAWAH viewport
  // saat ini — dipakai untuk mengangkat jendela chat supaya kotak
  // ketik & tombol kirim tidak ketutup keyboard. Lihat useEffect
  // window.visualViewport di bawah.
  const [keyboardInset, setKeyboardInset] = useState(0);
  const chatScrollRef = useRef(null);
  const chatStateRef = useRef(null);

  // Khusus penutupan Episode 2 dan 3. Resolver disimpan di ref agar
  // percakapan Kak Dara dapat berlangsung selama yang pemain butuhkan
  // tanpa membuat scene menganggap episode sudah selesai lebih dulu.
  const pendingEpisodeCompletionRef = useRef(null);
  const [pendingEpisodeCompletion, setPendingEpisodeCompletion] = useState(null);

  // Tawaran "ngobrol dengan Kak Dara atau lanjut main dulu" —
  // dipicu Phaser TEPAT setelah dialog quest dengan NPC episode itu
  // selesai (lihat onClose di Episode1Scene.js), BUKAN lagi menempel
  // di alur pindah-episode. Promise-based sama seperti overlay lain di
  // sini: scene menunggu sampai pemain memilih sebelum kontrol
  // dikembalikan.
  const [counselOffer, setCounselOffer] = useState(null); // { episodeId, npcName, resolve }

  const openJournal = useCallback(
    (episodeId, { allowSkip = false } = {}) =>
      new Promise((resolve) => {
        setJournalText('');
        setJournalResultNote(null);
        setJournal({ episodeId, resolve, allowSkip });
      }),
    [],
  );

  const openFeedback = useCallback(
    () =>
      new Promise((resolve) => {
        setFeedbackRating(0);
        setFeedbackMessage('');
        setFeedbackSubmitting(false);
        setFeedbackError(null);
        setFeedbackSubmitted(false);
        setFeedback({ resolve });
      }),
    [],
  );

  const promptCharacterName = useCallback(
    () =>
      new Promise((resolve) => {
        setNameInput('');
        setNameError(null);
        setNamePrompt({ resolve });
      }),
    [],
  );

  const offerCounseling = useCallback(
    ({ episodeId, npcName, autoContext, waitForEpisodeContinue = false } = {}) =>
      new Promise((resolve) => {
        setCounselOffer({
          episodeId,
          npcName,
          autoContext,
          waitForEpisodeContinue,
          resolve,
        });
      }),
    [],
  );

  const openChatbot = useCallback(async ({ triggerSource = 'manual', episodeId, autoContext } = {}) => {
    setChat({ open: true, sessionId: null, episodeId, triggerSource });
    setChatMessages([]);

    // Coba muat riwayat sesi konseling TERAKHIR (kalau masih dalam
    // window "aktif" 30 menit) — supaya histori tidak hilang tiap kali
    // jendela chat ditutup-buka lagi. Riwayat ini cuma tersimpan di
    // sisi SERVER (tabel counseling_sessions/counseling_messages),
    // bukan di localStorage — jadi tetap ada meski game ditutup total
    // & dibuka lagi nanti, TAPI otomatis "kadaluarsa" jadi sesi baru
    // kalau sudah lebih dari 30 menit sejak pesan terakhir (supaya
    // percakapan lama yang sudah selesai tidak terus dilanjutkan
    // seperti belum pernah berhenti).
    const nlp = window.__nawasenadaraNlp;
    let hasHistory = false;
    let loadedSessionId = null;
    if (nlp?.getActiveSession) {
      try {
        const active = await nlp.getActiveSession();
        if (active?.session_id && active.messages?.length) {
          hasHistory = true;
          loadedSessionId = active.session_id;
          setChat((current) =>
            current?.open
              ? { ...current, sessionId: active.session_id, episodeId, triggerSource }
              : current,
          );
          setChatMessages(
            active.messages.map((m) => ({ role: m.role, content: m.content })),
          );
        }
      } catch (err) {
        // Gagal muat riwayat BUKAN alasan untuk gagal buka chatbot —
        // cukup mulai dari kosong seperti biasa.
        console.warn('Gagal memuat riwayat sesi konseling:', err);
      }
    }

    // Episode 7 (NPC telepon) ingin ada pesan pembuka otomatis dari
    // "Kak Dara" — ditampilkan sebagai sapaan lokal (bukan dikirim ke
    // backend sebagai giliran chat) supaya jendela tidak kosong
    // sebelum siswa mengetik apa pun. Cuma ditampilkan kalau memang
    // belum ada riwayat yang baru saja dimuat di atas.
    if (!hasHistory && triggerSource === 'episode7_phone') {
      setChatMessages([
        {
          role: 'assistant',
          content:
            'Halo, aku Kak Dara. Aku dengar kamu lagi butuh teman cerita — aku di sini, ceritakan saja apa yang kamu rasakan.',
        },
      ]);
      return;
    }

    // Kak Dara "sudah tahu" isi obrolan pemain dengan NPC episode ini —
    // begitu chatbot dibuka DAN belum ada riwayat sesi aktif, ringkasan
    // otomatis (`autoContext`, dibangun dari pilihan dialog pemain,
    // lihat Episode1Scene.getCounselingAutoContext()) dikirim SENDIRI
    // sebagai giliran pertama ke /api/nlp/counseling — pemain tidak
    // perlu mengetik ulang ceritanya dari nol, jendela chat langsung
    // terbuka dengan balasan Kak Dara yang sudah kontekstual. Kalau
    // memang sudah ada riwayat (hasHistory true), lewati bagian ini
    // supaya tidak mengirim ringkasan yang sama berkali-kali tiap kali
    // jendela dibuka-tutup dalam window sesi yang sama.
    if (!hasHistory && autoContext) {
      setChatMessages([{ role: 'user', content: autoContext }]);
      setChatSending(true);
      try {
        const result = await nlp.sendCounselingMessage({
          text: autoContext,
          sessionId: loadedSessionId,
          triggerSource: 'episode_summary',
          episodeId,
        });
        setChat((prev) => (prev ? { ...prev, sessionId: result.session_id } : prev));
        setChatMessages((prev) => [...prev, { role: 'assistant', content: result.reply }]);
        if (result?.emotion_detected) setMood(result.emotion_detected, result.emotion_confidence);
      } catch (err) {
        console.warn('Gagal mengirim ringkasan otomatis ke Kak Dara:', err);
        setChatMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content:
              'Halo, aku Kak Dara. Sepertinya ada gangguan koneksi barusan — boleh cerita ulang apa yang baru saja terjadi?',
          },
        ]);
      } finally {
        setChatSending(false);
      }
    }
  }, []);

  const closeChatbot = useCallback(() => {
    // Pada alur penutupan episode, tombol lanjut di dalam chat adalah
    // satu-satunya jalan keluar. Ini mencegah Promise scene menggantung
    // bila ikon chat atau tombol tutup ditekan lebih dulu.
    if (pendingEpisodeCompletionRef.current) return;
    setChat(null);
    setChatMessages([]);
    setChatInput('');
    setChatMaximized(false);
  }, []);

  // Dipakai tombol ikon chat di Phaser (BasePlayerScene.createChatButton)
  // untuk memutuskan: tap berikutnya harus MEMBUKA atau MENUTUP jendela
  // chatbot — supaya ikon yang sama berfungsi sebagai toggle, bukan
  // cuma "buka" satu arah (menutup selama ini cuma bisa lewat tombol ✕
  // di dalam kartu chat).
  useEffect(() => {
    chatStateRef.current = chat;
  }, [chat]);
  const isChatbotOpen = useCallback(() => Boolean(chatStateRef.current?.open), []);

  useEffect(() => {
    window.__nawasenadaraUI = {
      openJournal,
      openChatbot,
      closeChatbot,
      promptCharacterName,
      offerCounseling,
      openFeedback,
      isChatbotOpen,
    };
    return () => {
      if (window.__nawasenadaraUI?.openJournal === openJournal) {
        delete window.__nawasenadaraUI;
      }
    };
  }, [
    openJournal,
    openChatbot,
    closeChatbot,
    promptCharacterName,
    offerCounseling,
    openFeedback,
    isChatbotOpen,
  ]);

  const submitCharacterName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) {
      setNameError('Nama tokoh tidak boleh kosong.');
      return;
    }
    if (!namePrompt) return;
    setNameSubmitting(true);
    setNameError(null);
    try {
      const profile = window.__nawasenadaraProfile;
      const savedName = profile?.saveCharacterName
        ? await profile.saveCharacterName(trimmed)
        : trimmed;
      namePrompt.resolve(savedName);
      setNamePrompt(null);
    } catch (err) {
      console.warn('Gagal menyimpan nama tokoh:', err);
      setNameError('Gagal menyimpan nama, coba lagi ya.');
    } finally {
      setNameSubmitting(false);
    }
  };

  const closeFeedback = (submitted = false) => {
    const activeFeedback = feedback;
    setFeedback(null);
    setFeedbackRating(0);
    setFeedbackMessage('');
    setFeedbackSubmitting(false);
    setFeedbackError(null);
    setFeedbackSubmitted(false);
    activeFeedback?.resolve({ submitted });
  };

  const submitFeedback = async () => {
    if (!feedback || feedbackSubmitting) return;

    const message = feedbackMessage.trim();
    if (!Number.isInteger(feedbackRating) || feedbackRating < 1 || feedbackRating > 5) {
      setFeedbackError('Pilih rating dari 1 sampai 5 terlebih dahulu.');
      return;
    }
    if (message.length < 3) {
      setFeedbackError('Masukan perlu berisi minimal 3 karakter.');
      return;
    }

    setFeedbackSubmitting(true);
    setFeedbackError(null);
    try {
      await apiClient.post(
        '/api/feedback',
        { rating: feedbackRating, message },
        { getAccessToken },
      );
      setFeedbackSubmitted(true);
    } catch (err) {
      console.warn('Gagal mengirim masukan game:', err);
      setFeedbackError(err?.message || 'Masukan belum berhasil dikirim. Coba lagi, ya.');
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  const chooseCounseling = () => {
    const ctx = counselOffer;
    setCounselOffer(null);

    if (ctx?.waitForEpisodeContinue) {
      pendingEpisodeCompletionRef.current = {
        episodeId: ctx.episodeId,
        resolve: ctx.resolve,
      };
      setPendingEpisodeCompletion({ episodeId: ctx.episodeId });
    } else {
      ctx?.resolve(true);
    }

    // Untuk episode biasa, chatbot tetap non-blocking. Khusus Episode
    // 2 dan 3, Promise ditahan sampai pemain menekan tombol lanjut yang
    // tersedia di bagian bawah jendela Kak Dara.
    openChatbot({
      triggerSource: 'npc_quest',
      episodeId: ctx?.episodeId,
      autoContext: ctx?.autoContext,
    });
  };

  const dismissCounselOffer = () => {
    const ctx = counselOffer;
    setCounselOffer(null);
    ctx?.resolve(false);
  };

  const continueToNextEpisode = () => {
    const pending = pendingEpisodeCompletionRef.current;
    if (!pending) return;

    pendingEpisodeCompletionRef.current = null;
    setPendingEpisodeCompletion(null);
    setChat(null);
    setChatMessages([]);
    setChatInput('');
    setChatMaximized(false);
    pending.resolve(true);
  };

  useEffect(() => {
    chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight });
  }, [chatMessages]);

  // Deteksi keyboard virtual HP terbuka lewat window.visualViewport —
  // API browser yang melaporkan ukuran viewport yang BENAR-BENAR
  // terlihat (di luar area yang ketutup keyboard), beda dari
  // window.innerHeight yang tidak berubah sama sekali saat keyboard
  // muncul. Selisihnya dipakai untuk mengangkat jendela chat ke atas
  // supaya kotak ketik & tombol kirim tidak ketutup keyboard.
  // Browser lama tanpa dukungan visualViewport (jarang di 2026) cukup
  // fallback ke keyboardInset=0 (perilaku lama, tidak lebih buruk).
  useEffect(() => {
    if (!chat?.open) return undefined;
    if (typeof window === 'undefined' || !window.visualViewport) return undefined;

    const vv = window.visualViewport;
    const handleViewportChange = () => {
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKeyboardInset(inset);
    };

    handleViewportChange();
    vv.addEventListener('resize', handleViewportChange);
    vv.addEventListener('scroll', handleViewportChange);

    return () => {
      vv.removeEventListener('resize', handleViewportChange);
      vv.removeEventListener('scroll', handleViewportChange);
      setKeyboardInset(0);
    };
  }, [chat?.open]);

  // Satu status primitif menjaga dependency useEffect tetap berukuran
  // tetap ketika jenis overlay bertambah. Ini juga menghindari warning
  // React Fast Refresh "dependency array changed size" saat form baru
  // ditambahkan pada sesi development yang masih berjalan.
  const anyOverlayOpen =
    Boolean(journal) ||
    Boolean(chat?.open) ||
    Boolean(namePrompt) ||
    Boolean(counselOffer) ||
    Boolean(feedback);
  const onlyChatOpen =
    Boolean(chat?.open) &&
    !journal &&
    !namePrompt &&
    !counselOffer &&
    !feedback &&
    !pendingEpisodeCompletion;
  const overlayLockMode = !anyOverlayOpen ? 'unlocked' : onlyChatOpen ? 'chat-only' : 'locked';

  // Matikan keyboard Phaser (WASD/panah/dll) selama overlay terbuka,
  // supaya input formulir tidak ikut menggerakkan karakter.
  useEffect(() => {
    if (overlayLockMode !== 'unlocked') {
      window.__nawasenadaraInput?.disableGameKeyboard();
      window.__nawasenadaraInput?.lockGameButtons?.({
        keepChatButton: overlayLockMode === 'chat-only',
      });
    } else {
      window.__nawasenadaraInput?.enableGameKeyboard();
      window.__nawasenadaraInput?.unlockGameButtons?.();
    }
  }, [overlayLockMode]);

  // FIX: hanya dipanggil kalau journal.allowSkip true (lihat tombol
  // "Lewati" di render, dan allowSkip di BasePlayerScene.finishEpisode)
  // — episode ini SUDAH PERNAH dituntaskan sebelumnya, jadi tidak perlu
  // memaksa isi jurnal ulang. TIDAK memanggil analyzeReflection sama
  // sekali (tidak ada teks baru untuk dianalisis), langsung resolve
  // dengan hasil netral supaya alur pindah scene di finishEpisode()
  // lanjut seperti biasa tanpa memicu ajakan konseling.
  const skipJournal = () => {
    if (!journal) return;
    journal.resolve({ risk_level: 'rendah', suggest_counseling: false, skipped: true });
    setJournal(null);
    setJournalText('');
  };

  const submitJournal = async () => {
    const nlp = window.__nawasenadaraNlp;
    if (!nlp || !journal) return;
    const text = journalText.trim();
    if (!text) return;

    setJournalSubmitting(true);
    try {
      const result = await nlp.analyzeReflection({ text, episodeId: journal.episodeId });
      if (result?.label) setMood(result.label, result.confidence);
      if (result?.suggest_counseling) {
        // Tampilkan ajakan halus SEBENTAR sebelum benar-benar menutup
        // overlay & lanjut ke episode berikutnya — sesuai desain: TIDAK
        // memaksa membuka chatbot otomatis untuk sumber 'reflection'.
        setJournalResultNote(result);
      } else {
        journal.resolve(result);
        setJournal(null);
      }
    } catch (err) {
      console.warn('Gagal mengirim jurnal refleksi:', err);
      // Tetap lanjutkan alur game walau analisis gagal (jangan sampai
      // siswa terjebak tidak bisa lanjut episode gara-gara error
      // jaringan) — anggap seperti risk_level rendah.
      journal.resolve({ risk_level: 'rendah', suggest_counseling: false });
      setJournal(null);
    } finally {
      setJournalSubmitting(false);
    }
  };

  const dismissJournalNote = (openCounseling) => {
    const result = journalResultNote;
    setJournalResultNote(null);
    if (journal) {
      journal.resolve(result);
      setJournal(null);
    }
    if (openCounseling) {
      openChatbot({ triggerSource: 'reflection_flag', episodeId: journal?.episodeId });
    }
  };

  const sendChatMessage = async () => {
    const nlp = window.__nawasenadaraNlp;
    const text = chatInput.trim();
    if (!nlp || !chat || !text) return;

    setChatMessages((prev) => [...prev, { role: 'user', content: text }]);
    setChatInput('');
    setChatSending(true);
    try {
      const result = await nlp.sendCounselingMessage({
        text,
        sessionId: chat.sessionId,
        triggerSource: chat.triggerSource,
        episodeId: chat.episodeId,
      });
      setChat((prev) => (prev ? { ...prev, sessionId: result.session_id } : prev));
      setChatMessages((prev) => [...prev, { role: 'assistant', content: result.reply }]);
      if (result?.emotion_detected) setMood(result.emotion_detected, result.emotion_confidence);
    } catch (err) {
      console.warn('Gagal mengirim pesan konseling:', err);
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Maaf, sepertinya ada gangguan koneksi. Coba kirim lagi sebentar lagi, ya.',
        },
      ]);
    } finally {
      setChatSending(false);
    }
  };

  return (
    <>
      {feedback ? (
        <div style={styles.overlay}>
          <div
            style={{ ...styles.journalCard, ...styles.feedbackCard }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="game-feedback-title"
          >
            {feedbackSubmitted ? (
              <>
                <h2 id="game-feedback-title" style={styles.title}>
                  Terima kasih atas masukannya!
                </h2>
                <p style={styles.bodyText}>
                  Masukanmu sudah tersimpan dan akan membantu kami membuat Nawasena Dara lebih
                  nyaman, jelas, dan bermanfaat untuk dimainkan.
                </p>
                <div style={styles.actionRow}>
                  <button
                    type="button"
                    style={styles.primaryBtn}
                    onClick={() => closeFeedback(true)}
                  >
                    Kembali ke Menu
                  </button>
                </div>
              </>
            ) : (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void submitFeedback();
                }}
              >
                <h2 id="game-feedback-title" style={styles.title}>
                  Beri Masukan untuk Game
                </h2>
                <p style={styles.bodyText}>
                  Ceritakan pengalamanmu agar game ini semakin mudah dipahami dan nyaman dimainkan.
                </p>

                <fieldset style={styles.ratingFieldset}>
                  <legend style={styles.fieldLabel}>Rating pengalaman bermain</legend>
                  <div style={styles.ratingRow}>
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        type="button"
                        style={{
                          ...styles.ratingBtn,
                          ...(feedbackRating === rating ? styles.ratingBtnActive : {}),
                        }}
                        aria-label={`${rating} dari 5`}
                        aria-pressed={feedbackRating === rating}
                        disabled={feedbackSubmitting}
                        onClick={() => {
                          setFeedbackRating(rating);
                          setFeedbackError(null);
                        }}
                      >
                        {rating}
                      </button>
                    ))}
                  </div>
                  <div style={styles.ratingHint}>
                    <span>1 = Perlu banyak perbaikan</span>
                    <span>5 = Sangat baik</span>
                  </div>
                </fieldset>

                <label htmlFor="game-feedback-message" style={styles.fieldLabel}>
                  Masukan atau saran
                </label>
                <textarea
                  id="game-feedback-message"
                  style={{ ...styles.textarea, ...styles.feedbackTextarea }}
                  value={feedbackMessage}
                  maxLength={1000}
                  disabled={feedbackSubmitting}
                  placeholder="Contoh: teks tujuan episode masih sulit dibaca..."
                  onChange={(event) => {
                    setFeedbackMessage(event.target.value);
                    setFeedbackError(null);
                  }}
                  onKeyDown={(event) => event.stopPropagation()}
                />
                <div style={styles.feedbackMetaRow}>
                  <span>Jangan tulis nama lengkap, nomor telepon, atau data pribadi.</span>
                  <span>{feedbackMessage.length}/1000</span>
                </div>

                {feedbackError ? (
                  <p style={styles.errorText} role="alert">
                    {feedbackError}
                  </p>
                ) : null}

                <div style={styles.actionRow}>
                  <button
                    type="button"
                    style={styles.secondaryBtn}
                    disabled={feedbackSubmitting}
                    onClick={() => closeFeedback(false)}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    style={styles.primaryBtn}
                    disabled={
                      feedbackSubmitting ||
                      feedbackRating < 1 ||
                      feedbackMessage.trim().length < 3
                    }
                  >
                    {feedbackSubmitting ? 'Mengirim…' : 'Kirim Masukan'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}

      {counselOffer ? (
        <div style={styles.overlay}>
          <div style={styles.journalCard}>
            <h2 style={styles.title}>
              {counselOffer.npcName ? `Habis ngobrol sama ${counselOffer.npcName}...` : 'Sebelum lanjut...'}
            </h2>
            <p style={styles.bodyText}>
              Kalau ada yang masih mengganjal di pikiran atau perasaan setelah kejadian tadi, Kak
              Dara siap dengar cerita kamu kapan saja. Mau ngobrol dulu, atau lanjut main dulu?
            </p>
            <div style={styles.actionRow}>
              <button type="button" style={styles.secondaryBtn} onClick={dismissCounselOffer}>
                Lanjut Main
              </button>
              <button type="button" style={styles.primaryBtn} onClick={chooseCounseling}>
                Ngobrol dengan Kak Dara
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {namePrompt ? (
        <div style={styles.overlay}>
          <div style={styles.journalCard}>
            <h2 style={styles.title}>Siapa namamu di cerita ini?</h2>
            <p style={styles.bodyText}>
              Ini nama tokoh utama yang akan dipanggil sepanjang cerita — boleh nama asli, boleh
              nama panggilan lain. Bisa diganti lagi nanti kalau kamu mau.
            </p>
            <input
              type="text"
              style={styles.textInput}
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !nameSubmitting) submitCharacterName();
              }}
              placeholder="Nama tokohmu…"
              maxLength={50}
              disabled={nameSubmitting}
              autoFocus
            />
            {nameError ? <p style={styles.errorText}>{nameError}</p> : null}
            <div style={styles.actionRow}>
              <button
                type="button"
                style={styles.primaryBtn}
                disabled={nameSubmitting || !nameInput.trim()}
                onClick={submitCharacterName}
              >
                {nameSubmitting ? 'Menyimpan…' : 'Mulai Petualangan'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {journal ? (
        <div style={styles.overlay}>
          <div style={styles.journalCard}>
            {journalResultNote ? (
              <>
                <h2 style={styles.title}>Sepertinya kamu sedang tidak baik-baik saja</h2>
                <p style={styles.bodyText}>
                  Boleh kok kalau kamu belum mau cerita lebih lanjut. Tapi kalau kamu ingin, Kak
                  Dara selalu ada untuk diajak bicara — kapan pun kamu siap.
                </p>
                <div style={styles.actionRow}>
                  <button
                    type="button"
                    style={styles.secondaryBtn}
                    onClick={() => dismissJournalNote(false)}
                  >
                    Lanjut Main Dulu
                  </button>
                  <button
                    type="button"
                    style={styles.primaryBtn}
                    onClick={() => dismissJournalNote(true)}
                  >
                    Ngobrol dengan Kak Dara
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 style={styles.title}>Jurnal Refleksi</h2>
                <p style={styles.bodyText}>
                  Sebelum lanjut ke episode berikutnya, tuliskan sejenak apa yang kamu rasakan
                  atau pikirkan setelah kejadian barusan. Tidak ada jawaban benar atau salah.
                </p>
                <textarea
                  style={styles.textarea}
                  value={journalText}
                  onChange={(e) => setJournalText(e.target.value)}
                  placeholder="Tulis di sini…"
                  disabled={journalSubmitting}
                  autoFocus
                />
                <div style={styles.actionRow}>
                  {journal.allowSkip ? (
                    <button
                      type="button"
                      style={styles.secondaryBtn}
                      disabled={journalSubmitting}
                      onClick={skipJournal}
                    >
                      Lewati
                    </button>
                  ) : null}
                  <button
                    type="button"
                    style={styles.primaryBtn}
                    disabled={journalSubmitting || !journalText.trim()}
                    onClick={submitJournal}
                  >
                    {journalSubmitting ? 'Mengirim…' : 'Selesai & Lanjutkan'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}

      <style>{`
        @keyframes nawasenadaraTypingDot {
          0%, 60%, 100% { opacity: 0.3; transform: translateY(0); }
          30% { opacity: 1; transform: translateY(-3px); }
        }
        /* FIX: jendela chat SEBELUMNYA dianchor dari bottom dengan
           tinggi tetap (460px) / persentase viewport (72vh) — di layar
           pendek (mis. HP landscape saat main) itu bisa membuat tepi
           ATAS jendela naik sampai menimpa HUD profil di pojok kiri
           atas. Makanya overlay-nya di-anchor dari top:50% (persis
           tengah layar) SAMPAI bottom, dan kartu di dalamnya mengisi
           penuh area itu (height:100%, dibatasi max-height) — jadi
           tepi atas jendela dijamin TIDAK PERNAH naik melewati tengah
           layar, di ukuran layar berapa pun (posisi vertikal TETAP di
           tengah/mid, tidak diubah lagi).
           FIX (permintaan ini): horizontalnya dulu nempel ke kanan layar
           (kanan layar), jadi visualnya berat sebelah / "ke tengah"
           dibanding HUD profil yang ada di pojok KIRI atas. Sekarang
           dipindah ke sisi kiri — sejajar satu kolom vertikal yang sama
           dengan HUD profil — supaya kedua elemen UI (profil & chat)
           konsisten nempel di sisi kiri. */
        .nawasenadaraChatOverlay {
          position: fixed;
          left: 16px;
          top: 50%;
          bottom: 16px;
          z-index: 200;
          display: flex;
          align-items: stretch;
          justify-content: flex-start;
          transition: left 0.2s ease, top 0.2s ease, bottom 0.2s ease, right 0.2s ease;
        }
        .nawasenadaraChatCard {
          width: 340px;
          max-width: calc(100vw - 32px);
          height: 100%;
          max-height: 460px;
          background: #1a1a2e;
          border: 2px solid rgba(255, 221, 87, 0.4);
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          font-family: 'Pixelify Sans', monospace;
          box-shadow: 0 12px 30px rgba(0,0,0,0.5);
          transition: width 0.2s ease, height 0.2s ease, max-width 0.2s ease, max-height 0.2s ease, border-radius 0.2s ease;
        }
        /* Maximize ala jendela desktop — kartu chat mengisi (hampir)
           seluruh layar, dipicu tombol ⛶ di header. Diminta khusus
           untuk antisipasi layar HP kecil, tapi berlaku juga di
           desktop. */
        .nawasenadaraChatOverlay--maximized {
          left: 12px;
          right: 12px;
          top: 12px;
          bottom: 12px;
        }
        .nawasenadaraChatOverlay--maximized .nawasenadaraChatCard {
          width: 100%;
          max-width: 100%;
          height: 100%;
          max-height: none;
          border-radius: 16px;
          margin: 0 auto;
        }
        @media (max-width: 520px) {
          .nawasenadaraChatOverlay {
            right: 0;
            left: 0;
            top: 50%;
            bottom: 0;
          }
          .nawasenadaraChatCard {
            width: 100%;
            max-width: 100%;
            height: 100%;
            max-height: none;
            border-radius: 18px 18px 0 0;
            border-bottom: none;
            margin: 0 auto;
          }
          /* Di HP, maximize dibuat memenuhi layar TOTAL (bukan cuma
             margin kecil seperti desktop) — paling berguna justru di
             sini, layar kecil dapat ruang ketik maksimal. */
          .nawasenadaraChatOverlay--maximized {
            left: 0;
            right: 0;
            top: 0;
            bottom: 0;
          }
          .nawasenadaraChatOverlay--maximized .nawasenadaraChatCard {
            border-radius: 0;
          }
        }
      `}</style>

      {chat?.open ? (
        <div
          className={`nawasenadaraChatOverlay${chatMaximized ? ' nawasenadaraChatOverlay--maximized' : ''}`}
          // FIX: sebelumnya jendela chat bisa ketutup separuh oleh
          // keyboard virtual HP saat kotak ketik di-fokus (posisi
          // `bottom` dihitung dari innerHeight yang TIDAK berubah
          // walau keyboard muncul). `keyboardInset` (dari
          // window.visualViewport, lihat useEffect di atas) dipakai
          // untuk mengangkat jendela persis setinggi keyboard yang
          // menutupi layar.
          style={keyboardInset > 0 ? { bottom: keyboardInset + 16 } : undefined}
        >
          <div className="nawasenadaraChatCard">
            <div style={styles.chatHeader}>
              <span style={styles.chatHeaderTitle}>💬 Kak Dara — Konseling</span>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <button
                  type="button"
                  style={styles.closeBtn}
                  onClick={() => setChatMaximized((v) => !v)}
                  aria-label={chatMaximized ? 'Kecilkan jendela chat' : 'Perbesar jendela chat'}
                  title={chatMaximized ? 'Kecilkan' : 'Perbesar'}
                >
                  {chatMaximized ? '❐' : '⛶'}
                </button>
                {!pendingEpisodeCompletion ? (
                  <button
                    type="button"
                    style={styles.closeBtn}
                    onClick={closeChatbot}
                    aria-label="Tutup chat"
                  >
                    ✕
                  </button>
                ) : null}
              </div>
            </div>
            <div style={styles.chatMessages} ref={chatScrollRef}>
              {chatMessages.length === 0 ? (
                <p style={styles.chatEmpty}>
                  Halo, aku Kak Dara. Cerita apa saja yang kamu rasakan, aku dengarkan kok.
                </p>
              ) : (
                chatMessages.map((m, i) => (
                  <div
                    key={i}
                    style={m.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant}
                  >
                    {m.content}
                  </div>
                ))
              )}
              {chatSending ? (
                <div style={styles.bubbleAssistant} aria-label="Kak Dara sedang mengetik">
                  <span style={styles.typingDot} />
                  <span style={{ ...styles.typingDot, animationDelay: '0.15s' }} />
                  <span style={{ ...styles.typingDot, animationDelay: '0.3s' }} />
                </div>
              ) : null}
            </div>
            <div style={styles.chatInputRow}>
              <input
                type="text"
                style={styles.chatInput}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  e.stopPropagation();

                  if (e.key === 'Enter' && !chatSending) {
                    e.preventDefault();
                    sendChatMessage();
                  }
                }}
                placeholder="Ketik pesan…"
                disabled={chatSending}
              />
              <button
                type="button"
                style={styles.sendBtn}
                onClick={sendChatMessage}
                disabled={chatSending || !chatInput.trim()}
              >
                Kirim
              </button>
            </div>
            {pendingEpisodeCompletion ? (
              <div style={styles.chatContinueRow}>
                <button
                  type="button"
                  style={styles.episodeContinueBtn}
                  onClick={continueToNextEpisode}
                >
                  Lanjut ke Episode Selanjutnya
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(5, 5, 15, 0.75)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
    padding: 16,
  },
  journalCard: {
    width: '100%',
    maxWidth: 440,
    background: '#1a1a2e',
    border: '2px solid rgba(255, 221, 87, 0.4)',
    borderRadius: 14,
    padding: 20,
    fontFamily: "'Pixelify Sans', monospace",
    color: '#fff',
    boxSizing: 'border-box',
  },
  feedbackCard: {
    maxWidth: 560,
    maxHeight: 'calc(100dvh - 32px)',
    overflowY: 'auto',
  },
  title: { fontFamily: "'Jersey 15', monospace", color: '#ffdd57', fontSize: 23, margin: '0 0 8px' },
  bodyText: { fontSize: 16, lineHeight: 1.6, color: '#ddd', margin: '0 0 14px' },
  fieldLabel: {
    display: 'block',
    color: '#fff',
    fontSize: 17,
    fontWeight: 700,
    marginBottom: 8,
  },
  ratingFieldset: {
    border: 0,
    padding: 0,
    margin: '0 0 18px',
  },
  ratingRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, minmax(42px, 1fr))',
    gap: 8,
  },
  ratingBtn: {
    minHeight: 46,
    background: '#0f0f22',
    color: '#fff',
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: '#555',
    borderRadius: 9,
    fontFamily: 'inherit',
    fontSize: 19,
    fontWeight: 700,
    cursor: 'pointer',
  },
  ratingBtnActive: {
    background: '#ffdd57',
    borderColor: '#ffdd57',
    color: '#1a1a2e',
  },
  ratingHint: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    color: '#b8bfd0',
    fontSize: 13,
    lineHeight: 1.35,
    marginTop: 7,
  },
  textarea: {
    width: '100%',
    minHeight: 110,
    background: '#0f0f22',
    border: '1px solid #444',
    borderRadius: 8,
    color: '#fff',
    padding: 10,
    fontSize: 16,
    fontFamily: 'inherit',
    resize: 'vertical',
    boxSizing: 'border-box',
  },
  feedbackTextarea: {
    minHeight: 130,
    fontSize: 17,
    lineHeight: 1.5,
  },
  feedbackMetaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    color: '#b8bfd0',
    fontSize: 13,
    lineHeight: 1.35,
    marginTop: 6,
  },
  textInput: {
    width: '100%',
    background: '#0f0f22',
    border: '1px solid #444',
    borderRadius: 8,
    color: '#fff',
    padding: '10px 12px',
    fontSize: 16,
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  errorText: { color: '#ff8080', fontSize: 15, margin: '8px 0 0' },
  actionRow: { display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 14 },
  primaryBtn: {
    background: '#ffdd57',
    color: '#1a1a2e',
    border: 'none',
    borderRadius: 8,
    padding: '10px 18px',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: 16,
  },
  secondaryBtn: {
    background: 'transparent',
    color: '#fff',
    border: '1px solid #555',
    borderRadius: 8,
    padding: '10px 18px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: 16,
  },
  chatHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 14px',
    background: '#243b55',
    color: '#fff',
  },
  chatHeaderTitle: { fontSize: 16, fontWeight: 600 },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: '#fff',
    fontSize: 18,
    cursor: 'pointer',
    lineHeight: 1,
  },
  chatMessages: {
    flex: 1,
    overflowY: 'auto',
    padding: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  chatEmpty: { color: '#999', fontSize: 15, textAlign: 'center', marginTop: 20 },
  bubbleUser: {
    alignSelf: 'flex-end',
    background: '#ffdd57',
    color: '#1a1a2e',
    padding: '8px 12px',
    borderRadius: '12px 12px 2px 12px',
    fontSize: 15,
    maxWidth: '80%',
  },
  bubbleAssistant: {
    alignSelf: 'flex-start',
    background: '#2a3f54',
    color: '#fff',
    padding: '8px 12px',
    borderRadius: '12px 12px 12px 2px',
    fontSize: 15,
    maxWidth: '80%',
    display: 'flex',
  },
  typingDot: {
    width: 6,
    height: 6,
    margin: '0 2px',
    borderRadius: '50%',
    background: '#ffffff',
    display: 'inline-block',
    animation: 'nawasenadaraTypingDot 1s infinite ease-in-out',
  },
  chatInputRow: {
    display: 'flex',
    gap: 8,
    padding: 10,
    borderTop: '1px solid rgba(255,255,255,0.08)',
  },
  chatContinueRow: {
    padding: '0 10px 10px',
  },
  episodeContinueBtn: {
    width: '100%',
    background: '#ffdd57',
    color: '#1a1a2e',
    border: 'none',
    borderRadius: 8,
    padding: '10px 14px',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: 15,
  },
  chatInput: {
    flex: 1,
    background: '#0f0f22',
    border: '1px solid #444',
    borderRadius: 8,
    color: '#fff',
    padding: '8px 10px',
    fontSize: 15,
    fontFamily: 'inherit',
  },
  sendBtn: {
    background: '#ffdd57',
    color: '#1a1a2e',
    border: 'none',
    borderRadius: 8,
    padding: '8px 14px',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: 15,
  },
};
