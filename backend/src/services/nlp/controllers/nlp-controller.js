import NlpClient, { NlpServiceError } from '../client.js';
import NlpRepositories from '../repositories/nlp-repositories.js';
import { success } from '../../../utils/response.js';
import NotFoundError from '../../../exceptions/not-found-error.js';

const snippet = (text, max = 160) =>
  text.length > max ? `${text.slice(0, max)}…` : text;

// POST /api/nlp/analyze
// Dipanggil frontend SETELAH pemain mengisi jurnal refleksi singkat di
// akhir SETIAP episode (episode 1-9) — lihat proposal Gambar 3.2 &
// NLP_INTEGRATION_DESIGN.md. Endpoint ini SATU ARAH (bukan
// percakapan): analisis teks -> simpan -> kembalikan label + rekomendasi
// apakah perlu menampilkan ajakan halus ke chatbot konseling.
export const analyzeReflection = async (req, res, next) => {
  try {
    const { text, episode_id: episodeId } = req.validated;
    const userId = req.user.id;

    const { label, confidence, scores, riskLevel } = await NlpClient.analyze(text);

    const row = await NlpRepositories.insertSentimentAnalysis({
      userId,
      episodeId,
      source: 'reflection',
      inputText: text,
      label,
      confidence,
      scores,
      riskLevel,
    });

    if (riskLevel !== 'rendah') {
      await NlpRepositories.insertRiskAlert({
        userId,
        sourceType: 'sentiment_analysis',
        sourceId: row.id,
        episodeId,
        riskLevel,
        snippet: snippet(text),
      });
    }

    return success(res, {
      label,
      confidence,
      risk_level: riskLevel,
      // Frontend memakai flag ini untuk menampilkan (atau tidak)
      // ajakan halus "Sepertinya kamu sedang tidak baik-baik saja,
      // ingin ngobrol dengan Kak Dara?" — TIDAK memaksa membuka
      // chatbot secara otomatis untuk sumber 'reflection' (beda dari
      // trigger_source 'episode7_phone' yang memang didesain auto-
      // muncul, lihat design doc).
      suggest_counseling: riskLevel !== 'rendah',
    });
  } catch (err) {
    if (err instanceof NlpServiceError) {
      return next(Object.assign(err, { statusCode: err.statusCode }));
    }
    next(err);
  }
};

// POST /api/nlp/counseling
// Satu giliran chat di Chatbot Konseling Virtual. Menyimpan pesan
// siswa + balasan "Kak Dara" ke counseling_messages, meneruskan
// history percakapan (dari DB, bukan dipercaya mentah dari client) ke
// nlp-service supaya konteks multi-turn tetap konsisten & tidak bisa
// dipalsukan lewat body request.
export const counselingChat = async (req, res, next) => {
  try {
    const {
      text,
      session_id: sessionIdInput,
      trigger_source: triggerSource,
      episode_id: episodeId,
    } = req.validated;
    const userId = req.user.id;

    let session;
    if (sessionIdInput) {
      session = await NlpRepositories.getSessionForUser({
        sessionId: sessionIdInput,
        userId,
      });
      if (!session) {
        return next(new NotFoundError('Sesi konseling tidak ditemukan.'));
      }
    } else {
      session = await NlpRepositories.getOrCreateActiveSession({
        userId,
        triggerSource,
        episodeId,
      });
    }

    const historyRows = await NlpRepositories.getSessionMessages(session.id);
    const history = historyRows.map((row) => ({ role: row.role, content: row.content }));

    const { reply, emotionLabel, emotionConfidence, riskLevel, escalated } =
      await NlpClient.counselingChat({
        text,
        history,
        userName: req.user.name,
      });

    const userMessage = await NlpRepositories.insertUserMessage({
      sessionId: session.id,
      content: text,
      emotionLabel,
      emotionConfidence,
      riskLevel,
      escalated,
    });
    await NlpRepositories.insertAssistantMessage({ sessionId: session.id, content: reply });
    await NlpRepositories.bumpSessionRisk({ sessionId: session.id, riskLevel, escalated });

    // Log juga ke sentiment_analyses (source='counseling') supaya
    // tren emosi di dashboard guru BK mencakup SEMUA sumber teks
    // pemain, bukan cuma jurnal refleksi.
    await NlpRepositories.insertSentimentAnalysis({
      userId,
      episodeId: session.episode_id,
      source: 'counseling',
      inputText: text,
      label: emotionLabel,
      confidence: emotionConfidence,
      scores: {},
      riskLevel,
    });

    if (escalated || riskLevel === 'tinggi') {
      await NlpRepositories.insertRiskAlert({
        userId,
        sourceType: 'counseling_message',
        sourceId: userMessage.id,
        episodeId: session.episode_id,
        riskLevel,
        snippet: snippet(text),
      });
    }

    return success(res, {
      session_id: session.id,
      reply,
      emotion_detected: emotionLabel,
      emotion_confidence: emotionConfidence,
      risk_level: riskLevel,
      escalated,
    });
  } catch (err) {
    if (err instanceof NlpServiceError) {
      return next(Object.assign(err, { statusCode: err.statusCode }));
    }
    next(err);
  }
};

// POST /api/nlp/npc-dialogue
// Menulis ULANG (parafrase) satu baris dialog NPC yang sudah diplot
// naskah episode — dipanggil DialogueBox.js (lewat
// window.__nawasenadaraNlp.generateNpcLine) tiap kali sebuah node
// ber-`dynamic: true` dirender, supaya redaksinya bervariasi tanpa
// mengubah plot/keputusan cerita. TIDAK menyimpan apa pun ke DB (beda
// dari counselingChat/analyzeReflection) — ini murni bantuan
// penulisan ulang teks, bukan interaksi yang perlu diaudit/dianalisis.
export const generateNpcDialogueLine = async (req, res, next) => {
  try {
    const {
      npc_name: npcName,
      plotted_line: plottedLine,
      situation,
      player_choice_label: playerChoiceLabel,
    } = req.validated;

    const { line } = await NlpClient.generateNpcLine({
      npcName,
      plottedLine,
      situation,
      playerChoiceLabel,
    });

    return success(res, { line });
  } catch (err) {
    if (err instanceof NlpServiceError) {
      return next(Object.assign(err, { statusCode: err.statusCode }));
    }
    next(err);
  }
};

// GET /api/nlp/counseling/active
// Dipanggil saat chatbot BARU DIBUKA (sebelum pemain kirim pesan apa
// pun) — mengembalikan sesi + riwayat pesan TERAKHIR pemain ini kalau
// masih dalam window idle 30 menit, supaya histori percakapan tidak
// hilang begitu saja setiap kali jendela chat dibuka ulang (mis.
// setelah keluar-masuk game). Kalau tidak ada sesi aktif, session_id
// null & messages kosong — frontend menampilkan sapaan awal seperti
// biasa.
export const getActiveSession = async (req, res, next) => {
  try {
    const session = await NlpRepositories.getActiveSessionForUser({ userId: req.user.id });
    if (!session) {
      return success(res, { session_id: null, messages: [] });
    }
    const messages = await NlpRepositories.getSessionMessages(session.id, 200);
    return success(res, { session_id: session.id, messages });
  } catch (err) {
    next(err);
  }
};

// GET /api/nlp/counseling/:sessionId/messages
// Dipakai frontend untuk memuat ulang riwayat percakapan (mis. kalau
// pemain menutup lalu membuka lagi jendela chatbot).
export const getCounselingHistory = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const session = await NlpRepositories.getSessionForUser({
      sessionId,
      userId: req.user.id,
    });
    if (!session) {
      return next(new NotFoundError('Sesi konseling tidak ditemukan.'));
    }

    const messages = await NlpRepositories.getSessionMessages(sessionId, 200);
    return success(res, { session_id: session.id, messages });
  } catch (err) {
    next(err);
  }
};

// GET /api/nlp/counseling/should-auto-open?episode_id=7
// Dipanggil Episode7Scene saat memuat scene telepon — mengembalikan
// true kalau pemain punya riwayat risk_level 'tinggi' dalam 72 jam
// terakhir, supaya chatbot bisa auto-muncul sebagai NPC telepon (lihat
// NLP_INTEGRATION_DESIGN.md, trigger_source='episode7_phone').
export const shouldAutoOpenCounseling = async (req, res, next) => {
  try {
    const hasRisk = await NlpRepositories.hasRecentHighRisk({ userId: req.user.id });
    return success(res, { should_auto_open: hasRisk });
  } catch (err) {
    next(err);
  }
};
