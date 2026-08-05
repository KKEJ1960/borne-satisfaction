export const NOTE_LABELS = {
  1: "Pas satisfaisant",
  2: "Satisfaisant",
  3: "Très satisfaisant",
  4: "Mention spéciale",
};

export const NOTE_COLORS = {
  1: "#B91C1C",
  2: "#C2410C",
  3: "#A16207",
  4: "#15803D",
};

export const NOTE_EMOJIS = {
  1: "😞",
  2: "😐",
  3: "😄",
  4: "🤩",
};

export const RATING_OPTIONS = [
  { value: 1, label: "Pas satisfaisant", emoji: "😞" },
  { value: 2, label: "Satisfaisant",      emoji: "😐" },
  { value: 3, label: "Très satisfaisant", emoji: "😄" },
  { value: 4, label: "Mention spéciale",  emoji: "🤩" },
];

export const CATEGORY_QUESTIONS = {
  Accueil: [
    "Comment évaluez-vous la qualité de votre accueil ?",
    "Le personnel était-il aimable et serviable ?",
    "L'enregistrement s'est-il déroulé rapidement ?",
  ],
  Chambres: [
    "Comment évaluez-vous la propreté de votre chambre ?",
    "Le confort de la literie était-il satisfaisant ?",
    "La température de la chambre était-elle agréable ?",
  ],
  "Le Bandama Petit Déjeuner": [
    "Avez-vous été bien accueilli(e) au petit déjeuner ?",
    "Le buffet était-il achalandé et attrayant ?",
    "Les choix de repas proposés a-t-il répondu à vos attentes ?",
    "Le service en salle était-il rapide et efficace ?",
    "Le sens du service du personnel (amabilité, disponibilité, courtoisie, politesse) vous a-t-il satisfait ?",
  ],
  "Le Panoramique": [
    "Avez-vous été bien accueilli(e) au restaurant ?",
    "Notre menu disponible était-il attrayant ?",
    "Votre repas étaient-il à votre goût ?",
    "Le service en salle était-il rapide et efficace ?",
    "Les prix des menus étaient-ils satisfaisants ?",
    "Le sens du service du personnel (amabilité, disponibilité, courtoisie, politesse) vous a-t-il satisfait ?",
  ],
  "L'Alocodrome": [
    "Avez-vous été bien accueilli(e) au restaurant ?",
    "Notre menu disponible était-il attrayant ?",
    "Votre repas étaient-il à votre goût ?",
    "Le service était-il rapide et efficace ?",
    "Les prix des menus étaient-ils satisfaisants ?",
    "Le sens du service du personnel (amabilité, disponibilité, courtoisie, politesse) vous a-t-il satisfait ?",
  ],
  "Loisirs et Divertissements": [
    "Comment évaluez-vous la variété des activités ?",
    "Les installations étaient-elles bien entretenues ?",
    "Le personnel d'animation était-il dynamique ?",
  ],
  "Cadre Général": [
    "Comment évaluez-vous la propreté générale de l'hôtel ?",
    "Les espaces communs étaient-ils bien entretenus ?",
    "Les sanitaires étaient-ils propres ?",
  ],
};

export const DEPARTEMENTS = [
  "Accueil",
  "Chambres",
  "Le Bandama Petit Déjeuner",
  "Le Panoramique",
  "L'Alocodrome",
  "Loisirs et Divertissements",
  "Cadre Général",
];

/** Métadonnées ludiques par catégorie (parcours client) */
export const CATEGORIES_META = {
  Accueil: {
    step: 1,
    shortName: "Accueil",
    tagline: "Votre arrivée à l'hôtel",
    intro: "Commençons par l'accueil !",
    doneTitle: "Accueil noté !",
    doneText: "Merci, vos impressions sur l'accueil sont enregistrées.",
  },
  Chambres: {
    step: 2,
    shortName: "Chambres",
    tagline: "Votre chambre",
    intro: "Place à votre chambre !",
    doneTitle: "Chambre notée !",
    doneText: "Super, passons à la suite de votre séjour.",
  },
  "Le Bandama Petit Déjeuner": {
    step: 3,
    shortName: "Bandama",
    tagline: "Petit déjeuner au Bandama",
    intro: "Votre petit déjeuner au Bandama !",
    doneTitle: "Bandama noté !",
    doneText: "Merci pour votre avis sur le petit déjeuner.",
  },
  "Le Panoramique": {
    step: 4,
    shortName: "Panoramique",
    tagline: "Restaurant Le Panoramique",
    intro: "Votre expérience au Panoramique !",
    doneTitle: "Panoramique noté !",
    doneText: "Excellent, encore trois étapes.",
  },
  "L'Alocodrome": {
    step: 5,
    shortName: "Alocodrome",
    tagline: "Restaurant L'Alocodrome",
    intro: "Votre expérience à l'Alocodrome !",
    doneTitle: "Alocodrome noté !",
    doneText: "Super, encore deux étapes.",
  },
  "Loisirs et Divertissements": {
    step: 6,
    shortName: "Loisirs",
    tagline: "Activités & divertissements",
    intro: "Direction les loisirs et divertissements !",
    doneTitle: "Loisirs notés !",
    doneText: "Presque fini, encore une étape.",
  },
  "Cadre Général": {
    step: 7,
    shortName: "Cadre",
    tagline: "Cadre général de l'hôtel",
    intro: "Dernière étape : le cadre général !",
    doneTitle: "Cadre général noté !",
    doneText: "Bravo ! Toutes les catégories sont parcourues.",
  },
};

/** Toutes les catégories gérées dans le panel admin (loisirs + affaires) */
export const ALL_ADMIN_CATEGORIES = [...DEPARTEMENTS, "Commercial"];

/** Catégories admin par hôtel (multi-hôtel) — 1 = Hôtel Président, 2 = HP Resort */
export const ADMIN_CATEGORIES_BY_HOTEL = {
  1: ALL_ADMIN_CATEGORIES,
  2: ["Accueil", "Chambres", "Saveurs du Monde", "4 Épices", "Poulet Chaud", "Loisirs", "Cadre", "Commercial"],
};

export function getAdminCategoriesForHotel(hotelId) {
  return ADMIN_CATEGORIES_BY_HOTEL[hotelId] || ALL_ADMIN_CATEGORIES;
}

export function getNextCategory(currentDept) {
  const i = DEPARTEMENTS.indexOf(currentDept);
  if (i < 0 || i >= DEPARTEMENTS.length - 1) return null;
  return DEPARTEMENTS[i + 1];
}

// ── Parcours Affaires ─────────────────────────────────────────────────────────
export const DEPARTEMENTS_AFFAIRES = [
  "Accueil",
  "Chambres",
  "Commercial",
  "Restaurants",
  "Loisirs et Divertissements",
  "Cadre Général",
];

export const AFFAIRES_CATEGORIES_META = {
  Accueil: {
    step: 1,
    shortName: "Accueil",
    tagline: "Votre arrivée à l'hôtel",
    intro: "Commençons par l'accueil.",
    doneTitle: "Accueil évalué.",
    doneText: "Merci. Place aux chambres.",
  },
  Chambres: {
    step: 2,
    shortName: "Chambres",
    tagline: "Confort & hébergement",
    intro: "Évaluons votre chambre.",
    doneTitle: "Chambre évaluée.",
    doneText: "Passons aux services commerciaux.",
  },
  Commercial: {
    step: 3,
    shortName: "Commercial",
    tagline: "Services & espaces professionnels",
    intro: "Services professionnels & commerciaux.",
    doneTitle: "Services évalués.",
    doneText: "Direction la restauration.",
  },
  Restaurants: {
    step: 4,
    shortName: "Restauration",
    tagline: "Restauration & petits-déjeuners",
    intro: "Votre expérience en restauration.",
    doneTitle: "Restauration évaluée.",
    doneText: "Continuons avec les loisirs.",
  },
  "Loisirs et Divertissements": {
    step: 5,
    shortName: "Loisirs",
    tagline: "Activités & bien-être",
    intro: "Activités & loisirs de l'hôtel.",
    doneTitle: "Loisirs évalués.",
    doneText: "Dernière étape : le cadre général.",
  },
  "Cadre Général": {
    step: 6,
    shortName: "Cadre",
    tagline: "Environnement & cadre de vie",
    intro: "Dernière évaluation : le cadre général.",
    doneTitle: "Cadre général évalué.",
    doneText: "Toutes les catégories sont complètes.",
  },
};

export function getNextCategoryAffaires(currentDept) {
  const i = DEPARTEMENTS_AFFAIRES.indexOf(currentDept);
  if (i < 0 || i >= DEPARTEMENTS_AFFAIRES.length - 1) return null;
  return DEPARTEMENTS_AFFAIRES[i + 1];
}

// ── Parcours HP Resort (multi-hôtel) ────────────────────────────────────────
export const HPRESORT_CATEGORIES_LOISIRS = [
  "Accueil",
  "Chambres",
  "Saveurs du Monde",
  "4 Épices",
  "Poulet Chaud",
  "Loisirs",
  "Cadre",
];

export const HPRESORT_CATEGORIES_AFFAIRES = [
  ...HPRESORT_CATEGORIES_LOISIRS,
  "Commercial",
];

export const HPRESORT_CATEGORIES_META = {
  Accueil: {
    step: 1,
    shortName: "Accueil",
    tagline: "Votre arrivée au resort",
    intro: "Commençons par l'accueil !",
    doneTitle: "Accueil noté !",
    doneText: "Merci, passons à la suite de votre séjour.",
  },
  Chambres: {
    step: 2,
    shortName: "Chambres",
    tagline: "Votre chambre",
    intro: "Place à votre chambre !",
    doneTitle: "Chambre notée !",
    doneText: "Continuons votre évaluation.",
  },
  "Saveurs du Monde": {
    step: 3,
    shortName: "Saveurs du Monde",
    tagline: "Restaurant Saveurs du Monde",
    intro: "Votre expérience à Saveurs du Monde !",
    doneTitle: "Saveurs du Monde noté !",
    doneText: "Merci pour votre avis.",
  },
  "4 Épices": {
    step: 4,
    shortName: "4 Épices",
    tagline: "Restaurant 4 Épices",
    intro: "Votre expérience au 4 Épices !",
    doneTitle: "4 Épices noté !",
    doneText: "Encore quelques étapes.",
  },
  "Poulet Chaud": {
    step: 5,
    shortName: "Poulet Chaud",
    tagline: "Poulet Chaud",
    intro: "Votre expérience au Poulet Chaud !",
    doneTitle: "Poulet Chaud noté !",
    doneText: "Presque terminé.",
  },
  Loisirs: {
    step: 6,
    shortName: "Loisirs",
    tagline: "Activités & détente",
    intro: "Direction les loisirs !",
    doneTitle: "Loisirs notés !",
    doneText: "Dernière étape à venir.",
  },
  Cadre: {
    step: 7,
    shortName: "Cadre",
    tagline: "Cadre général du resort",
    intro: "Dernière étape : le cadre !",
    doneTitle: "Cadre noté !",
    doneText: "Merci pour votre évaluation complète.",
  },
  Commercial: {
    step: 8,
    shortName: "Commercial",
    tagline: "Services professionnels",
    intro: "Services & espaces professionnels.",
    doneTitle: "Services évalués.",
    doneText: "Toutes les catégories sont complètes.",
  },
};

export function getNextCategoryHPResort(currentDept, categories) {
  const i = categories.indexOf(currentDept);
  if (i < 0 || i >= categories.length - 1) return null;
  return categories[i + 1];
}
