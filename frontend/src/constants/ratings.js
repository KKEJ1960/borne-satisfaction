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
  1: "😕",
  2: "🙂",
  3: "😊",
  4: "🌟",
};

export const RATING_OPTIONS = [
  { value: 1, label: "Pas satisfaisant", emoji: "😕", bg: "linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%)", borderColor: "#FCA5A5", color: "#DC2626" },
  { value: 2, label: "Satisfaisant", emoji: "🙂", bg: "linear-gradient(135deg, #FFF7ED 0%, #FEF3C7 100%)", borderColor: "#FDBA74", color: "#EA580C" },
  { value: 3, label: "Très satisfaisant", emoji: "😊", bg: "linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)", borderColor: "#FCD34D", color: "#CA8A04" },
  { value: 4, label: "Mention spéciale", emoji: "🌟", bg: "linear-gradient(135deg, #F0FDF4 0%, #D1FAE5 100%)", borderColor: "#34D399", color: "#16A34A" },
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
  Restaurants: [
    "Comment évaluez-vous la qualité des plats ?",
    "Le service était-il rapide et efficace ?",
    "L'ambiance du restaurant était-elle agréable ?",
  ],
  Loisirs: [
    "Comment évaluez-vous la variété des activités ?",
    "Les installations étaient-elles bien entretenues ?",
    "Le personnel d'animation était-il dynamique ?",
  ],
  Propreté: [
    "Comment évaluez-vous la propreté générale de l'hôtel ?",
    "Les espaces communs étaient-ils bien entretenus ?",
    "Les sanitaires étaient-ils propres ?",
  ],
};

export const DEPARTEMENTS = ["Accueil", "Chambres", "Restaurants", "Loisirs", "Propreté"];

/** Métadonnées ludiques par catégorie (parcours client) */
export const CATEGORIES_META = {
  Accueil: {
    step: 1,
    tagline: "Votre arrivée à l'hôtel",
    intro: "Commençons par l'accueil !",
    doneTitle: "Accueil noté !",
    doneText: "Merci, vos impressions sur l'accueil sont enregistrées.",
  },
  Chambres: {
    step: 2,
    tagline: "Votre chambre",
    intro: "Place à votre chambre !",
    doneTitle: "Chambre notée !",
    doneText: "Super, passons à la suite de votre séjour.",
  },
  Restaurants: {
    step: 3,
    tagline: "Restauration",
    intro: "Au menu : les restaurants !",
    doneTitle: "Restaurants notés !",
    doneText: "Excellent, encore deux étapes ludiques.",
  },
  Loisirs: {
    step: 4,
    tagline: "Activités & loisirs",
    intro: "Direction les loisirs !",
    doneTitle: "Loisirs notés !",
    doneText: "Presque fini, encore un thème.",
  },
  Propreté: {
    step: 5,
    tagline: "Propreté générale",
    intro: "Dernière catégorie : la propreté !",
    doneTitle: "Propreté notée !",
    doneText: "Bravo ! Toutes les catégories sont parcourues.",
  },
};

export function getNextCategory(currentDept) {
  const i = DEPARTEMENTS.indexOf(currentDept);
  if (i < 0 || i >= DEPARTEMENTS.length - 1) return null;
  return DEPARTEMENTS[i + 1];
}
