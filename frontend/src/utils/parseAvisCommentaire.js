import { NOTE_EMOJIS, NOTE_LABELS } from "../constants/ratings";

export function parseAvisCommentaire(commentaire) {
  if (!commentaire) return { detail: "", reponses: [] };

  try {
    const parsed = JSON.parse(commentaire);
    if (parsed && typeof parsed === "object") {
      return {
        detail: parsed.detail || "",
        reponses: Array.isArray(parsed.reponses) ? parsed.reponses : [],
      };
    }
  } catch {
    /* texte brut */
  }

  return { detail: commentaire, reponses: [] };
}

export function formatNoteLine(note, type, choiceLabel) {
  if (type === "choice") return choiceLabel || String(note);
  if (type === "nps" || (note !== null && note !== undefined && note > 4)) return `${note}/10`;
  if (type === "stars") return `${note}/5 ★`;
  if (!note) return "";
  return `${NOTE_EMOJIS[note] || ""} ${NOTE_LABELS[note] || note}`.trim();
}
