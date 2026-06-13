import {
  ConciergeBell,
  BedDouble,
  UtensilsCrossed,
  Palmtree,
  Sparkles,
  MessageSquare,
} from "lucide-react";

const ICONS = {
  Accueil: ConciergeBell,
  Chambres: BedDouble,
  Restaurants: UtensilsCrossed,
  Loisirs: Palmtree,
  Propreté: Sparkles,
  Commentaire: MessageSquare,
};

export default function CategoryIcon({ dept, size = 20, color = "#071b36", className = "" }) {
  const Icon = ICONS[dept];
  if (!Icon) return null;
  return <Icon size={size} color={color} className={className} aria-hidden="true" />;
}
