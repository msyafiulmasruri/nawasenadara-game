"""
Integrasi Groq API untuk Nawasena Dara.

Mencakup dua kebutuhan berbeda:

1. Chatbot Konseling Virtual "Kak Dara"
   - Empatik
   - Suportif
   - Tidak menghakimi
   - Tidak menggantikan tenaga profesional

2. Dialog NPC dinamis tetapi tetap terplot
   - AI hanya melakukan parafrase
   - Tidak boleh mengubah plot
   - Tidak boleh menambah kejadian/fakta baru
   - Jika AI gagal, otomatis kembali ke dialog statis
"""

import logging
import re
from typing import Optional

from groq import Groq

from app.core.config import get_settings
from app.schemas import ChatMessage, EmotionLabel


logger = logging.getLogger("nawasenadara.groq_client")


# =========================================================
# HELPER
# =========================================================

def _is_gpt_oss(model: str) -> bool:
    """
    Mengecek apakah model yang digunakan merupakan GPT-OSS.

    GPT-OSS memiliki mekanisme reasoning sehingga konfigurasi request
    sedikit berbeda dibanding model chat biasa.
    """
    return model.startswith("openai/gpt-oss-")


def _safe_content(completion) -> str:
    """
    Mengambil message.content dengan aman.

    Pada reasoning model, content dapat bernilai None atau string kosong.
    Karena itu jangan langsung melakukan:

        message.content.strip()

    karena dapat menghasilkan error apabila content == None.
    """
    try:
        message = completion.choices[0].message
        content = getattr(message, "content", None)

        if not content:
            return ""

        return str(content).strip()

    except (AttributeError, IndexError, TypeError):
        return ""


def _log_empty_completion(
    completion,
    *,
    feature: str,
    model: str,
) -> None:
    """
    Debug ketika Groq memberikan HTTP 200 tetapi final content kosong.

    Reasoning-nya sendiri tidak ditulis ke log karena tidak diperlukan
    oleh aplikasi. Kita hanya mencatat apakah reasoning tersedia.
    """
    try:
        choice = completion.choices[0]
        message = choice.message

        finish_reason = getattr(choice, "finish_reason", None)
        reasoning = getattr(message, "reasoning", None)

        logger.warning(
            "Groq menghasilkan content kosong | "
            "feature=%s | model=%s | finish_reason=%s | "
            "reasoning_present=%s",
            feature,
            model,
            finish_reason,
            bool(reasoning),
        )

    except Exception:
        logger.warning(
            "Groq menghasilkan content kosong | feature=%s | model=%s",
            feature,
            model,
        )


def _normalize_npc_line(text: str) -> str:
    """
    Membersihkan output NPC.

    Contoh:

        '"Eh, kamu udah betah di sini?"'
            ->
        'Eh, kamu udah betah di sini?'

    Jika model menghasilkan beberapa baris, seluruh whitespace
    digabung sehingga DialogueBox tetap menerima satu baris string.
    """
    if not text:
        return ""

    text = " ".join(text.split())

    # Bersihkan tanda kutip pembungkus.
    text = text.strip()
    text = text.strip('"')
    text = text.strip("'")
    text = text.strip()

    return text


def _extract_placeholders(text: str) -> set[str]:
    """
    Mengambil placeholder sederhana seperti:

        {playerName}
        {name}
        {{player}}

    Digunakan agar AI tidak menghilangkan placeholder dari naskah asli.
    """
    if not text:
        return set()

    return set(re.findall(r"\{\{?[^{}]+\}\}?", text))


def _placeholders_preserved(
    original: str,
    generated: str,
) -> bool:
    """
    Memastikan seluruh placeholder yang ada pada dialog asli
    masih ada pada hasil parafrase.
    """
    original_placeholders = _extract_placeholders(original)

    if not original_placeholders:
        return True

    generated_placeholders = _extract_placeholders(generated)

    return original_placeholders.issubset(generated_placeholders)


# =========================================================
# CHATBOT KONSELING
# =========================================================

SYSTEM_PROMPT_TEMPLATE = """
Kamu adalah "Kak Dara", konselor virtual di aplikasi Nawasena Dara,
sebuah learning game edukasi pencegahan kekerasan untuk remaja
putri SMP/SMA di Indonesia.

KEPRIBADIAN:
- Empatik, hangat, sabar, dan tidak menghakimi.
- Menggunakan bahasa Indonesia santai tetapi sopan.
- Sesuaikan bahasa dengan remaja usia 13-18 tahun.
- Dengarkan pengguna terlebih dahulu sebelum memberikan saran.
- Jangan memberikan respons seperti ceramah panjang.

BATASAN PENTING:
- Kamu bukan psikolog, psikiater, dokter, atau pengganti konselor manusia.
- Jangan membuat diagnosis medis atau psikologis.
- Jangan meminta data pribadi sensitif seperti alamat lengkap,
  nomor identitas, password, nomor rekening, dan sejenisnya.
- Fokus pada dukungan emosional, edukasi pencegahan kekerasan,
  relasi sehat, keamanan diri, dan pencarian bantuan.
- Jangan menghakimi keputusan atau cerita pengguna.

RISIKO TINGGI:
Jika pengguna menunjukkan indikasi:
- sedang mengalami kekerasan,
- berada dalam bahaya,
- ingin menyakiti dirinya sendiri,
- ingin menyakiti orang lain,
- atau membutuhkan pertolongan segera,

tanggapi dengan tenang dan suportif.

Dorong pengguna untuk menghubungi orang dewasa yang dapat dipercaya,
seperti orang tua, wali, guru BK, atau layanan bantuan profesional/resmi
yang sesuai. Jangan meninggalkan percakapan secara tiba-tiba dan jangan
memberikan diagnosis.

KONTEKS EMOSI INTERNAL:
{emotion_context}

Konteks emosi tersebut hanya digunakan untuk menyesuaikan nada respons.
JANGAN menyebutkan secara eksplisit bahwa sistem mendeteksi,
mengklasifikasi, atau memprediksi emosi pengguna.

Berikan respons yang alami, ringkas, dan terasa seperti percakapan.
""".strip()


_EMOTION_CONTEXT_MAP: dict[EmotionLabel, str] = {
    "aman": (
        "Pengguna tampak tenang atau nyaman. "
        "Gunakan nada ringan, ramah, dan suportif."
    ),
    "netral": (
        "Emosi pengguna relatif netral. "
        "Tetap terbuka dan beri ruang untuk bercerita lebih lanjut."
    ),
    "sedih": (
        "Pengguna tampak sedih. "
        "Validasi perasaannya terlebih dahulu dan jangan terburu-buru "
        "memberikan solusi."
    ),
    "takut": (
        "Pengguna tampak takut atau cemas. "
        "Gunakan nada yang menenangkan dan bantu pengguna merasa aman "
        "untuk bercerita."
    ),
    "marah": (
        "Pengguna tampak marah atau frustrasi. "
        "Berikan ruang untuk mengungkapkan perasaan dan jangan defensif."
    ),
    "menyinggung": (
        "Teks mengandung indikasi konten menyinggung atau situasi "
        "yang mungkin berkaitan dengan ejekan, kekerasan verbal, "
        "atau pengalaman tidak nyaman. Tanggapi secara hati-hati, "
        "empatik, dan gali konteks dengan lembut."
    ),
}


# =========================================================
# RULE-BASED ESCALATION V1
# =========================================================

# CATATAN:
# Ini masih heuristic/rule-based.
# Nantinya dapat diganti dengan model intent/risk khusus.
ESCALATION_LABELS: set[EmotionLabel] = {
    "takut",
    "menyinggung",
    "marah",
}

ESCALATION_CONFIDENCE_THRESHOLD = 0.6


def should_escalate(
    label: EmotionLabel,
    confidence: float,
) -> bool:
    return (
        label in ESCALATION_LABELS
        and confidence >= ESCALATION_CONFIDENCE_THRESHOLD
    )


# =========================================================
# MESSAGE BUILDER - KAK DARA
# =========================================================

def _build_messages(
    text: str,
    history: list[ChatMessage],
    emotion_label: EmotionLabel,
) -> list[dict[str, str]]:

    emotion_context = _EMOTION_CONTEXT_MAP.get(
        emotion_label,
        "Tidak ada konteks emosi spesifik.",
    )

    system_prompt = SYSTEM_PROMPT_TEMPLATE.format(
        emotion_context=emotion_context
    )

    messages: list[dict[str, str]] = [
        {
            "role": "system",
            "content": system_prompt,
        }
    ]

    # Maksimal 10 pesan terakhir agar prompt tidak terus membesar.
    for message in history[-10:]:
        messages.append(
            {
                "role": message.role,
                "content": message.content,
            }
        )

    messages.append(
        {
            "role": "user",
            "content": text,
        }
    )

    return messages


# =========================================================
# GROQ COUNSELING CLIENT
# =========================================================

class GroqCounselingClient:

    def __init__(
        self,
        api_key: str,
        model: str,
    ):
        self._model = model

        self._client: Optional[Groq] = (
            Groq(api_key=api_key)
            if api_key
            else None
        )

    @property
    def is_configured(self) -> bool:
        return self._client is not None

    def reply(
        self,
        text: str,
        history: list[ChatMessage],
        emotion_label: EmotionLabel,
    ) -> str:

        if not self._client:
            raise RuntimeError(
                "GROQ_API_KEY belum diisi di .env — "
                "lihat .env.example."
            )

        messages = _build_messages(
            text=text,
            history=history,
            emotion_label=emotion_label,
        )

        try:

            # =====================================================
            # GPT-OSS
            # =====================================================
            if _is_gpt_oss(self._model):

                completion = self._client.chat.completions.create(
                    model=self._model,
                    messages=messages,

                    # Lebih stabil untuk chatbot konseling.
                    temperature=0.6,
                    top_p=0.95,

                    # GPT-OSS melakukan reasoning.
                    # Medium cukup untuk percakapan konseling,
                    # tanpa menggunakan reasoning tinggi.
                    reasoning_effort="medium",

                    # Reasoning tidak perlu dikirim ke aplikasi.
                    include_reasoning=False,

                    # Jangan gunakan max_tokens=400.
                    #
                    # Reasoning model membutuhkan ruang token
                    # lebih besar sebelum final answer terbentuk.
                    max_completion_tokens=1024,

                    stream=False,
                )

            # =====================================================
            # MODEL NON GPT-OSS
            # =====================================================
            else:

                completion = self._client.chat.completions.create(
                    model=self._model,
                    messages=messages,
                    temperature=0.7,
                    top_p=0.95,
                    max_completion_tokens=600,
                    stream=False,
                )

            content = _safe_content(completion)

            # Groq bisa HTTP 200 tetapi content kosong.
            if not content:

                _log_empty_completion(
                    completion,
                    feature="counseling",
                    model=self._model,
                )

                # Jangan membuat UI chatbot crash.
                return (
                    "Aku masih di sini buat dengerin kamu. "
                    "Coba ceritakan sedikit lagi apa yang sedang "
                    "kamu rasakan atau alami, ya."
                )

            return content

        except Exception:
            logger.exception(
                "Gagal menghasilkan respons Kak Dara | model=%s",
                self._model,
            )

            raise


# =========================================================
# NPC DIALOGUE
# =========================================================

NPC_LINE_SYSTEM_PROMPT = """
Kamu bertugas melakukan PARAFRASE terhadap SATU baris dialog NPC
dalam visual novel edukasi remaja Indonesia bernama Nawasena Dara.

Tugasmu BUKAN membuat kelanjutan cerita.
Tugasmu HANYA menulis ulang dialog yang sudah diberikan.

ATURAN WAJIB:

1. Makna dialog hasil HARUS sama dengan dialog asli.

2. Jangan mengubah:
   - plot,
   - keputusan,
   - fakta,
   - tujuan percakapan,
   - hubungan antar karakter.

3. Jangan menambahkan:
   - karakter baru,
   - kejadian baru,
   - informasi baru,
   - lokasi baru,
   - konflik baru.

4. Pertahankan kepribadian karakter berdasarkan konteks yang diberikan.

5. Gunakan bahasa Indonesia remaja SMP/SMA yang natural,
   santai, dan mudah dipahami.

6. Panjang dialog kurang lebih sama dengan dialog asli.

7. Jika terdapat placeholder seperti:
   {playerName}
   {name}
   atau placeholder lain,
   pertahankan placeholder tersebut PERSIS.

8. Jangan memberikan:
   - penjelasan,
   - analisis,
   - catatan,
   - bullet point,
   - narasi aksi,
   - nama speaker sebelum dialog,
   - emoji berlebihan.

9. Jangan membungkus hasil dengan tanda kutip.

10. OUTPUT HANYA SATU BARIS DIALOG HASIL PARAFRASE.

Jika kamu tidak yakin bagaimana memparafrase tanpa mengubah makna,
gunakan dialog asli apa adanya.
""".strip()


# =========================================================
# MESSAGE BUILDER - NPC
# =========================================================

def _build_npc_line_messages(
    npc_name: str,
    plotted_line: str,
    situation: str | None,
    player_choice_label: str | None,
) -> list[dict[str, str]]:

    context_lines = [
        NPC_LINE_SYSTEM_PROMPT,
        "",
        "=== DATA DIALOG ===",
        f"Nama NPC: {npc_name}",
        f'Dialog asli: "{plotted_line}"',
    ]

    if situation:
        context_lines.append(
            f"Konteks situasi: {situation}"
        )

    if player_choice_label:
        context_lines.append(
            f'Pilihan/dialog pemain sebelumnya: "{player_choice_label}"'
        )

    context_lines.extend(
        [
            "",
            "Parafrase dialog asli.",
            "Makna dan plot wajib tetap sama.",
            "Jawab hanya dengan satu baris dialog.",
        ]
    )

    # Untuk GPT-OSS instruksi disatukan ke user prompt.
    # Ini juga membuat prompt NPC sederhana dan eksplisit.
    return [
        {
            "role": "user",
            "content": "\n".join(context_lines),
        }
    ]


# =========================================================
# GROQ NPC CLIENT
# =========================================================

class GroqNpcDialogueClient:

    def __init__(
        self,
        api_key: str,
        model: str,
    ):
        self._model = model

        self._client: Optional[Groq] = (
            Groq(api_key=api_key)
            if api_key
            else None
        )

    @property
    def is_configured(self) -> bool:
        return self._client is not None

    def generate_line(
        self,
        npc_name: str,
        plotted_line: str,
        situation: str | None = None,
        player_choice_label: str | None = None,
    ) -> str:

        # Dialog statis adalah source of truth.
        if not plotted_line or not plotted_line.strip():
            return plotted_line

        if not self._client:

            logger.warning(
                "Groq NPC tidak dikonfigurasi. "
                "Menggunakan dialog statis."
            )

            return plotted_line

        messages = _build_npc_line_messages(
            npc_name=npc_name,
            plotted_line=plotted_line,
            situation=situation,
            player_choice_label=player_choice_label,
        )

        try:

            # =====================================================
            # GPT-OSS
            # =====================================================
            if _is_gpt_oss(self._model):

                completion = self._client.chat.completions.create(
                    model=self._model,
                    messages=messages,

                    # Cukup variatif tetapi masih terkendali.
                    temperature=0.7,
                    top_p=0.95,

                    # Parafrase satu kalimat tidak membutuhkan
                    # reasoning kompleks.
                    reasoning_effort="low",

                    # Kita tidak membutuhkan reasoning di response.
                    include_reasoning=False,

                    # INI PERUBAHAN PENTING.
                    #
                    # Sebelumnya 120 token berisiko habis
                    # untuk reasoning GPT-OSS sebelum content
                    # final berhasil dibuat.
                    max_completion_tokens=512,

                    stream=False,
                )

            # =====================================================
            # MODEL NON GPT-OSS
            # =====================================================
            else:

                completion = self._client.chat.completions.create(
                    model=self._model,
                    messages=messages,
                    temperature=0.8,
                    top_p=0.95,
                    max_completion_tokens=256,
                    stream=False,
                )

            line = _safe_content(completion)
            line = _normalize_npc_line(line)

            # =====================================================
            # FALLBACK 1
            # Groq sukses HTTP tetapi content kosong.
            # =====================================================

            if not line:

                _log_empty_completion(
                    completion,
                    feature="npc-dialogue",
                    model=self._model,
                )

                logger.info(
                    "Fallback ke plotted_line | NPC=%s",
                    npc_name,
                )

                return plotted_line

            # =====================================================
            # FALLBACK 2
            # Placeholder hilang/diubah AI.
            # =====================================================

            if not _placeholders_preserved(
                plotted_line,
                line,
            ):

                logger.warning(
                    "NPC AI mengubah/menghilangkan placeholder. "
                    "Fallback ke dialog statis | NPC=%s | "
                    "original=%r | generated=%r",
                    npc_name,
                    plotted_line,
                    line,
                )

                return plotted_line

            # =====================================================
            # FALLBACK 3
            # Output aneh atau terlalu panjang.
            # =====================================================

            original_length = len(plotted_line)
            generated_length = len(line)

            # Hindari model tiba-tiba membuat paragraf panjang.
            max_allowed_length = max(
                original_length * 3,
                original_length + 100,
            )

            if generated_length > max_allowed_length:

                logger.warning(
                    "Dialog NPC hasil AI terlalu panjang. "
                    "Fallback ke dialog statis | "
                    "NPC=%s | original_length=%s | generated_length=%s",
                    npc_name,
                    original_length,
                    generated_length,
                )

                return plotted_line

            logger.debug(
                "NPC dialogue generated | NPC=%s | "
                "original=%r | generated=%r",
                npc_name,
                plotted_line,
                line,
            )

            return line

        except Exception as exc:

            # Fitur AI NPC bersifat enhancement.
            #
            # Jangan sampai error Groq menghentikan gameplay.
            logger.warning(
                "Gagal generate dialog NPC. "
                "Menggunakan plotted_line sebagai fallback | "
                "NPC=%s | error=%s",
                npc_name,
                exc,
                exc_info=True,
            )

            return plotted_line


# =========================================================
# SINGLETON NPC CLIENT
# =========================================================

_npc_dialogue_client_instance: (
    GroqNpcDialogueClient | None
) = None


def get_npc_dialogue_client() -> GroqNpcDialogueClient:

    global _npc_dialogue_client_instance

    if _npc_dialogue_client_instance is None:

        settings = get_settings()

        _npc_dialogue_client_instance = GroqNpcDialogueClient(
            api_key=settings.groq_api_key,
            model=settings.groq_model,
        )

    return _npc_dialogue_client_instance


# =========================================================
# SINGLETON COUNSELING CLIENT
# =========================================================

_client_instance: GroqCounselingClient | None = None


def get_groq_client() -> GroqCounselingClient:

    global _client_instance

    if _client_instance is None:

        settings = get_settings()

        _client_instance = GroqCounselingClient(
            api_key=settings.groq_api_key,
            model=settings.groq_model,
        )

    return _client_instance