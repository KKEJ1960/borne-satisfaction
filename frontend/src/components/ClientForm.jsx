import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { UserCircle2 } from "lucide-react";
import { API_URL } from "../config/api";
import "../style.css";

const ADMIN_BLOCK_MS = 10 * 60 * 1000;
const MAX_ADMIN_FAILS = 3;

export default function ClientForm({ onClientIdentified, onAdminTrigger, onSuperAdminTrigger }) {
  const [formData, setFormData] = useState({
    nom: "",
    prenom: "",
    telephone: "",
    email: "",
    numero_chambre: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [adminFailCount, setAdminFailCount] = useState(0);
  const [blockedUntil, setBlockedUntil] = useState(null);
  const blockTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (blockTimerRef.current) clearTimeout(blockTimerRef.current);
    };
  }, []);

  const isBlocked = blockedUntil && Date.now() < blockedUntil;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const startAdminBlock = () => {
    const until = Date.now() + ADMIN_BLOCK_MS;
    setBlockedUntil(until);
    setAdminFailCount(0);
    if (blockTimerRef.current) clearTimeout(blockTimerRef.current);
    blockTimerRef.current = setTimeout(() => setBlockedUntil(null), ADMIN_BLOCK_MS);
  };

  const tryStaffLogin = async (login, password) => {
    const response = await axios.post(`${API_URL}/admin/login`, { login, password }, { withCredentials: true });
    if (!response.data?.success) return null;
    return response.data;
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (isBlocked) {
      setError("Informations incorrectes");
      return;
    }

    const nomTrim = formData.nom.trim();
    const prenomTrim = formData.prenom.trim();
    const telTrim = formData.telephone.trim();
    const emailTrim = formData.email.trim();

    const isSuperAdminAttempt =
      emailTrim.length > 0 &&
      (nomTrim.toLowerCase() === "superadmin" || prenomTrim.toLowerCase() === "superadmin");

    const isAdminAttempt =
      !isSuperAdminAttempt &&
      emailTrim.length > 0 &&
      (nomTrim.toLowerCase() === "admin" || prenomTrim.toLowerCase() === "admin");

    setError("");
    setIsLoading(true);

    try {
      if (isSuperAdminAttempt || isAdminAttempt) {
        const login = isSuperAdminAttempt ? "superadmin" : "admin";
        try {
          const data = await tryStaffLogin(login, emailTrim);
          if (data?.role === "superadmin") {
            onSuperAdminTrigger?.();
            return;
          }
          if (data?.role === "admin") {
            onAdminTrigger?.();
            return;
          }
        } catch (err) {
          const status = err.response?.status;
          if (status === 401 || status === 403 || status === 429) {
            const nextFails = adminFailCount + 1;
            setAdminFailCount(nextFails);
            if (nextFails >= MAX_ADMIN_FAILS) startAdminBlock();
            setError("Informations incorrectes");
            return;
          }
          setError("Erreur lors de l'enregistrement. Veuillez réessayer.");
          return;
        }
        const nextFails = adminFailCount + 1;
        setAdminFailCount(nextFails);
        if (nextFails >= MAX_ADMIN_FAILS) startAdminBlock();
        setError("Informations incorrectes");
        return;
      }

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
      });
      onClientIdentified({ id: response.data.id, ...formData, nom: nomTrim, prenom: prenomTrim });
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
            <UserCircle2 size={40} color="#071b36" />
            <div>
              <h1>Hôtel Président</h1>
              <p className="client-subtitle">Yamoussoukro</p>
            </div>
          </div>

          {error && <div className="message error">{error}</div>}

          <form onSubmit={handleSubmit} className="client-form-fields" noValidate>
            <div className="client-form-row">
              <div>
                <label htmlFor="prenom">Prénom *</label>
                <input
                  id="prenom"
                  type="text"
                  name="prenom"
                  value={formData.prenom}
                  onChange={handleChange}
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
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || isBlocked}
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
