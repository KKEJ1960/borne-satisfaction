import { ChevronRight } from "lucide-react";
import ScreenLayout from "./ScreenLayout";
import "../style.css";

export default function WelcomePage({ onStart }) {
  return (
    <ScreenLayout mainClassName="welcome-page">
      <div className="welcome-page-inner">

        {/* Logo avec double anneau doré */}
        <div className="welcome-logo-wrap">
          <img src="/logo-hotel.jpg" alt="Logo Hôtel Président" className="welcome-logo" />
        </div>

        {/* Eyebrow ★ BIENVENUE ★ */}
        <div className="welcome-eyebrow-row" aria-hidden="true">
          <span className="welcome-eyebrow-line" />
          <span className="welcome-eyebrow-star">★</span>
          <span className="welcome-eyebrow-text">Bienvenue</span>
          <span className="welcome-eyebrow-star">★</span>
          <span className="welcome-eyebrow-line welcome-eyebrow-line--rev" />
        </div>

        {/* Titre principal */}
        <div className="welcome-headline">
          <h1>À l'Hôtel<br />Président</h1>
          <p className="welcome-lead">
            Partagez votre expérience sur les sept temps forts de votre séjour
          </p>
        </div>

        {/* Piliers encadrés par deux lignes dorées */}
        <div className="welcome-pillars-section">
          <div className="welcome-rule" />
          <p className="welcome-pillars-text">
            Accueil · Chambres · Bandama · Panoramique · Alocodrome · Loisirs · Cadre
          </p>
          <div className="welcome-rule" />
        </div>

        {/* CTA */}
        <button type="button" className="welcome-cta-btn" onClick={onStart}>
          <span>Évaluer mon séjour</span>
          <ChevronRight size={17} strokeWidth={2.5} />
        </button>

        <p className="welcome-tagline">Votre satisfaction, notre priorité</p>

      </div>
    </ScreenLayout>
  );
}
