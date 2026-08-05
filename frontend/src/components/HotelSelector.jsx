import { Building2, Loader2, ShieldCheck } from "lucide-react";
import "../style.css";

/** Visuels propres à chaque établissement — logo réel + couleur de marque. */
const HOTEL_VISUALS = {
  president: {
    logo: "/logo-hotel.jpg",
    tagline: "Yamoussoukro",
    accent: "#0d2847",
    accentSoft: "#c9a84c",
  },
  hpresort: {
    logo: "/logo-hpresort.png",
    tagline: "Hôtel · Restaurant · Spa",
    accent: "#C4622D",
    accentSoft: "#C4622D",
  },
};

export default function HotelSelector({ hotels, loading, onSelect }) {
  return (
    <div className="admin-page hotel-selector-page">
      <header className="global-header admin-header">
        <span className="hotel-selector-header-title">
          <ShieldCheck size={18} />
          Sélection de l'établissement
        </span>
        <p className="admin-header-sub">Choisissez l'hôtel à administrer</p>
      </header>

      <main className="hotel-selector-main">
        {loading ? (
          <div className="hotel-selector-loading">
            <Loader2 size={22} className="admin-spin" />
            <span>Chargement des établissements…</span>
          </div>
        ) : hotels.length === 0 ? (
          <p className="hotel-selector-empty">Aucun établissement disponible.</p>
        ) : (
          <div className="hotel-selector-grid">
            {hotels.map((hotel, i) => {
              const v = HOTEL_VISUALS[hotel.slug] || {};
              return (
                <button
                  key={hotel.id}
                  type="button"
                  className="hotel-selector-card"
                  style={{
                    "--hotel-accent": v.accent || "#071b36",
                    "--hotel-accent-soft": v.accentSoft || "#94a3b8",
                    animationDelay: `${i * 90}ms`,
                  }}
                  onClick={() => onSelect(hotel)}
                >
                  <span className="hotel-selector-card-logo-wrap">
                    {v.logo ? (
                      <img src={v.logo} alt="" className="hotel-selector-card-logo" />
                    ) : (
                      <Building2 size={30} />
                    )}
                  </span>
                  <span className="hotel-selector-card-name">{hotel.nom}</span>
                  {v.tagline && <span className="hotel-selector-card-tagline">{v.tagline}</span>}
                  <span className="hotel-selector-card-cta">Administrer →</span>
                </button>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
