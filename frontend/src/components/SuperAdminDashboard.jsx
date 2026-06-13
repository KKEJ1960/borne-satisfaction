import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";
import {
  Shield,
  Users,
  Activity,
  BarChart3,
  LogOut,
  LayoutDashboard,
  Plus,
  Lock,
  Ban,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { API_URL } from "../config/api";
import { authHeaders, ADMIN_AXIOS } from "../config/auth";
import "../style.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend
);

const TABS = [
  { id: "overview", label: "Vue d'ensemble", icon: Activity },
  { id: "admins", label: "Gestion des admins", icon: Users },
  { id: "logs", label: "Journal", icon: Shield },
  { id: "stats", label: "Statistiques", icon: BarChart3 },
];

const LOG_ACTIONS = [
  "",
  "LOGIN_SUCCESS",
  "LOGIN_FAILED",
  "ADMIN_CREATED",
  "ADMIN_BLOCKED",
  "ADMIN_UNBLOCKED",
  "PASSWORD_RESET",
  "QUESTION_CREATED",
  "QUESTION_UPDATED",
  "QUESTION_DELETED",
  "AVIS_ARCHIVED",
  "EXPORT_CSV",
  "EXPORT_EXCEL",
  "EXPORT_PDF",
];

export default function SuperAdminDashboard({ onLogout, onOpenHotelDashboard }) {
  const [tab, setTab] = useState("overview");
  const [stats, setStats] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [logsData, setLogsData] = useState({ items: [], total: 0, page: 1, pages: 1 });
  const [satisfaction, setSatisfaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const [logFilters, setLogFilters] = useState({
    adminId: "",
    action: "",
    dateDebut: "",
    dateFin: "",
    page: 1,
  });

  const [createModal, setCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ login: "", password: "", password2: "" });
  const [pwdModal, setPwdModal] = useState(null);
  const [pwdForm, setPwdForm] = useState({ password: "", password2: "" });

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadOverview = useCallback(async () => {
    const [statsRes, logsRes] = await Promise.all([
      axios.get(`${API_URL}/superadmin/stats`, { ...ADMIN_AXIOS, headers: authHeaders() }),
      axios.get(`${API_URL}/superadmin/logs`, {
        ...ADMIN_AXIOS,
        headers: authHeaders(),
        params: { limit: 10, page: 1 },
      }),
    ]);
    setStats(statsRes.data);
    setRecentLogs(logsRes.data.items || []);
  }, []);

  const loadAdmins = useCallback(async () => {
    const res = await axios.get(`${API_URL}/superadmin/admins`, { ...ADMIN_AXIOS, headers: authHeaders() });
    setAdmins(res.data);
  }, []);

  const loadLogs = useCallback(async () => {
    const params = {
      limit: 20,
      page: logFilters.page,
      adminId: logFilters.adminId || undefined,
      action: logFilters.action || undefined,
      dateDebut: logFilters.dateDebut || undefined,
      dateFin: logFilters.dateFin || undefined,
    };
    const res = await axios.get(`${API_URL}/superadmin/logs`, {
      ...ADMIN_AXIOS,
      headers: authHeaders(),
      params,
    });
    setLogsData(res.data);
  }, [logFilters]);

  const loadSatisfaction = useCallback(async () => {
    const res = await axios.get(`${API_URL}/superadmin/satisfaction`, {
      ...ADMIN_AXIOS,
      headers: authHeaders(),
    });
    setSatisfaction(res.data);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        if (tab === "overview") await loadOverview();
        else if (tab === "admins") await loadAdmins();
        else if (tab === "logs") {
          if (!admins.length) await loadAdmins();
          await loadLogs();
        } else if (tab === "stats") await loadSatisfaction();
      } catch (err) {
        console.error(err);
        if (err.response?.status === 401) onLogout?.();
      } finally {
        setLoading(false);
      }
    })();
  }, [tab, loadOverview, loadAdmins, loadLogs, loadSatisfaction, onLogout]);

  useEffect(() => {
    if (tab === "logs" && !loading) loadLogs();
  }, [logFilters.page]);

  const handleCreateAdmin = async () => {
    if (createForm.password !== createForm.password2) {
      showToast("Les mots de passe ne correspondent pas.", "error");
      return;
    }
    try {
      await axios.post(
        `${API_URL}/superadmin/admins`,
        { login: createForm.login, password: createForm.password, role: "admin" },
        { ...ADMIN_AXIOS, headers: authHeaders() }
      );
      showToast("Administrateur créé.");
      setCreateModal(false);
      setCreateForm({ login: "", password: "", password2: "" });
      loadAdmins();
    } catch (err) {
      showToast(err.response?.data?.error || "Erreur création.", "error");
    }
  };

  const handleToggle = async (id) => {
    try {
      await axios.put(`${API_URL}/superadmin/admins/${id}/toggle`, null, {
        ...ADMIN_AXIOS,
        headers: authHeaders(),
      });
      loadAdmins();
      showToast("Statut mis à jour.");
    } catch (err) {
      showToast(err.response?.data?.error || "Action impossible.", "error");
    }
  };

  const handleResetPassword = async () => {
    if (pwdForm.password !== pwdForm.password2) {
      showToast("Les mots de passe ne correspondent pas.", "error");
      return;
    }
    try {
      await axios.put(
        `${API_URL}/superadmin/admins/${pwdModal}/password`,
        { new_password: pwdForm.password },
        { ...ADMIN_AXIOS, headers: authHeaders() }
      );
      showToast("Mot de passe réinitialisé.");
      setPwdModal(null);
      setPwdForm({ password: "", password2: "" });
    } catch (err) {
      showToast(err.response?.data?.error || "Erreur.", "error");
    }
  };

  const barChartData = satisfaction
    ? {
        labels: Object.keys(satisfaction.moyennes || {}),
        datasets: [
          {
            label: "Moyenne /4",
            data: Object.values(satisfaction.moyennes || {}),
            backgroundColor: "#071b36",
            borderRadius: 6,
          },
        ],
      }
    : null;

  const lineChartData = satisfaction?.evolution?.length
    ? {
        labels: satisfaction.evolution.map((e) => e.month),
        datasets: [
          {
            label: "Note moyenne",
            data: satisfaction.evolution.map((e) => e.moyenne),
            borderColor: "#3B82F6",
            backgroundColor: "rgba(59, 130, 246, 0.15)",
            tension: 0.3,
            fill: true,
          },
        ],
      }
    : null;

  return (
    <div className="admin-page superadmin-page">
      <header className="global-header admin-header">
        <span>Hôtel Président — Super Administration</span>
        <p className="admin-header-sub">Gestion des comptes et supervision</p>
      </header>

      {toast && (
        <div className={`admin-toast admin-toast--${toast.type}`}>{toast.message}</div>
      )}

      <div className="admin-toolbar">
        <div className="admin-tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`admin-tab${tab === t.id ? " is-active" : ""}`}
              onClick={() => setTab(t.id)}
            >
              <t.icon size={16} />
              {t.label}
            </button>
          ))}
        </div>
        <button type="button" className="admin-btn admin-btn-outline" onClick={onOpenHotelDashboard}>
          <LayoutDashboard size={16} />
          Vue Dashboard hôtel
        </button>
        <button
          type="button"
          className="admin-btn admin-btn-outline"
          onClick={() => onLogout?.()}
        >
          <LogOut size={16} />
          Déconnexion
        </button>
      </div>

      {loading ? (
        <div className="admin-loading">Chargement…</div>
      ) : (
        <>
          {tab === "overview" && stats && (
            <div className="superadmin-overview">
              <div className="admin-stats">
                <div className="admin-stat-card">
                  <BarChart3 size={22} color="#071b36" />
                  <div>
                    <span className="admin-stat-label">Total avis</span>
                    <strong className="admin-stat-value">{stats.total_avis}</strong>
                  </div>
                </div>
                <div className="admin-stat-card">
                  <Activity size={22} color="#071b36" />
                  <div>
                    <span className="admin-stat-label">Avis aujourd'hui</span>
                    <strong className="admin-stat-value">{stats.avis_aujourd_hui}</strong>
                  </div>
                </div>
                <div className="admin-stat-card">
                  <Users size={22} color="#071b36" />
                  <div>
                    <span className="admin-stat-label">Admins actifs</span>
                    <strong className="admin-stat-value">{stats.admins_actifs}</strong>
                  </div>
                </div>
                <div className="admin-stat-card">
                  <Shield size={22} color="#071b36" />
                  <div>
                    <span className="admin-stat-label">Dernière activité</span>
                    <strong className="admin-stat-value admin-stat-value--sm">
                      {stats.derniere_activite
                        ? new Date(stats.derniere_activite).toLocaleString("fr-FR")
                        : "—"}
                    </strong>
                  </div>
                </div>
              </div>
              <section className="admin-reviews superadmin-timeline">
                <h2>10 dernières actions</h2>
                <ul className="superadmin-log-timeline">
                  {recentLogs.map((log) => (
                    <li key={log.id}>
                      <time>{new Date(log.date).toLocaleString("fr-FR")}</time>
                      <strong>{log.admin_login || "Système"}</strong>
                      <span className="superadmin-log-action">{log.action}</span>
                      {log.details && (
                        <span className="superadmin-log-detail">{log.details}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          )}

          {tab === "admins" && (
            <div className="superadmin-admins">
              <button
                type="button"
                className="admin-btn admin-btn-primary"
                onClick={() => setCreateModal(true)}
              >
                <Plus size={16} />
                Créer un admin
              </button>
              <div className="superadmin-table-wrap">
                <table className="superadmin-table">
                  <thead>
                    <tr>
                      <th>Login</th>
                      <th>Rôle</th>
                      <th>Statut</th>
                      <th>Créé le</th>
                      <th>Dernière connexion</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {admins.map((a) => (
                      <tr key={a.id}>
                        <td>{a.login}</td>
                        <td>{a.role}</td>
                        <td>
                          <span
                            className={`admin-question-status${a.actif ? " is-active" : ""}`}
                          >
                            {a.actif ? "Actif" : "Bloqué"}
                          </span>
                        </td>
                        <td>
                          {a.date_creation
                            ? new Date(a.date_creation).toLocaleDateString("fr-FR")
                            : "—"}
                        </td>
                        <td>
                          {a.derniere_connexion
                            ? new Date(a.derniere_connexion).toLocaleString("fr-FR")
                            : "—"}
                        </td>
                        <td className="superadmin-table-actions">
                          {a.role !== "superadmin" && (
                            <>
                              <button
                                type="button"
                                className="admin-icon-btn"
                                title={a.actif ? "Bloquer" : "Débloquer"}
                                onClick={() => handleToggle(a.id)}
                              >
                                {a.actif ? <Ban size={14} /> : <CheckCircle size={14} />}
                              </button>
                              <button
                                type="button"
                                className="admin-icon-btn"
                                title="Réinitialiser mot de passe"
                                onClick={() => setPwdModal(a.id)}
                              >
                                <Lock size={14} />
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === "logs" && (
            <div className="superadmin-logs">
              <div className="admin-filters-row admin-filters-row--dates">
                <label>
                  Admin
                  <select
                    value={logFilters.adminId}
                    onChange={(e) =>
                      setLogFilters((p) => ({ ...p, adminId: e.target.value, page: 1 }))
                    }
                  >
                    <option value="">Tous</option>
                    {admins.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.login}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Action
                  <select
                    value={logFilters.action}
                    onChange={(e) =>
                      setLogFilters((p) => ({ ...p, action: e.target.value, page: 1 }))
                    }
                  >
                    {LOG_ACTIONS.map((act) => (
                      <option key={act || "all"} value={act}>
                        {act || "Toutes"}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Du
                  <input
                    type="date"
                    value={logFilters.dateDebut}
                    onChange={(e) =>
                      setLogFilters((p) => ({ ...p, dateDebut: e.target.value, page: 1 }))
                    }
                  />
                </label>
                <label>
                  Au
                  <input
                    type="date"
                    value={logFilters.dateFin}
                    onChange={(e) =>
                      setLogFilters((p) => ({ ...p, dateFin: e.target.value, page: 1 }))
                    }
                  />
                </label>
                <button type="button" className="admin-btn admin-btn-primary admin-btn-sm" onClick={loadLogs}>
                  Filtrer
                </button>
              </div>
              <div className="superadmin-table-wrap">
                <table className="superadmin-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Admin</th>
                      <th>Action</th>
                      <th>Détails</th>
                      <th>IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logsData.items.map((log) => (
                      <tr key={log.id}>
                        <td>{new Date(log.date).toLocaleString("fr-FR")}</td>
                        <td>{log.admin_login || "—"}</td>
                        <td>{log.action}</td>
                        <td className="superadmin-log-detail-cell">{log.details || "—"}</td>
                        <td>{log.ip_address || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="superadmin-pagination">
                <button
                  type="button"
                  disabled={logFilters.page <= 1}
                  onClick={() => setLogFilters((p) => ({ ...p, page: p.page - 1 }))}
                >
                  <ChevronLeft size={16} />
                </button>
                <span>
                  Page {logsData.page} / {logsData.pages} ({logsData.total} entrées)
                </span>
                <button
                  type="button"
                  disabled={logFilters.page >= logsData.pages}
                  onClick={() => setLogFilters((p) => ({ ...p, page: p.page + 1 }))}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {tab === "stats" && satisfaction && (
            <div className="superadmin-stats-readonly">
              <p className="superadmin-readonly-hint">
                Lecture seule — note moyenne globale : {satisfaction.note_moyenne}/4 (
                {satisfaction.total_avis} avis)
              </p>
              <div className="admin-charts">
                {barChartData && (
                  <div className="admin-chart-card">
                    <h3>Moyennes par catégorie</h3>
                    <Bar
                      data={barChartData}
                      options={{
                        responsive: true,
                        plugins: { legend: { display: false } },
                        scales: { y: { beginAtZero: true, max: 4 } },
                      }}
                    />
                  </div>
                )}
                {lineChartData && (
                  <div className="admin-chart-card">
                    <h3>Évolution mensuelle</h3>
                    <Line
                      data={lineChartData}
                      options={{
                        responsive: true,
                        scales: { y: { beginAtZero: true, max: 4 } },
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {createModal && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal">
            <h2>Créer un administrateur</h2>
            <label>
              Login
              <input
                className="admin-question-input"
                value={createForm.login}
                onChange={(e) => setCreateForm((p) => ({ ...p, login: e.target.value }))}
              />
            </label>
            <label>
              Mot de passe
              <input
                type="password"
                className="admin-question-input"
                value={createForm.password}
                onChange={(e) => setCreateForm((p) => ({ ...p, password: e.target.value }))}
              />
            </label>
            <label>
              Confirmer
              <input
                type="password"
                className="admin-question-input"
                value={createForm.password2}
                onChange={(e) => setCreateForm((p) => ({ ...p, password2: e.target.value }))}
              />
            </label>
            <div className="admin-modal-actions">
              <button type="button" className="admin-btn admin-btn-outline" onClick={() => setCreateModal(false)}>
                Annuler
              </button>
              <button type="button" className="admin-btn admin-btn-primary" onClick={handleCreateAdmin}>
                Créer
              </button>
            </div>
          </div>
        </div>
      )}

      {pwdModal && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal">
            <h2>Réinitialiser le mot de passe</h2>
            <label>
              Nouveau mot de passe
              <input
                type="password"
                className="admin-question-input"
                value={pwdForm.password}
                onChange={(e) => setPwdForm((p) => ({ ...p, password: e.target.value }))}
              />
            </label>
            <label>
              Confirmer
              <input
                type="password"
                className="admin-question-input"
                value={pwdForm.password2}
                onChange={(e) => setPwdForm((p) => ({ ...p, password2: e.target.value }))}
              />
            </label>
            <div className="admin-modal-actions">
              <button type="button" className="admin-btn admin-btn-outline" onClick={() => setPwdModal(null)}>
                Annuler
              </button>
              <button type="button" className="admin-btn admin-btn-primary" onClick={handleResetPassword}>
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
