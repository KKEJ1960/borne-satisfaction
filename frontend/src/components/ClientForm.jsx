import React, { useState } from "react";
import axios from "axios";
import { UserCircle2, Briefcase, Palmtree } from "lucide-react";
import { API_URL } from "../config/api";
import "../style.css";

export default function ClientForm({ onClientIdentified, onAdminTrigger, onSuperAdminTrigger }) {
  const [formData, setFormData] = useState({
    nom: "",
    prenom: "",
    telephone: "",
    email: "",
    numero_chambre: "",
  });
  const [typeSejour, setTypeSejour] = useState("loisirs");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const tryStaffLogin = async (login, password) => {
    const response = await axios.post(
      `${API_URL}/admin/login`,
      { login, password },
      { withCredentials: true }
    );
    if (!response.data?.success) return null;
    return response.data;
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    const nomTrim = formData.nom.trim();
    const prenomTrim = formData.prenom.trim();
    const telTrim = formData.telephone.trim();
    const emailTrim = formData.email.trim();

    setError("");
    setIsLoading(true);

    try {
      // Déclencheur staff : téléphone vide + nom correspond à un login admin connu.
      // Les vrais clients remplissent toujours le téléphone (champ obligatoire *).
      // Si le téléphone est vide et que le nom n'est pas un login staff connu,
      // on affiche "Téléphone requis" immédiatement sans consommer le rate limit (5/15min).
      const STAFF_LOGINS = ["admin", "superadmin"];
      const isStaffAttempt = !telTrim && nomTrim && emailTrim && STAFF_LOGINS.includes(nomTrim.toLowerCase());

      if (!telTrim && !isStaffAttempt) {
        setError("Téléphone requis.");
        return;
      }

      if (isStaffAttempt) {
        try {
          const data = await tryStaffLogin(nomTrim, emailTrim);
          if (data?.role === "superadmin") { onSuperAdminTrigger?.(); return; }
          if (data?.role === "admin") { onAdminTrigger?.(); return; }
        } catch (err) {
          const status = err.response?.status;
          if (status === 403) { setError("Compte désactivé."); return; }
          if (status === 429) { setError("Trop de tentatives. Veuillez patienter."); return; }
          // 401 → identifiants admin incorrects, tombe sur la validation client standard
        }
      }

      // Inscription client standard
      if (!nomTrim || !prenomTrim || !telTrim) {
        setError("Veuillez remplir tous les champs obligatoires (*)");
        return;
      }

      const response = await axios.post(`${API_URL}/client`, {
        nom: nomTrim,
        prenom: prenomTrim,
        telephone: telTrim,
        email: emailTrim || undefined,
        numero_chambre: formData.numero_chambre.trim() || undefined,
        type_sejour: typeSejour,
      });
      onClientIdentified({
        id: response.data.id,
        ...formData,
        nom: nomTrim,
        prenom: prenomTrim,
        type_sejour: response.data.type_sejour || typeSejour,
      });
    } catch (err) {
      setError("Erreur lors de l'enregistrement. Veuillez réessayer.");
      console.error("Erreur enregistrement client");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="client-form-hero">
      <div className="client-form-hero-media" aria-hidden="true">
        <div className="client-form-hero-overlay" />
      </div>
      <div className="client-form-hero-inner">
        <div className="client-form-shell">
          <div className="client-form-brand">
            <UserCircle2 size={58} color="#071b36" />
            <div>
              <h1>Hôtel Président</h1>
              <p className="client-subtitle">Yamoussoukro</p>
            </div>
          </div>

          {error && <div className="message error">{error}</div>}

          <form onSubmit={handleSubmit} className="client-form-fields" noValidate autoComplete="off">
            <div className="client-form-row">
              <div>
                <label htmlFor="prenom">Prénom *</label>
                <input
                  id="prenom"
                  type="text"
                  name="prenom"
                  value={formData.prenom}
                  onChange={handleChange}
                  autoComplete="off"
                  required
                />
              </div>
              <div>
                <label htmlFor="nom">Nom *</label>
                <input
                  id="nom"
                  type="text"
                  name="nom"
                  value={formData.nom}
                  onChange={handleChange}
                  autoComplete="off"
                  required
                />
              </div>
            </div>
            <div>
              <label htmlFor="telephone">Téléphone *</label>
              <input
                id="telephone"
                type="tel"
                name="telephone"
                value={formData.telephone}
                onChange={handleChange}
                autoComplete="off"
                required
              />
            </div>
            <div>
              <label htmlFor="numero_chambre">N° chambre (optionnel)</label>
              <input
                id="numero_chambre"
                type="text"
                name="numero_chambre"
                value={formData.numero_chambre}
                onChange={handleChange}
                autoComplete="off"
              />
            </div>
            <div>
              <label htmlFor="email">Email (optionnel)</label>
              <input
                id="email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                autoComplete="off"
              />
            </div>
            <div className="client-form-type-section">
              <p className="client-form-type-label">Type de séjour</p>
              <div className="client-form-type-picker">
                <button
                  type="button"
                  className={`client-type-opt${typeSejour === "loisirs" ? " is-active" : ""}`}
                  onClick={() => setTypeSejour("loisirs")}
                >
                  <Palmtree size={15} />
                  Loisirs / Personnel
                </button>
                <button
                  type="button"
                  className={`client-type-opt${typeSejour === "affaires" ? " is-active" : ""}`}
                  onClick={() => setTypeSejour("affaires")}
                >
                  <Briefcase size={15} />
                  Affaires / Professionnel
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary-compact client-form-submit"
            >
              {isLoading ? "Enregistrement..." : "Inscrivez-vous"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
