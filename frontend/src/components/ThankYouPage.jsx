import { useState, useEffect } from "react";
import { CheckCircle } from "lucide-react";
import ScreenLayout from "./ScreenLayout";
import "../style.css";

export default function ThankYouPage({ client, onBack }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const timer = setTimeout(() => onBack(), 5000);
    return () => clearTimeout(timer);
  }, [onBack]);

  return (
    <ScreenLayout mainClassName={`welcome-page thank-you-page${isVisible ? " is-visible" : ""}`}>
      <div className="welcome-page-inner">
        <div className="thank-you-icon">
          <CheckCircle size={32} color="#071b36" />
        </div>
        <h1 className="thank-you-title">Merci {client?.prenom || ""} !</h1>
        <p className="thank-you-text">
          L'équipe de l'Hôtel Président vous remercie pour votre retour.
        </p>
        <p className="thank-you-hint">Retour à l'accueil dans quelques secondes…</p>
      </div>
    </ScreenLayout>
  );
}
