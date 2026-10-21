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
    let loadedActiveMessages = [];
    if (nlp?.getActiveSession) {
      try {
        const active = await nlp.getActiveSession();
        if (active?.session_id && active.messages?.length) {
          hasHistory = true;
          loadedSessionId = active.session_id;
          loadedActiveMessages = active.messages.map((m) => ({ role: m.role, content: m.content }));
          setChat((current) =>
            current?.open
              ? { ...current, sessionId: active.session_id, episodeId, triggerSource }
              : current,
          );
          setChatMessages(loadedActiveMessages);
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
            'Halo, aku Kak Dara. Aku dengar kamu lagi butuh teman cerita - aku di sini, ceritakan saja apa yang kamu rasakan.',
        },
      ]);
      return;
    }

    // Kak Dara "sudah tahu" isi obrolan pemain atau hasil jurnal episode ini —
    // jika autoContext belum pernah dikirim dalam riwayat sesi aktif, kirimkan
    // secara otomatis agar pemain tidak perlu mengetik ulang dari nol dan
    // Kak Dara langsung merespons secara empatik dan kontekstual.
    // Jika ringkasan ini sudah pernah dikirim sebelumnya (mis. pemain menutup
    // lalu membuka lagi jendela chat pada episode yang sama), lewati agar tidak dobel.
    const contextAlreadySent = hasHistory && loadedActiveMessages.some((m) => m.content === autoContext);
    const shouldSendAutoContext = autoContext && (!hasHistory || !contextAlreadySent);

    if (shouldSendAutoContext) {
      setChatMessages((prev) => [...prev, { role: 'user', content: autoContext }]);
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
              'Halo, aku Kak Dara. Sepertinya ada gangguan koneksi barusan - boleh cerita ulang apa yang baru saja terjadi?',
          },
        ]);
      } finally {
        setChatSending(false);
      }
    }
  }, []);

  const continueToNextEpisode = useCallback(() => {
    const pending = pendingEpisodeCompletionRef.current;
    if (!pending) return;

    pendingEpisodeCompletionRef.current = null;
    setPendingEpisodeCompletion(null);
    setChat(null);
    setChatMessages([]);
    setChatInput('');
    setChatMaximized(false);
    pending.resolve(true);
  }, []);

  const closeChatbot = useCallback(() => {
    // Bila obrolan Kak Dara terbuka saat penutupan episode, menutup chat
    // secara aman juga menyelesaikan penutupan dan lanjut ke episode berikutnya
    if (pendingEpisodeCompletionRef.current) {
      continueToNextEpisode();
      return;
    }
    setChat(null);
    setChatMessages([]);
    setChatInput('');
    setChatMaximized(false);
  }, [continueToNextEpisode]);

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


  useEffect(() => {
    chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight });
  }, [chatMessages]);

  // Deteksi keyboard virtual HP terbuka lewat window.visualViewport —
  // API browser yang melaporkan ukuran viewport yang BENAR-BENAR
  // terlihat (di luar area yang ketutup keyboard), beda dari
  // window.innerHeight yang tidak berubah sama sekali saat keyboard
  // muncul. Selisihnya dipakai untuk mengangkat jendela chat & form jurnal
  // ke atas supaya kotak ketik & tombol kirim tidak ketutup keyboard.
  useEffect(() => {
    if (!chat?.open && !journal) return undefined;
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
  }, [chat?.open, Boolean(journal)]);

  // Satu status primitif menjaga dependency useEffect tetap berukuran
  // tetap ketika jenis overlay bertambah. Ini juga menghindari warning
  // React Fast Refresh "dependency array changed size" saat form baru
  // ditambahkan pada sesi development yang masih berjalan.
  const anyOverlayOpen =
    Boolean(journal) ||
    Boolean(journalResultNote) ||
    Boolean(chat?.open) ||
    Boolean(namePrompt) ||
    Boolean(counselOffer) ||
    Boolean(feedback);
  const onlyChatOpen =
    Boolean(chat?.open) &&
    !journal &&
    !journalResultNote &&
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
    const activeJournal = journal;
    const userReflection = journalText.trim();
    setJournalResultNote(null);
    setJournal(null);
    setJournalText('');

    if (openCounseling) {
      // TAHAN penyelesaian episode: simpan resolver di pendingEpisodeCompletionRef
      // agar Phaser scene TIDAK langsung berpindah ke episode selanjutnya di background!
      pendingEpisodeCompletionRef.current = {
        episodeId: activeJournal?.episodeId,
        resolve: () => activeJournal?.resolve(result),
      };
      setPendingEpisodeCompletion({ episodeId: activeJournal?.episodeId });

      const autoContext = userReflection
        ? `Aku baru saja menyelesaikan episode ${activeJournal?.episodeId ?? ''} dan curhat di jurnal refleksi: "${userReflection}". Aku butuh teman cerita dari Kak Dara.`
        : `Aku baru saja menyelesaikan episode ${activeJournal?.episodeId ?? ''} dan mengisi jurnal refleksi. Perasaanku sedang membutuhkan teman cerita dan dukungan emosional dari Kak Dara.`;

      openChatbot({
        triggerSource: 'reflection_flag',
        episodeId: activeJournal?.episodeId,
        autoContext,
      });
    } else {
      activeJournal?.resolve(result);
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

      {journalResultNote ? (
        <div style={styles.overlay}>
          <div style={styles.supportiveCard} role="dialog" aria-modal="true" aria-labelledby="supportive-dialog-title">
            <div style={styles.supportiveBadge}>
              <span style={{ fontSize: 18 }}>🌸</span>
              <span>Ruang Cerita Kak Dara</span>
            </div>
            <h2 id="supportive-dialog-title" style={styles.supportiveTitle}>
              Sepertinya Kamu Sedang Merasa Berat atau Prihatin
            </h2>
            <p style={styles.supportiveBody}>
              Dari tulisan refleksimu, tampaknya ada hal yang cukup mengganjal di perasaan atau pikiranmu setelah kejadian tadi.
              Kamu tidak harus menghadapinya sendirian. Kak Dara ada di sini untuk mendengarkan ceritamu dengan tenang, aman, dan tanpa menghakimi.
            </p>
            <div style={styles.actionRow}>
              <button
                type="button"
                style={styles.secondaryBtn}
                onClick={() => dismissJournalNote(false)}
              >
                Lewati & Lanjut Episode ➔
              </button>
              <button
                type="button"
                style={styles.supportivePrimaryBtn}
                onClick={() => dismissJournalNote(true)}
              >
                💬 Ngobrol Bareng Kak Dara
              </button>
            </div>
          </div>
        </div>
      ) : journal ? (
        <div
          style={{
            ...styles.overlay,
            ...(keyboardInset > 0
              ? {
                  alignItems: 'flex-start',
                  paddingTop: 10,
                  paddingBottom: keyboardInset + 16,
                }
              : {}),
          }}
        >
          <div
            style={{
              ...styles.journalCard,
              ...(keyboardInset > 0
                ? {
                    maxHeight: `calc(100dvh - ${keyboardInset + 28}px)`,
                  }
                : {}),
            }}
          >
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
              onFocus={(e) => {
                setTimeout(() => {
                  e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 220);
              }}
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
          </div>
        </div>
      ) : null}

      <style>{`
        @keyframes nawasenadaraTypingDot {
          0%, 60%, 100% { opacity: 0.35; transform: translateY(0); }
          30% { opacity: 1; transform: translateY(-4px); }
        }
        @keyframes nawasenadaraChatSlideIn {
          from { opacity: 0; transform: translateY(14px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .nawasenadaraChatOverlay {
          position: fixed;
          left: 20px;
          top: 96px;
          bottom: 20px;
          z-index: 200;
          display: flex;
          align-items: flex-end;
          justify-content: flex-start;
          transition: left 0.22s ease, top 0.22s ease, bottom 0.22s ease, right 0.22s ease;
        }
        .nawasenadaraChatCard {
          width: 430px;
          max-width: calc(100vw - 40px);
          height: 100%;
          max-height: 560px;
          background: linear-gradient(180deg, #171530 0%, #100e22 100%);
          border: 2.5px solid #ffdd57;
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          font-family: 'Pixelify Sans', monospace;
          box-shadow: 0 18px 48px rgba(0, 0, 0, 0.72), 0 0 28px rgba(255, 221, 87, 0.14);
          animation: nawasenadaraChatSlideIn 0.26s cubic-bezier(0.22, 1, 0.36, 1);
          transition: width 0.22s ease, height 0.22s ease, max-width 0.22s ease, max-height 0.22s ease, border-radius 0.22s ease;
        }
        .nawasenadaraChatOverlay--maximized {
          left: 16px;
          right: 16px;
          top: 16px;
          bottom: 16px;
        }
        .nawasenadaraChatOverlay--maximized .nawasenadaraChatCard {
          width: 100%;
          max-width: 820px;
          height: 100%;
          max-height: none;
          border-radius: 18px;
          margin: 0 auto;
        }
        .nawasenadaraQuickChip {
          background: rgba(255, 221, 87, 0.1);
          color: #ffdd57;
          border: 1.5px solid rgba(255, 221, 87, 0.45);
          border-radius: 999px;
          padding: 7px 14px;
          font-family: inherit;
          font-size: 16px;
          cursor: pointer;
          transition: background 0.15s ease, transform 0.15s ease, border-color 0.15s ease;
          text-align: left;
        }
        .nawasenadaraQuickChip:hover {
          background: rgba(255, 221, 87, 0.22);
          border-color: #ffdd57;
          transform: translateY(-1px);
        }
        @media (max-width: 560px) {
          .nawasenadaraChatOverlay {
            right: 0;
            left: 0;
            top: 12px;
            bottom: 0;
          }
          .nawasenadaraChatOverlay.hasKeyboard {
            top: 0 !important;
            bottom: 0 !important;
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
          className={`nawasenadaraChatOverlay${chatMaximized ? ' nawasenadaraChatOverlay--maximized' : ''}${keyboardInset > 0 ? ' hasKeyboard' : ''}`}
          style={keyboardInset > 0 ? { bottom: keyboardInset, top: 0 } : undefined}
        >
          <div className="nawasenadaraChatCard">
            <div style={styles.chatHeader}>
              <div style={styles.chatHeaderLeft}>
                <div style={styles.chatAvatarBadge} aria-hidden="true">
                  <svg viewBox="0 0 64 64" width="24" height="24" fill="none" stroke="#14122a" strokeWidth="4.5" strokeLinejoin="round" strokeLinecap="round">
                    <path d="M32 10c13.2 0 23 8.4 23 19.5S45.2 49 32 49c-2.5 0-4.9-.3-7.1-.9L13 55l3-11C11.6 40.3 9 35 9 29.5 9 18.4 18.8 10 32 10z" />
                  </svg>
                </div>
                <div>
                  <div style={styles.chatHeaderTitle}>Kak Dara</div>
                  <div style={styles.chatHeaderSubtitle}>Ruang Cerita & Konseling Aman</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  type="button"
                  style={styles.headerActionBtn}
                  onClick={() => setChatMaximized((v) => !v)}
                  aria-label={chatMaximized ? 'Kecilkan jendela chat' : 'Perbesar jendela chat'}
                  title={chatMaximized ? 'Kecilkan' : 'Perbesar'}
                >
                  {chatMaximized ? '❐' : '⛶'}
                </button>
                <button
                  type="button"
                  style={styles.headerActionBtn}
                  onClick={closeChatbot}
                  aria-label="Tutup chat"
                  title="Tutup chat"
                >
                  ✕
                </button>
              </div>
            </div>
            {pendingEpisodeCompletion ? (
              <div style={styles.chatPendingNotice}>
                Episode dijeda sementara. Selesai mengobrol, tekan tombol di bawah untuk melanjutkan cerita.
              </div>
            ) : null}
            <div style={styles.chatMessages} ref={chatScrollRef}>
              {chatMessages.length === 0 ? (
                <div style={styles.chatWelcomeBox}>
                  <div style={styles.bubbleAssistant}>
                    Halo! Aku Kak Dara. Di sini kamu bebas cerita apa saja yang sedang kamu rasakan. Tenang saja, ceritamu aman dan aku siap mendengarkan.
                  </div>
                  <div style={styles.quickChipGroup}>
                    {[
                      'Aku merasa nggak nyaman tadi',
                      'Gimana cara menolak dengan sopan?',
                      'Aku bingung harus cerita ke siapa',
                    ].map((promptText) => (
                      <button
                        key={promptText}
                        type="button"
                        className="nawasenadaraQuickChip"
                        onClick={() => setChatInput(promptText)}
                      >
                        {promptText}
                      </button>
                    ))}
                  </div>
                </div>
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
                <div style={styles.bubbleAssistantTyping} aria-label="Kak Dara sedang mengetik">
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
                onFocus={() => {
                  setTimeout(() => {
                    chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: 'smooth' });
                  }, 240);
                }}
                onKeyDown={(e) => {
                  e.stopPropagation();

                  if (e.key === 'Enter' && !chatSending) {
                    e.preventDefault();
                    sendChatMessage();
                  }
                }}
                placeholder="Tulis ceritamu ke Kak Dara…"
                disabled={chatSending}
              />
              <button
                type="button"
                style={{
                  ...styles.sendBtn,
                  opacity: chatSending || !chatInput.trim() ? 0.55 : 1,
                }}
                onClick={sendChatMessage}
                disabled={chatSending || !chatInput.trim()}
              >
                Kirim ▸
              </button>
            </div>
            {pendingEpisodeCompletion ? (
              <div style={styles.chatContinueRow}>
                <button
                  type="button"
                  style={styles.episodeContinueBtn}
                  onClick={continueToNextEpisode}
                >
                  Lanjut ke Episode Selanjutnya ➔
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
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
  },
  supportiveCard: {
    width: '100%',
    maxWidth: 480,
    background: '#1a1a2e',
    border: '2px solid rgba(255, 107, 107, 0.55)',
    borderRadius: 16,
    padding: '24px 22px',
    fontFamily: "'Pixelify Sans', monospace",
    color: '#fff',
    boxSizing: 'border-box',
    boxShadow: '0 16px 40px rgba(0, 0, 0, 0.6), 0 0 25px rgba(255, 107, 107, 0.15)',
  },
  supportiveBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    background: 'rgba(255, 107, 107, 0.15)',
    color: '#ff9494',
    border: '1px solid rgba(255, 107, 107, 0.35)',
    borderRadius: 20,
    padding: '4px 12px',
    fontSize: 14,
    fontWeight: 600,
    marginBottom: 14,
  },
  supportiveTitle: {
    fontFamily: "'Jersey 15', monospace",
    color: '#ffdd57',
    fontSize: 25,
    margin: '0 0 10px',
    lineHeight: 1.25,
  },
  supportiveBody: {
    fontSize: 16,
    lineHeight: 1.6,
    color: '#e2e8f0',
    margin: '0 0 20px',
  },
  supportivePrimaryBtn: {
    background: '#ff6b6b',
    color: '#ffffff',
    border: 'none',
    borderRadius: 8,
    padding: '10px 18px',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: 16,
    boxShadow: '0 4px 14px rgba(255, 107, 107, 0.4)',
  },
  chatPendingNotice: {
    padding: '10px 14px',
    background: 'rgba(255, 221, 87, 0.14)',
    color: '#ffdd57',
    fontSize: 16,
    borderBottom: '1px solid rgba(255, 221, 87, 0.28)',
    textAlign: 'center',
    lineHeight: 1.45,
  },
  journalCard: {
    width: '100%',
    maxWidth: 460,
    maxHeight: 'calc(100dvh - 32px)',
    overflowY: 'auto',
    background: '#1a1a2e',
    border: '2px solid rgba(255, 221, 87, 0.4)',
    borderRadius: 14,
    padding: 20,
    fontFamily: "'Pixelify Sans', monospace",
    color: '#fff',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 16px 40px rgba(0, 0, 0, 0.65), 0 0 25px rgba(255, 221, 87, 0.12)',
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
    minHeight: 100,
    background: '#0f0f22',
    border: '1px solid #444',
    borderRadius: 8,
    color: '#fff',
    padding: 12,
    fontSize: 16,
    fontFamily: 'inherit',
    resize: 'vertical',
    boxSizing: 'border-box',
    outline: 'none',
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
  actionRow: {
    display: 'flex',
    gap: 10,
    justifyContent: 'flex-end',
    marginTop: 14,
    flexWrap: 'wrap',
  },
  primaryBtn: {
    background: '#ffdd57',
    color: '#1a1a2e',
    border: 'none',
    borderRadius: 8,
    padding: '11px 18px',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: 16,
    minHeight: 44,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(255, 221, 87, 0.25)',
  },
  secondaryBtn: {
    background: 'transparent',
    color: '#fff',
    border: '1px solid #555',
    borderRadius: 8,
    padding: '11px 18px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: 16,
    minHeight: 44,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 16px',
    background: 'linear-gradient(90deg, #1d1a3b 0%, #15132b 100%)',
    borderBottom: '2px solid rgba(255, 221, 87, 0.35)',
    color: '#fff',
  },
  chatHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  chatAvatarBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    background: '#ffdd57',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 14px rgba(255, 221, 87, 0.35)',
    flexShrink: 0,
  },
  chatHeaderTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: '#ffdd57',
    lineHeight: 1.15,
  },
  chatHeaderSubtitle: {
    fontSize: 14,
    color: '#cbd5e1',
    marginTop: 2,
  },
  headerActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    background: 'rgba(255, 255, 255, 0.07)',
    border: '1.5px solid rgba(255, 221, 87, 0.4)',
    color: '#ffdd57',
    fontSize: 18,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
  },
  chatMessages: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  chatWelcomeBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  quickChipGroup: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 2,
  },
  bubbleUser: {
    alignSelf: 'flex-end',
    background: '#ffdd57',
    color: '#14122a',
    padding: '12px 16px',
    borderRadius: '14px 14px 4px 14px',
    fontSize: 18,
    fontWeight: 600,
    lineHeight: 1.5,
    maxWidth: '85%',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
    wordBreak: 'break-word',
  },
  bubbleAssistant: {
    alignSelf: 'flex-start',
    background: '#222042',
    border: '1.5px solid rgba(255, 221, 87, 0.35)',
    color: '#f8fafc',
    padding: '12px 16px',
    borderRadius: '14px 14px 14px 4px',
    fontSize: 18,
    lineHeight: 1.55,
    maxWidth: '88%',
    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.3)',
    wordBreak: 'break-word',
  },
  bubbleAssistantTyping: {
    alignSelf: 'flex-start',
    background: '#222042',
    border: '1.5px solid rgba(255, 221, 87, 0.35)',
    color: '#f8fafc',
    padding: '14px 18px',
    borderRadius: '14px 14px 14px 4px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
  },
  typingDot: {
    width: 8,
    height: 8,
    margin: '0 2px',
    borderRadius: '50%',
    background: '#ffdd57',
    display: 'inline-block',
    animation: 'nawasenadaraTypingDot 1s infinite ease-in-out',
  },
  chatInputRow: {
    display: 'flex',
    gap: 10,
    padding: '12px 14px',
    background: '#131126',
    borderTop: '1.5px solid rgba(255, 221, 87, 0.22)',
  },
  chatContinueRow: {
    padding: '0 14px 14px',
    background: '#131126',
  },
  episodeContinueBtn: {
    width: '100%',
    background: '#ffdd57',
    color: '#14122a',
    border: 'none',
    borderRadius: 10,
    padding: '12px 16px',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: 18,
  },
  chatInput: {
    flex: 1,
    background: '#0b0a18',
    border: '1.5px solid rgba(255, 221, 87, 0.45)',
    borderRadius: 10,
    color: '#ffffff',
    padding: '11px 14px',
    fontSize: 18,
    fontFamily: 'inherit',
    outline: 'none',
  },
  sendBtn: {
    background: '#ffdd57',
    color: '#14122a',
    border: 'none',
    borderRadius: 10,
    padding: '11px 18px',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: 18,
    flexShrink: 0,
  },
};
