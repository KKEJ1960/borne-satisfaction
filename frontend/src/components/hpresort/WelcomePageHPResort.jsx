import {
  ChevronRight,
  ConciergeBell,
  BedDouble,
  Globe,
  Flame,
  UtensilsCrossed,
  Palmtree,
  Sparkles,
  Star,
} from "lucide-react";
import ScreenLayout from "../ScreenLayout";
import "../../style.css";

const PILLARS = [
  { Icon: ConciergeBell,   name: "ACCUEIL",         desc: "Votre arrivée au resort" },
  { Icon: BedDouble,       name: "CHAMBRES",        desc: "Confort et équipements" },
  { Icon: Globe,           name: "SAVEURS DU MONDE", desc: "Restaurant international" },
  { Icon: Flame,           name: "4 ÉPICES",        desc: "Saveurs et épices" },
  { Icon: UtensilsCrossed, name: "POULET CHAUD",    desc: "Spécialité grillades" },
  { Icon: Palmtree,        name: "LOISIRS",         desc: "Détente et activités" },
  { Icon: Sparkles,        name: "CADRE",           desc: "Environnement du resort" },
];

/** Variante HP Resort de WelcomePage.jsx — logo + charte terracotta/brun dédiée. */
export default function WelcomePageHPResort({ onStart }) {
  return (
    <ScreenLayout mainClassName="welcome-page" variant="hpresort" headerText="HP Resort">
      <div className="welcome-page-inner">

        <div className="welcome-logo-wrap">
          <img src="/logo-hpresort.png" alt="Logo HP Resort" className="welcome-logo" />
        </div>

        <div className="welcome-eyebrow-row" aria-hidden="true">
          <span className="welcome-eyebrow-line" />
          <Star size={10} fill="#C4622D" color="#C4622D" />
          <span className="welcome-eyebrow-text">Bienvenue</span>
          <Star size={10} fill="#C4622D" color="#C4622D" />
          <span className="welcome-eyebrow-line welcome-eyebrow-line--rev" />
        </div>

        <div className="welcome-headline">
          <h1>HP Resort</h1>
          <div className="welcome-headline-divider" />
          <p className="welcome-lead">
            Partagez votre expérience sur les temps forts de votre séjour
          </p>
        </div>

        <div className="welcome-pillars-section">
          <div className="welcome-rule" />
          <div className="welcome-pillars-grid">
            {PILLARS.map(({ Icon, name, desc }) => (
              <div key={name} className="welcome-pillar-card">
                <Icon size={20} color="#C4622D" strokeWidth={1.5} />
                <span className="welcome-pillar-name">{name}</span>
                <span className="welcome-pillar-desc">{desc}</span>
              </div>
            ))}
          </div>
          <div className="welcome-rule" />
        </div>

        <button type="button" className="welcome-cta-btn" onClick={onStart}>
          <span>Évaluer mon séjour</span>
          <ChevronRight size={17} strokeWidth={2.5} />
        </button>

      </div>
    </ScreenLayout>
  );
}
