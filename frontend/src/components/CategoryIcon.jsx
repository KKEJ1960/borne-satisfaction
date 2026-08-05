import {
  ConciergeBell,
  BedDouble,
  Coffee,
  Eye,
  Flame,
  Palmtree,
  Sparkles,
  MessageSquare,
  Briefcase,
  UtensilsCrossed,
  Globe,
} from "lucide-react";

const ICONS = {
  Accueil: ConciergeBell,
  Chambres: BedDouble,
  "Le Bandama Petit Déjeuner": Coffee,
  "Le Panoramique": Eye,
  "L'Alocodrome": Flame,
  "Loisirs et Divertissements": Palmtree,
  "Cadre Général": Sparkles,
  "Tourisme Affaires": Briefcase,
  Commercial: Briefcase,
  Restaurants: UtensilsCrossed,
  Commentaire: MessageSquare,
  // HP Resort
  "Saveurs du Monde": Globe,
  "4 Épices": Flame,
  "Poulet Chaud": UtensilsCrossed,
  Loisirs: Palmtree,
  Cadre: Sparkles,
};

export const CATEGORY_ICONS = ICONS;

export default function CategoryIcon({ dept, size = 20, color = "#071b36", className = "" }) {
  const Icon = ICONS[dept];
  if (!Icon) return null;
  return <Icon size={size} color={color} className={className} aria-hidden="true" />;
}
