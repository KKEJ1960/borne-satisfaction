import { useState } from "react";
import axios from "axios";
import { ShieldCheck, Lock, Eye, EyeOff } from "lucide-react";
import { API_URL } from "../config/api";
import { setAdminToken } from "../config/auth";
import InstallAppButton from "./InstallAppButton";
import "../style.css";

/**
 * Point d'entrée dédié du personnel (/admin) — interface propre, distincte
 * du formulaire client, avec identifiant + mot de passe réels.
 */
export default function AdminLogin({ onAdminSuccess, onSuperAdminSuccess }) {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!login.trim() || !password) {
      setError("Identifiant et mot de passe requis.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await axios.post(`${API_URL}/admin/login`, {
        login: login.trim(),
        password,
      });
      if (res.data?.success) {
        setAdminToken(res.data.token);
        if (res.data.role === "superadmin") onSuperAdminSuccess?.();
        else onAdminSuccess?.();
      } else {
        setError("Identifiants invalides.");
      }
    } catch (err) {
      const status = err.response?.status;
      if (status === 403) setError("Compte désactivé.");
      else if (status === 429) setError("Trop de tentatives. Réessayez dans 15 minutes.");
      else setError("Identifiant ou mot de passe incorrect.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="admin-login-page">
      <div className="admin-login-card">
        <div className="admin-login-icon">
          <ShieldCheck size={26} color="#fff" />
        </div>
        <h1 className="admin-login-title">Espace Administration</h1>
        <p className="admin-login-subtitle">Hôtel Président · HP Resort</p>

        {error && <div className="message error">{error}</div>}

        <form onSubmit={handleSubmit} className="admin-login-form" noValidate autoComplete="off">
          <div>
            <label htmlFor="admin-login">Identifiant</label>
            <input
              id="admin-login"
              type="text"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              autoComplete="username"
              autoFocus
            />
          </div>
          <div>
            <label htmlFor="admin-password">Mot de passe</label>
            <div className="admin-login-password-wrap">
              <input
                id="admin-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="admin-login-password-toggle"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="admin-btn admin-btn-primary admin-login-submit"
            disabled={isLoading}
          >
            <Lock size={15} />
            {isLoading ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        <InstallAppButton className="admin-login-install-btn" />
      </div>
    </div>
  );
}
