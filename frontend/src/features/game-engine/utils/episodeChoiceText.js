import { EPISODE1_DIALOGUE } from '../dialogue/episode1Dialogue';
import { EPISODE2_DIALOGUE } from '../dialogue/episode2Dialogue';
import { EPISODE3_DIALOGUE } from '../dialogue/episode3Dialogue';
import { EPISODE4_DIALOGUE } from '../dialogue/episode4Dialogue';
import { EPISODE5_DIALOGUE } from '../dialogue/episode5Dialogue';
import { EPISODE6_DIALOGUE } from '../dialogue/episode6Dialogue';
import { getCharacterName } from './characterName';

const DIALOGUES = {
  1: EPISODE1_DIALOGUE,
  2: EPISODE2_DIALOGUE,
  3: EPISODE3_DIALOGUE,
  4: EPISODE4_DIALOGUE,
  5: EPISODE5_DIALOGUE,
  6: EPISODE6_DIALOGUE,
};

function normalizeText(value) {
  if (typeof value !== 'string') return null;
  const playerName = getCharacterName();
  const normalized = value
    .replace(/\{player\}/gi, playerName)
    .replace(/^["“]|["”]$/g, '')
    .trim();
  return normalized || null;
}

// Progres lama hanya menyimpan nodeId/choiceId/emotion. Resolver ini
// mengambil kembali teks dari tree agar save lama tetap bisa dianalisis
// NLP tanpa berpura-pura bahwa tag `emotion` adalah hasil model.
export function getEpisodeChoiceTexts(episodeId, choices = []) {
  const tree = DIALOGUES[episodeId];
  if (!tree || !Array.isArray(choices)) return [];

  return choices
    .map((savedChoice) => {
      const storedText = normalizeText(savedChoice?.responseText);
      if (storedText) return storedText;

      const node = tree.nodes?.[savedChoice?.nodeId];
      const choice = node?.choices?.find(
        (candidate) => candidate.id === savedChoice?.choiceId,
      );
      return normalizeText(choice?.chatReply || choice?.label);
    })
    .filter(Boolean);
}
