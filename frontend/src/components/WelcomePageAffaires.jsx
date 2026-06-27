import {
  ChevronRight,
  ConciergeBell,
  BedDouble,
  Briefcase,
  UtensilsCrossed,
  Sparkles,
  Mountain,
  Star,
} from "lucide-react";
import ScreenLayout from "./ScreenLayout";
import "../style.css";

const PILLARS_AFFAIRES = [
  { Icon: ConciergeBell,   name: "ACCUEIL",      desc: "Votre arrivée et accueil" },
  { Icon: BedDouble,       name: "CHAMBRES",      desc: "Confort et équipements" },
  { Icon: Briefcase,       name: "COMMERCIAL",    desc: "Services professionnels" },
  { Icon: UtensilsCrossed, name: "RESTAURANTS",   desc: "Restauration et service" },
  { Icon: Sparkles,        name: "LOISIRS",       desc: "Bien-être et activités" },
  { Icon: Mountain,        name: "CADRE",         desc: "Environnement et propreté" },
];

export default function WelcomePageAffaires({ onStart }) {
  return (
    <ScreenLayout mainClassName="welcome-affaires-page">
      <div className="welcome-affaires-inner">

        {/* Logo */}
        <div className="welcome-affaires-logo-wrap">
          <img src="/logo-hotel.jpg" alt="Logo Hôtel Président" className="welcome-affaires-logo" />
        </div>

        {/* Badge Professionnel */}
        <div className="welcome-affaires-badge" aria-label="Parcours Tourisme Professionnel">
          <Briefcase size={10} strokeWidth={2} />
          Tourisme Professionnel
        </div>

        {/* Eyebrow — filet ✦ BIENVENUE ✦ */}
        <div className="welcome-affaires-eyebrow-row" aria-hidden="true">
          <span className="welcome-affaires-eyebrow-line" />
          <Star size={10} fill="#c9a84c" color="#c9a84c" />
          <span className="welcome-affaires-eyebrow-text">Bienvenue</span>
          <Star size={10} fill="#c9a84c" color="#c9a84c" />
          <span className="welcome-affaires-eyebrow-line welcome-affaires-eyebrow-line--rev" />
        </div>

        {/* Titre principal */}
        <div className="welcome-affaires-headline">
          <h1>À l'Hôtel<br />Président</h1>
          <div className="welcome-affaires-divider" />
          <p className="welcome-affaires-lead">
            Partagez votre expérience sur les six étapes de votre séjour professionnel
          </p>
        </div>

        {/* Grille 6 catégories — 3 colonnes */}
        <div className="welcome-affaires-pillars-section">
          <div className="welcome-affaires-rule" />
          <div className="welcome-affaires-grid">
            {PILLARS_AFFAIRES.map(({ Icon, name, desc }) => (
              <div key={name} className="welcome-affaires-card">
                <Icon size={20} color="#c9a84c" strokeWidth={1.5} />
                <span className="welcome-affaires-card-name">{name}</span>
                <span className="welcome-affaires-card-desc">{desc}</span>
              </div>
            ))}
          </div>
          <div className="welcome-affaires-rule" />
        </div>

        {/* CTA */}
        <button type="button" className="welcome-affaires-cta-btn" onClick={onStart}>
          <span>Évaluer mon séjour</span>
          <ChevronRight size={17} strokeWidth={2.5} />
        </button>

      </div>
    </ScreenLayout>
  );
}
