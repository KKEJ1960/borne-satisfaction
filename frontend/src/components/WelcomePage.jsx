import {
  ChevronRight,
  ConciergeBell,
  BedDouble,
  UtensilsCrossed,
  Sunset,
  ChefHat,
  Sparkles,
  Mountain,
  Star,
} from "lucide-react";
import ScreenLayout from "./ScreenLayout";
import "../style.css";

const PILLARS = [
  { Icon: ConciergeBell,   name: "ACCUEIL",      desc: "Votre arrivée et premières impressions" },
  { Icon: BedDouble,       name: "CHAMBRES",     desc: "Confort, propreté et équipements" },
  { Icon: UtensilsCrossed, name: "BANDAMA",      desc: "Restauration et service" },
  { Icon: Sunset,          name: "PANORAMIQUE",  desc: "Bars, ambiance et cadre" },
  { Icon: ChefHat,         name: "ALOCODROME",   desc: "Gastronomie et saveurs locales" },
  { Icon: Sparkles,        name: "LOISIRS",      desc: "Détente, bien-être et divertissement" },
  { Icon: Mountain,        name: "CADRE",        desc: "Environnement et propreté" },
];

export default function WelcomePage({ onStart }) {
  return (
    <ScreenLayout mainClassName="welcome-page">
      <div className="welcome-page-inner">

        {/* Logo avec double anneau doré */}
        <div className="welcome-logo-wrap">
          <img src="/logo-hotel.jpg" alt="Logo Hôtel Président" className="welcome-logo" />
        </div>

        {/* Eyebrow — filet ✦ BIENVENUE ✦ */}
        <div className="welcome-eyebrow-row" aria-hidden="true">
          <span className="welcome-eyebrow-line" />
          <Star size={10} fill="#c8a951" color="#c8a951" />
          <span className="welcome-eyebrow-text">Bienvenue</span>
          <Star size={10} fill="#c8a951" color="#c8a951" />
          <span className="welcome-eyebrow-line welcome-eyebrow-line--rev" />
        </div>

        {/* Titre principal */}
        <div className="welcome-headline">
          <h1>À l'Hôtel<br />Président</h1>
          <div className="welcome-headline-divider" />
          <p className="welcome-lead">
            Partagez votre expérience sur les sept temps forts de votre séjour
          </p>
        </div>

        {/* Piliers — grille de 7 cards */}
        <div className="welcome-pillars-section">
          <div className="welcome-rule" />
          <div className="welcome-pillars-grid">
            {PILLARS.map(({ Icon, name, desc }) => (
              <div key={name} className="welcome-pillar-card">
                <Icon size={20} color="#c8a951" strokeWidth={1.5} />
                <span className="welcome-pillar-name">{name}</span>
                <span className="welcome-pillar-desc">{desc}</span>
              </div>
            ))}
          </div>
          <div className="welcome-rule" />
        </div>

        {/* CTA */}
        <button type="button" className="welcome-cta-btn" onClick={onStart}>
          <span>Évaluer mon séjour</span>
          <ChevronRight size={17} strokeWidth={2.5} />
        </button>

      </div>
    </ScreenLayout>
  );
}
