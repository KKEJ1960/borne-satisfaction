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
  Commentaire: MessageSquare,
};

export default function CategoryIcon({ dept, size = 20, color = "#071b36", className = "" }) {
  const Icon = ICONS[dept];
  if (!Icon) return null;
  return <Icon size={size} color={color} className={className} aria-hidden="true" />;
}
