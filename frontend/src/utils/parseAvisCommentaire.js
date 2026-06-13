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

export function formatNoteLine(note) {
  if (!note) return "";
  return `${NOTE_EMOJIS[note] || ""} ${NOTE_LABELS[note] || note}`.trim();
}
