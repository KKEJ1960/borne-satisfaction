import ScreenLayout from "./ScreenLayout";
import "../style.css";

export default function WelcomePage({ onStart }) {
  return (
    <ScreenLayout mainClassName="welcome-page">
      <div className="welcome-page-inner">
        <div className="welcome-logo-wrap">
          <img src="/logo-hotel.jpg" alt="Logo Hôtel Président" className="welcome-logo" />
        </div>
        <div className="welcome-text">
          <h1>Bienvenue à l'Hôtel Président</h1>
          <p>
            Partagez votre ressenti sur les 5 piliers de votre séjour 
          </p>
          
          <p>
             Accueil,Chambres, Restaurants, Loisirs et Propreté.
          </p>
        </div>
        <button type="button" className="btn-primary-compact welcome-btn" onClick={onStart}>
          Évaluer mon séjour
        </button>
      </div>
    </ScreenLayout>
  );
}
