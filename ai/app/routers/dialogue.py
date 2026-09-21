import logging

from fastapi import APIRouter, Depends, HTTPException
from groq import APIStatusError as GroqAPIStatusError

from app.core.security import verify_internal_api_key
from app.schemas import NpcDialogueLineRequest, NpcDialogueLineResponse
from app.services.groq_client import GroqNpcDialogueClient, get_npc_dialogue_client

logger = logging.getLogger("nawasenadara.router.dialogue")

router = APIRouter(prefix="/dialogue", tags=["Dialog NPC"])


# POST /dialogue/npc-line
# Dipanggil backend Express (proxy dari DialogueBox.js frontend, lihat
# window.__nawasenadaraNlp.generateNpcLine) untuk menulis-ulang
# (parafrase) SATU baris dialog NPC yang SUDAH DIPLOT naskah episode —
# lihat catatan lengkap di episode1Dialogue.js/episode2Dialogue.js
# (field `dynamic: true` + `situationHint`) dan NPC_LINE_SYSTEM_PROMPT
# di groq_client.py. Endpoint ini SATU ARAH & TANPA riwayat percakapan
# (beda dari /chat/counseling) — tiap panggilan independen, cuma
# menulis ulang satu baris pendek.
@router.post(
    "/npc-line",
    response_model=NpcDialogueLineResponse,
    dependencies=[Depends(verify_internal_api_key)],
)
def generate_npc_line(
    payload: NpcDialogueLineRequest,
    client: GroqNpcDialogueClient = Depends(get_npc_dialogue_client),
) -> NpcDialogueLineResponse:
    if not client.is_configured:
        raise HTTPException(
            status_code=503,
            detail="GROQ_API_KEY belum dikonfigurasi di server NLP.",
        )

    try:
        line = client.generate_line(
            npc_name=payload.npc_name,
            plotted_line=payload.plotted_line,
            situation=payload.situation,
            player_choice_label=payload.player_choice_label,
        )
        if not line:
            # Jaring pengaman: kalau Groq entah kenapa membalas string
            # kosong, jangan kirim baris kosong ke pemain — biar backend
            # (lihat client.js sisi Express) dianggap gagal & frontend
            # fallback diam-diam ke teks statis naskah.
            raise ValueError("Groq mengembalikan baris kosong.")
        return NpcDialogueLineResponse(line=line)
    except GroqAPIStatusError as exc:
        logger.exception("Groq API error saat generate baris dialog NPC")
        error_code = None
        try:
            error_code = exc.body.get("error", {}).get("code") if exc.body else None
        except AttributeError:
            error_code = None

        if error_code == "model_decommissioned":
            raise HTTPException(
                status_code=503,
                detail=(
                    "Model Groq yang dikonfigurasi (GROQ_MODEL di .env) sudah "
                    "tidak didukung lagi (decommissioned)."
                ),
            )
        raise HTTPException(
            status_code=502,
            detail="Groq API mengembalikan error saat generate baris dialog NPC.",
        )
    except Exception:
        logger.exception("Gagal generate baris dialog NPC")
        raise HTTPException(
            status_code=500, detail="Gagal membuat variasi baris dialog NPC."
        )
