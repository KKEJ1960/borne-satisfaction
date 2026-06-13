import { CATEGORY_QUESTIONS, DEPARTEMENTS } from "../constants/ratings";

/** Extrait le libellé d'une question (API ou fallback string). */
export function getQuestionText(q) {
  if (!q) return "";
  if (typeof q === "string") return q;
  return q.texte || q.question || "";
}

/** Liste de textes pour affichage / comptage. */
export function getQuestionTexts(list) {
  return (list || []).map(getQuestionText).filter(Boolean);
}

/** Fusionne la réponse API avec le fallback ratings.js */
export function withQuestionsFallback(apiData) {
  const result = {};
  for (const dept of DEPARTEMENTS) {
    const list = apiData?.[dept];
    if (Array.isArray(list) && list.length > 0) {
      result[dept] = list.map((q, i) =>
        typeof q === "string"
          ? { id: null, texte: q, ordre: i }
          : { id: q.id ?? null, texte: q.texte, ordre: q.ordre ?? i, actif: q.actif }
      );
    } else {
      result[dept] = (CATEGORY_QUESTIONS[dept] || []).map((texte, ordre) => ({
        id: null,
        texte,
        ordre,
      }));
    }
  }
  return result;
}
