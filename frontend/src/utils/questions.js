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

function normalizeQuestion(q, i) {
  if (typeof q === "string") return { id: null, texte: q, ordre: i };
  return { id: q.id ?? null, texte: q.texte, ordre: q.ordre ?? i, actif: q.actif };
}

/** Fusionne la réponse API avec le fallback ratings.js */
export function withQuestionsFallback(apiData) {
  const result = {};

  // Catégories loisirs : fallback local si l'API ne répond pas
  for (const dept of DEPARTEMENTS) {
    const list = apiData?.[dept];
    if (Array.isArray(list) && list.length > 0) {
      result[dept] = list.map(normalizeQuestion);
    } else {
      result[dept] = (CATEGORY_QUESTIONS[dept] || []).map((texte, ordre) => ({
        id: null, texte, ordre,
      }));
    }
  }

  // Catégories Affaires : pass-through depuis l'API, pas de fallback local
  for (const cat of ["Tourisme Affaires", "Commercial"]) {
    const list = apiData?.[cat];
    result[cat] = Array.isArray(list) ? list.map(normalizeQuestion) : [];
  }

  return result;
}
