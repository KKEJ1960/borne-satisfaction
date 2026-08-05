import React, { useState } from "react";
import axios from "axios";
import { Briefcase, Palmtree } from "lucide-react";
import { API_URL } from "../../config/api";
import InstallAppButton from "../InstallAppButton";
import "../../style.css";

const HOTEL_ID = 2;

/**
 * Même logique que ClientForm.jsx (Hôtel Président), adaptée pour HP Resort :
 * hotel_id=2 injecté sur POST /client. Charte graphique HP Resort dédiée
 * (classes hpr-*, cf. style.css) — la logique n'est pas modifiée.
 */
export default function ClientFormHPResort({ onClientIdentified }) {
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
  const [fieldErrors, setFieldErrors] = useState({});

  const TEL_REGEX = /^(?:0[1-9]\d{8}|\+\d{1,3}[\s\-()]?(?:\d[\s\-()]?){5,13}\d)$/;
  const TEL_ERROR = "Numéro invalide. Format ivoirien (ex: 0758432190) ou international (ex: +33612345678)";

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleBlurTelephone = () => {
    const telTrim = formData.telephone.trim();
    if (telTrim && !TEL_REGEX.test(telTrim)) {
      setFieldErrors((prev) => ({ ...prev, telephone: TEL_ERROR }));
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    const nomTrim = formData.nom.trim();
    const prenomTrim = formData.prenom.trim();
    const telTrim = formData.telephone.trim();
    const emailTrim = formData.email.trim();

    setError("");

    const errors = {};
    if (!prenomTrim) errors.prenom = "Prénom requis.";
    if (!nomTrim)    errors.nom    = "Nom requis.";
    if (!telTrim)    errors.telephone = "Téléphone requis.";
    else if (!TEL_REGEX.test(telTrim)) errors.telephone = TEL_ERROR;
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsLoading(true);

    try {
      const response = await axios.post(`${API_URL}/client`, {
        nom: nomTrim,
        prenom: prenomTrim,
        telephone: telTrim,
        email: emailTrim || undefined,
        numero_chambre: formData.numero_chambre.trim() || undefined,
        type_sejour: typeSejour,
        hotel_id: HOTEL_ID,
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
    <div className="hpr-form-hero">
      <div className="hpr-form-hero-media" aria-hidden="true">
        <div className="hpr-form-hero-overlay" />
        <p className="hpr-form-hero-caption">Yamoussoukro, Côte d'Ivoire</p>
      </div>
      <div className="hpr-form-hero-inner">
        <div className="hpr-form-shell">
          <div className="hpr-form-header">
            <div className="hpr-form-icon-circle">
              <img src="/logo-hpresort.png" alt="Logo HP Resort" className="hpr-form-logo-img" />
            </div>
            <h1 className="hpr-form-title">HP Resort</h1>
            <p className="hpr-form-subtitle">Hôtel · Restaurant · Spa</p>
          </div>

          {error && <div className="message error">{error}</div>}

          <form onSubmit={handleSubmit} className="hpr-form-fields" noValidate autoComplete="off">
            <div className="hpr-form-row">
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
                  className={fieldErrors.prenom ? "field-error-input" : ""}
                />
                {fieldErrors.prenom && <span className="field-error-msg">{fieldErrors.prenom}</span>}
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
                  className={fieldErrors.nom ? "field-error-input" : ""}
                />
                {fieldErrors.nom && <span className="field-error-msg">{fieldErrors.nom}</span>}
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
                onBlur={handleBlurTelephone}
                autoComplete="off"
                required
                className={fieldErrors.telephone ? "field-error-input" : ""}
              />
              {fieldErrors.telephone && <span className="field-error-msg">{fieldErrors.telephone}</span>}
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
            <div className="hpr-form-type-section">
              <p className="hpr-form-type-label">Type de séjour</p>
              <div className="hpr-form-type-picker">
                <button
                  type="button"
                  className={`hpr-type-opt${typeSejour === "loisirs" ? " is-active" : ""}`}
                  onClick={() => setTypeSejour("loisirs")}
                >
                  <Palmtree size={15} />
                  Loisirs / Personnel
                </button>
                <button
                  type="button"
                  className={`hpr-type-opt${typeSejour === "affaires" ? " is-active" : ""}`}
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
              className="hpr-form-submit"
            >
              {isLoading ? "Enregistrement..." : "Commencer l'évaluation"}
            </button>
          </form>

          <InstallAppButton />
        </div>
      </div>
    </div>
  );
}
