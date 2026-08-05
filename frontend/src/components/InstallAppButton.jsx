import { useState, useEffect } from "react";
import { Download } from "lucide-react";
import "../style.css";

/**
 * Bouton d'installation PWA générique — s'affiche uniquement quand le
 * navigateur propose l'installation (Chrome/Edge desktop, Android).
 * Sur iOS Safari, l'événement beforeinstallprompt n'existe pas : le bouton
 * reste caché, l'utilisateur passe par "Partager → Sur l'écran d'accueil".
 */
export default function InstallAppButton({ className = "" }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    const onBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const onInstalled = () => setDeferredPrompt(null);

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!deferredPrompt) return null;

  const handleInstall = async () => {
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  return (
    <button type="button" className={`install-app-btn ${className}`} onClick={handleInstall}>
      <Download size={14} />
      Installer l'application
    </button>
  );
}
