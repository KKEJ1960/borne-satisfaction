import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";
import {
  ArrowLeft,
  RefreshCw,
  BarChart3,
  Users,
  Star,
  ClipboardList,
  AlertCircle,
  Phone,
  Mail,
  BedDouble,
  HelpCircle,
  Download,
  Archive,
  RotateCcw,
  ChevronDown,
  X,
} from "lucide-react";
import { API_URL } from "../config/api";
import { authHeaders, ADMIN_AXIOS } from "../config/auth";
import AdminQuestionsPanel from "./AdminQuestionsPanel";
import { NOTE_LABELS, NOTE_COLORS, NOTE_EMOJIS } from "../constants/ratings";
import { parseAvisCommentaire, formatNoteLine } from "../utils/parseAvisCommentaire";
import "../style.css";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const CHART_COLORS = ["#071b36", "#1e3a5f", "#2E5090", "#3B82F6", "#60A5FA"];

const PERIOD_PRESETS = [
  { id: "today", label: "Aujourd'hui" },
  { id: "7d", label: "7 jours" },
  { id: "month", label: "Ce mois" },
  { id: "quarter", label: "Ce trimestre" },
  { id: "year", label: "Cette année" },
];

const CATEGORIES_FILTER = [
  "Toutes",
  "Accueil",
  "Chambres",
  "Restaurants",
  "Loisirs",
  "Propreté",
  "Global",
];

const INITIAL_FILTER = {
  periodPreset: null,
  dateDebut: "",
  dateFin: "",
  categorie: "Toutes",
  note: "Toutes",
  archived: false,
};

function formatDateISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getPresetRange(preset) {
  const end = new Date();
  const start = new Date();
  switch (preset) {
    case "today":
      break;
    case "7d":
      start.setDate(start.getDate() - 6);
      break;
    case "month":
      start.setDate(1);
      break;
    case "quarter": {
      const q = Math.floor(end.getMonth() / 3) * 3;
      start.setMonth(q, 1);
      break;
    }
    case "year":
      start.setMonth(0, 1);
      break;
    default:
      return null;
  }
  return { dateDebut: formatDateISO(start), dateFin: formatDateISO(end) };
}

function filtersToParams(filterState) {
  const p = { archived: filterState.archived };
  if (filterState.dateDebut) p.dateDebut = filterState.dateDebut;
  if (filterState.dateFin) p.dateFin = filterState.dateFin;
  if (filterState.categorie && filterState.categorie !== "Toutes") {
    p.categorie = filterState.categorie;
  }
  if (filterState.note && filterState.note !== "Toutes") {
    p.note = filterState.note;
  }
  return p;
}

function parseFilenameFromDisposition(header) {
  if (!header) return null;
  const m = /filename="?([^";\n]+)"?/.exec(header);
  return m ? m[1] : null;
}

export default function Dashboard({ onBack, onQuestionsChanged }) {
  const [activeTab, setActiveTab] = useState("stats");
  const [filterState, setFilterState] = useState(INITIAL_FILTER);
  const [avis, setAvis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [lastUpdate, setLastUpdate] = useState(null);
  const [toast, setToast] = useState(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [archiveDate, setArchiveDate] = useState("");
  const [archivePreviewCount, setArchivePreviewCount] = useState(null);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const exportRef = useRef(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchAvis = useCallback(
    async (manual = false) => {
      try {
        if (manual) setRefreshing(true);
        setFetchError("");
        const res = await axios.get(`${API_URL}/admin/avis`, {
          ...ADMIN_AXIOS,
          headers: authHeaders(),
          params: { ...filtersToParams(filterState), _ts: Date.now() },
          timeout: 15000,
        });
        const data = Array.isArray(res.data) ? res.data : [];
        setAvis(data.sort((a, b) => new Date(b.date) - new Date(a.date)));
        setLastUpdate(new Date());
      } catch (error) {
        console.error("Erreur chargement avis:", error);
        const msg =
          error.response?.status === 401
            ? "Session expirée. Reconnectez-vous depuis le formulaire."
            : error.response?.data?.error ||
              `Impossible de charger les avis (${API_URL}).`;
        setFetchError(msg);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [filterState]
  );

  useEffect(() => {
    fetchAvis();
    const interval = setInterval(() => fetchAvis(), 30000);
    return () => clearInterval(interval);
  }, [fetchAvis]);

  useEffect(() => {
    const onDocClick = (e) => {
      if (exportRef.current && !exportRef.current.contains(e.target)) {
        setExportOpen(false);
      }
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  const applyPreset = (presetId) => {
    const range = getPresetRange(presetId);
    setFilterState((prev) => ({
      ...prev,
      periodPreset: presetId,
      dateDebut: range?.dateDebut || "",
      dateFin: range?.dateFin || "",
    }));
  };

  const resetFilters = () => {
    setFilterState({ ...INITIAL_FILTER, archived: filterState.archived });
  };

  const toggleArchivesView = () => {
    setFilterState((prev) => ({
      ...prev,
      archived: !prev.archived,
      periodPreset: null,
    }));
  };

  const loadArchivePreview = async (date) => {
    if (!date) {
      setArchivePreviewCount(null);
      return;
    }
    try {
      const res = await axios.get(`${API_URL}/admin/avis/archive/preview`, {
        ...ADMIN_AXIOS,
        headers: authHeaders(),
        params: { avant_date: date },
      });
      setArchivePreviewCount(res.data?.count ?? 0);
    } catch {
      setArchivePreviewCount(null);
    }
  };

  const confirmArchive = async () => {
    if (!archiveDate) return;
    setArchiveLoading(true);
    try {
      const res = await axios.post(
        `${API_URL}/admin/avis/archive`,
        { avant_date: archiveDate },
        { ...ADMIN_AXIOS, headers: authHeaders() }
      );
      showToast(`${res.data.archived} avis archivés avec succès.`);
      setArchiveModalOpen(false);
      setArchiveDate("");
      setArchivePreviewCount(null);
      fetchAvis(true);
    } catch (err) {
      showToast(err.response?.data?.error || "Échec de l'archivage.", "error");
    } finally {
      setArchiveLoading(false);
    }
  };

  const downloadExport = async (format) => {
    setExportOpen(false);
    try {
      const res = await axios.get(`${API_URL}/admin/export/${format}`, {
        ...ADMIN_AXIOS,
        headers: authHeaders(),
        params: filtersToParams(filterState),
        responseType: "blob",
        timeout: 60000,
      });
      const name =
        parseFilenameFromDisposition(res.headers["content-disposition"]) ||
        `export.${format === "excel" ? "xlsx" : format}`;
      const url = window.URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
      window.URL.revokeObjectURL(url);
      showToast(`Export ${format.toUpperCase()} téléchargé.`);
    } catch (err) {
      showToast("Export impossible.", "error");
      console.error(err);
    }
  };

  const notes = avis.filter((a) => a.note > 0);
  const clientsUniques = new Set(avis.map((a) => a.client_id)).size;
  const noteMoyenne = notes.length
    ? (notes.reduce((s, a) => s + a.note, 0) / notes.length).toFixed(2)
    : "0.00";

  const parDepartement = notes.reduce((acc, a) => {
    if (!acc[a.departement]) acc[a.departement] = { total: 0, count: 0 };
    acc[a.departement].total += a.note;
    acc[a.departement].count += 1;
    return acc;
  }, {});

  const barData = {
    labels: Object.keys(parDepartement),
    datasets: [
      {
        label: "Note moyenne (/4)",
        data: Object.values(parDepartement).map((v) => (v.total / v.count).toFixed(2)),
        backgroundColor: CHART_COLORS,
        borderRadius: 6,
      },
    ],
  };

  const repartition = [1, 2, 3, 4].map((n) => notes.filter((a) => a.note === n).length);
  const pieData = {
    labels: [1, 2, 3, 4].map((n) => NOTE_LABELS[n]),
    datasets: [
      {
        data: repartition,
        backgroundColor: CHART_COLORS.slice(0, 4),
        borderWidth: 0,
      },
    ],
  };

  const avisGroupes = avis.reduce((acc, item) => {
    const key = item.client_id;
    if (!acc[key]) acc[key] = { client: item, avis: [] };
    acc[key].avis.push(item);
    return acc;
  }, {});

  const groupesTries = Object.values(avisGroupes).sort((a, b) => {
    const lastA = Math.max(...a.avis.map((x) => new Date(x.date).getTime()));
    const lastB = Math.max(...b.avis.map((x) => new Date(x.date).getTime()));
    return lastB - lastA;
  });

  const sortAvisClient = (clientAvis) => {
    const sorted = [...clientAvis].sort((a, b) => new Date(b.date) - new Date(a.date));
    const cats = sorted.filter((a) => a.departement !== "Global");
    const global = sorted.filter((a) => a.departement === "Global");
    return [...cats, ...global];
  };

  if (loading) {
    return (
      <div className="admin-page">
        <header className="global-header">Hôtel Président Yamoussoukro</header>
        <div className="admin-loading">Chargement du tableau de bord…</div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <header className="global-header admin-header">
        <span>Hôtel Président Yamoussoukro</span>
        <p className="admin-header-sub">Tableau de bord administration</p>
      </header>

      {toast && (
        <div className={`admin-toast admin-toast--${toast.type}`} role="status">
          {toast.message}
        </div>
      )}

      <div className="admin-toolbar">
        <div className="admin-tabs">
          <button
            type="button"
            className={`admin-tab${activeTab === "stats" ? " is-active" : ""}`}
            onClick={() => setActiveTab("stats")}
          >
            <BarChart3 size={16} />
            Statistiques
          </button>
          <button
            type="button"
            className={`admin-tab${activeTab === "questions" ? " is-active" : ""}`}
            onClick={() => setActiveTab("questions")}
          >
            <HelpCircle size={16} />
            Questions
          </button>
        </div>
        {activeTab === "stats" && (
          <>
            <button
              type="button"
              className="admin-btn admin-btn-primary"
              onClick={() => fetchAvis(true)}
              disabled={refreshing}
            >
              <RefreshCw size={16} className={refreshing ? "admin-spin" : ""} />
              {refreshing ? "Actualisation…" : "Actualiser"}
            </button>
            <div className="admin-export-wrap" ref={exportRef}>
              <button
                type="button"
                className="admin-btn admin-btn-outline"
                onClick={(e) => {
                  e.stopPropagation();
                  setExportOpen((o) => !o);
                }}
              >
                <Download size={16} />
                Exporter
                <ChevronDown size={14} />
              </button>
              {exportOpen && (
                <div className="admin-export-menu">
                  <button type="button" onClick={() => downloadExport("csv")}>
                    CSV
                  </button>
                  <button type="button" onClick={() => downloadExport("excel")}>
                    Excel (.xlsx)
                  </button>
                  <button type="button" onClick={() => downloadExport("pdf")}>
                    PDF
                  </button>
                </div>
              )}
            </div>
            {!filterState.archived && (
              <button
                type="button"
                className="admin-btn admin-btn-outline"
                onClick={() => {
                  setArchiveModalOpen(true);
                  setArchiveDate(formatDateISO(new Date()));
                  loadArchivePreview(formatDateISO(new Date()));
                }}
              >
                <Archive size={16} />
                Archiver les avis
              </button>
            )}
            <button
              type="button"
              className={`admin-btn admin-btn-outline${filterState.archived ? " is-active-archive" : ""}`}
              onClick={toggleArchivesView}
            >
              {filterState.archived ? "Voir les avis actifs" : "Voir les archives"}
            </button>
          </>
        )}
        <button type="button" className="admin-btn admin-btn-outline" onClick={onBack}>
          <ArrowLeft size={16} />
          Retour
        </button>
        {lastUpdate && activeTab === "stats" && (
          <span className="admin-last-update">
            MAJ {lastUpdate.toLocaleTimeString("fr-FR")}
          </span>
        )}
      </div>

      {fetchError && activeTab === "stats" && (
        <div className="admin-alert">
          <AlertCircle size={18} />
          <span>{fetchError}</span>
        </div>
      )}

      {activeTab === "questions" ? (
        <AdminQuestionsPanel onQuestionsChanged={onQuestionsChanged} />
      ) : (
        <>
          {filterState.archived && (
            <p className="admin-archive-banner">Affichage des avis archivés</p>
          )}

          <section className="admin-filters">
            <div className="admin-filters-row">
              <span className="admin-filters-label">Période</span>
              <div className="admin-pills">
                {PERIOD_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`admin-pill${filterState.periodPreset === p.id ? " is-active" : ""}`}
                    onClick={() => applyPreset(p.id)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="admin-filters-row admin-filters-row--dates">
              <label>
                Du
                <input
                  type="date"
                  value={filterState.dateDebut}
                  onChange={(e) =>
                    setFilterState((prev) => ({
                      ...prev,
                      periodPreset: null,
                      dateDebut: e.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Au
                <input
                  type="date"
                  value={filterState.dateFin}
                  onChange={(e) =>
                    setFilterState((prev) => ({
                      ...prev,
                      periodPreset: null,
                      dateFin: e.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Catégorie
                <select
                  value={filterState.categorie}
                  onChange={(e) =>
                    setFilterState((prev) => ({ ...prev, categorie: e.target.value }))
                  }
                >
                  {CATEGORIES_FILTER.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Note
                <select
                  value={filterState.note}
                  onChange={(e) =>
                    setFilterState((prev) => ({ ...prev, note: e.target.value }))
                  }
                >
                  <option value="Toutes">Toutes</option>
                  {[1, 2, 3, 4].map((n) => (
                    <option key={n} value={String(n)}>
                      {n} — {NOTE_LABELS[n]}
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" className="admin-btn admin-btn-outline admin-btn-sm" onClick={resetFilters}>
                <RotateCcw size={14} />
                Réinitialiser
              </button>
            </div>
          </section>

          <div className="admin-stats">
            <div className="admin-stat-card">
              <BarChart3 size={22} color="#071b36" />
              <div>
                <span className="admin-stat-label">Total avis</span>
                <strong className="admin-stat-value">{avis.length}</strong>
              </div>
            </div>
            <div className="admin-stat-card">
              <Users size={22} color="#071b36" />
              <div>
                <span className="admin-stat-label">Clients</span>
                <strong className="admin-stat-value">{clientsUniques}</strong>
              </div>
            </div>
            <div className="admin-stat-card">
              <Star size={22} color="#071b36" />
              <div>
                <span className="admin-stat-label">Note moyenne</span>
                <strong className="admin-stat-value">{noteMoyenne}/4</strong>
              </div>
            </div>
          </div>

          {avis.length === 0 && !fetchError ? (
            <div className="admin-empty">
              <ClipboardList size={40} color="#94a3b8" />
              <p>Aucun avis pour ces filtres.</p>
            </div>
          ) : (
            <>
              <div className="admin-charts">
                <div className="admin-chart-card">
                  <h3>Performance par catégorie</h3>
                  {Object.keys(parDepartement).length > 0 ? (
                    <Bar
                      data={barData}
                      options={{
                        responsive: true,
                        plugins: { legend: { display: false } },
                        scales: { y: { beginAtZero: true, max: 4, ticks: { stepSize: 1 } } },
                      }}
                    />
                  ) : (
                    <p className="admin-chart-empty">Pas de notes sur cette sélection.</p>
                  )}
                </div>
                <div className="admin-chart-card">
                  <h3>Répartition des notes</h3>
                  {notes.length > 0 ? (
                    <Doughnut
                      data={pieData}
                      options={{
                        responsive: true,
                        plugins: { legend: { position: "bottom" } },
                      }}
                    />
                  ) : (
                    <p className="admin-chart-empty">Pas de données.</p>
                  )}
                </div>
              </div>

              <section className="admin-reviews">
                <h2>
                  <ClipboardList size={20} />
                  Avis détaillés ({groupesTries.length} client
                  {groupesTries.length > 1 ? "s" : ""})
                </h2>

                {groupesTries.map((groupe) => (
                  <article key={groupe.client.client_id} className="admin-review-group">
                    <header className="admin-review-client">
                      <div>
                        <strong>
                          {groupe.client.prenom} {groupe.client.nom}
                        </strong>
                        {groupe.client.numero_chambre && (
                          <span className="admin-room-badge">
                            <BedDouble size={12} />
                            Ch. {groupe.client.numero_chambre}
                          </span>
                        )}
                      </div>
                      <div className="admin-review-contact">
                        <span>
                          <Phone size={12} /> {groupe.client.telephone}
                        </span>
                        {groupe.client.email && (
                          <span>
                            <Mail size={12} /> {groupe.client.email}
                          </span>
                        )}
                      </div>
                      <time className="admin-review-date">
                        {new Date(
                          Math.max(...groupe.avis.map((x) => new Date(x.date).getTime()))
                        ).toLocaleString("fr-FR")}
                      </time>
                    </header>

                    {sortAvisClient(groupe.avis).map((a) => {
                      const { detail, reponses } = parseAvisCommentaire(a.commentaire);
                      return (
                        <div key={a.id} className="admin-review-item">
                          <div className="admin-review-item-head">
                            <span className="admin-review-dept">{a.departement}</span>
                            {a.note > 0 ? (
                              <span
                                className="admin-review-note"
                                style={{
                                  color: NOTE_COLORS[a.note],
                                  borderColor: `${NOTE_COLORS[a.note]}50`,
                                  background: `${NOTE_COLORS[a.note]}12`,
                                }}
                              >
                                {NOTE_EMOJIS[a.note]} {NOTE_LABELS[a.note]} ({a.note}/4)
                              </span>
                            ) : (
                              <span className="admin-review-note-global">Commentaire global</span>
                            )}
                          </div>
                          {reponses.length > 0 && (
                            <ul className="admin-review-questions">
                              {reponses.map((r, i) => (
                                <li key={i}>
                                  <span>{r.question}</span>
                                  <strong>{formatNoteLine(r.note)}</strong>
                                </li>
                              ))}
                            </ul>
                          )}
                          {detail && <p className="admin-review-detail">{detail}</p>}
                          {!detail && reponses.length === 0 && a.commentaire && (
                            <p className="admin-review-detail">{a.commentaire}</p>
                          )}
                        </div>
                      );
                    })}
                  </article>
                ))}
              </section>
            </>
          )}
        </>
      )}

      {archiveModalOpen && (
        <div className="admin-modal-backdrop" role="presentation">
          <div className="admin-modal" role="dialog" aria-labelledby="archive-title">
            <button
              type="button"
              className="admin-modal-close"
              onClick={() => setArchiveModalOpen(false)}
              aria-label="Fermer"
            >
              <X size={20} />
            </button>
            <h2 id="archive-title">Archiver les avis</h2>
            <p>Archiver tous les avis <strong>non archivés</strong> avant le :</p>
            <input
              type="date"
              className="admin-question-input"
              value={archiveDate}
              onChange={(e) => {
                setArchiveDate(e.target.value);
                loadArchivePreview(e.target.value);
              }}
            />
            {archivePreviewCount != null && (
              <p className="admin-archive-preview">
                <strong>{archivePreviewCount}</strong> avis seront archivés.
              </p>
            )}
            <div className="admin-modal-actions">
              <button
                type="button"
                className="admin-btn admin-btn-outline"
                onClick={() => setArchiveModalOpen(false)}
              >
                Annuler
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-primary"
                disabled={archiveLoading || !archiveDate || archivePreviewCount === 0}
                onClick={confirmArchive}
              >
                {archiveLoading ? "Archivage…" : "Confirmer l'archivage"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
