import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import {
  Plus,
  Pencil,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
  Trash2,
  Search,
  X,
  CheckCircle,
  AlertTriangle,
  Hash,
} from "lucide-react";
import { API_URL } from "../config/api";
import { authHeaders, ADMIN_AXIOS } from "../config/auth";
import { DEPARTEMENTS } from "../constants/ratings";
import { withQuestionsFallback } from "../utils/questions";

const MAX_TEXTE = 500;

const CATEGORY_COLORS = {
  Accueil:    { from: "#071b36", to: "#1e3a5f", dot: "#60a5fa" },
  Chambres:   { from: "#1e3a5f", to: "#2e5090", dot: "#93c5fd" },
  Restaurants:{ from: "#1a3a2a", to: "#1e5c3a", dot: "#6ee7b7" },
  Loisirs:    { from: "#3b1a5f", to: "#5b2d8e", dot: "#c4b5fd" },
  "Propreté": { from: "#4a1a0a", to: "#7c2d12", dot: "#fca5a5" },
};

function activeForClient(all) {
  const active = {};
  for (const dept of DEPARTEMENTS) {
    active[dept] = (all[dept] || []).filter((q) => q.actif !== false && q.actif !== 0);
  }
  return withQuestionsFallback(active);
}

export default function AdminQuestionsPanel({ onQuestionsChanged }) {
  const [grouped, setGrouped]           = useState({});
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState("");
  const [editingId, setEditingId]       = useState(null);
  const [editText, setEditText]         = useState("");
  const [addingCat, setAddingCat]       = useState(null);
  const [newText, setNewText]           = useState("");
  const [busy, setBusy]                 = useState(false);
  const [searchQuery, setSearchQuery]   = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null); // { id, texte }
  const [toast, setToast]               = useState(null);
  const editInputRef                    = useRef(null);
  const addInputRef                     = useRef(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    try {
      setError("");
      const res = await axios.get(`${API_URL}/admin/questions`, {
        ...ADMIN_AXIOS,
        headers: authHeaders(),
        timeout: 10000,
      });
      setGrouped(res.data || {});
      onQuestionsChanged?.(activeForClient(res.data || {}));
    } catch (err) {
      if (err.response?.status === 401) {
        setError("Session expirée. Reconnectez-vous.");
      } else {
        setError("Impossible de charger les questions.");
      }
    } finally {
      setLoading(false);
    }
  }, [onQuestionsChanged]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (editingId && editInputRef.current) editInputRef.current.focus();
  }, [editingId]);

  useEffect(() => {
    if (addingCat && addInputRef.current) addInputRef.current.focus();
  }, [addingCat]);

  // run() retourne true si succès, false si erreur
  const run = async (fn, successMsg) => {
    setBusy(true);
    setError("");
    try {
      await fn();
      await load();
      if (successMsg) showToast(successMsg);
      return true;
    } catch (err) {
      const msg = err.response?.data?.error || "Action impossible. Vérifiez le serveur.";
      setError(msg);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const saveEdit = async (id) => {
    if (!editText.trim()) {
      setError("Le texte de la question ne peut pas être vide.");
      return;
    }
    const ok = await run(
      () => axios.put(`${API_URL}/admin/questions/${id}`, { texte: editText.trim() }, { ...ADMIN_AXIOS, headers: authHeaders() }),
      "Question modifiée."
    );
    if (ok) {
      setEditingId(null);
      setEditText("");
    }
  };

  const toggleActive = (q) =>
    run(
      () => axios.put(`${API_URL}/admin/questions/${q.id}`, { actif: !q.actif }, { ...ADMIN_AXIOS, headers: authHeaders() }),
      q.actif ? "Question désactivée." : "Question activée."
    );

  const confirmAndDelete = async () => {
    if (!confirmDelete) return;
    const ok = await run(
      () => axios.delete(`${API_URL}/admin/questions/${confirmDelete.id}`, { ...ADMIN_AXIOS, headers: authHeaders() }),
      "Question supprimée."
    );
    if (ok) setConfirmDelete(null);
  };

  const addQuestion = async (categorie) => {
    if (!newText.trim()) return;
    const maxOrdre = Math.max(-1, ...(grouped[categorie] || []).map((q) => q.ordre ?? 0));
    const ok = await run(
      () => axios.post(`${API_URL}/admin/questions`, { categorie, texte: newText.trim(), ordre: maxOrdre + 1 }, { ...ADMIN_AXIOS, headers: authHeaders() }),
      "Question ajoutée."
    );
    if (ok) {
      setAddingCat(null);
      setNewText("");
    }
  };

  const moveQuestion = (categorie, index, direction) => {
    const list = [...(grouped[categorie] || [])].sort((a, b) => a.ordre - b.ordre);
    const j = index + direction;
    if (j < 0 || j >= list.length) return;
    const a = list[index];
    const b = list[j];
    return run(async () => {
      await axios.put(`${API_URL}/admin/questions/${a.id}`, { ordre: b.ordre }, { ...ADMIN_AXIOS, headers: authHeaders() });
      await axios.put(`${API_URL}/admin/questions/${b.id}`, { ordre: a.ordre }, { ...ADMIN_AXIOS, headers: authHeaders() });
    });
  };

  const handleEditKeyDown = (e, id) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveEdit(id); }
    if (e.key === "Escape") { setEditingId(null); setEditText(""); }
  };

  const handleAddKeyDown = (e, cat) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addQuestion(cat); }
    if (e.key === "Escape") { setAddingCat(null); setNewText(""); }
  };

  const normalizeSearch = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const searchNorm = normalizeSearch(searchQuery);

  const filterList = (list) =>
    searchQuery.trim()
      ? list.filter((q) => normalizeSearch(q.texte).includes(searchNorm))
      : list;

  if (loading) {
    return (
      <div className="aqp-loading">
        <div className="aqp-spinner" />
        <span>Chargement des questions…</span>
      </div>
    );
  }

  const totalActive = DEPARTEMENTS.reduce((sum, cat) => {
    return sum + (grouped[cat] || []).filter((q) => q.actif).length;
  }, 0);
  const totalAll = DEPARTEMENTS.reduce((sum, cat) => sum + (grouped[cat] || []).length, 0);

  return (
    <div className="aqp-root">
      {toast && (
        <div className={`aqp-toast aqp-toast--${toast.type}`}>
          {toast.type === "success" ? <CheckCircle size={15} /> : <AlertTriangle size={15} />}
          {toast.message}
        </div>
      )}

      {/* Header barre */}
      <div className="aqp-header-bar">
        <div className="aqp-header-meta">
          <span className="aqp-header-count">
            <Hash size={13} />
            {totalActive} active{totalActive > 1 ? "s" : ""} / {totalAll} total
          </span>
        </div>
        <div className="aqp-search-wrap">
          <Search size={15} className="aqp-search-icon" />
          <input
            className="aqp-search-input"
            type="search"
            placeholder="Rechercher une question…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button type="button" className="aqp-search-clear" onClick={() => setSearchQuery("")}>
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="aqp-error-banner">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {/* Confirmation suppression */}
      {confirmDelete && (
        <div className="aqp-confirm-overlay">
          <div className="aqp-confirm-box">
            <Trash2 size={22} className="aqp-confirm-icon" />
            <p className="aqp-confirm-title">Supprimer cette question ?</p>
            <p className="aqp-confirm-text">« {confirmDelete.texte} »</p>
            <div className="aqp-confirm-actions">
              <button type="button" className="admin-btn admin-btn-outline admin-btn-sm" onClick={() => setConfirmDelete(null)}>
                Annuler
              </button>
              <button type="button" className="admin-btn aqp-btn-delete admin-btn-sm" disabled={busy} onClick={confirmAndDelete}>
                <Trash2 size={14} />
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="aqp-categories">
        {DEPARTEMENTS.map((cat) => {
          const allList  = [...(grouped[cat] || [])].sort((a, b) => a.ordre - b.ordre);
          const list     = filterList(allList);
          const colors   = CATEGORY_COLORS[cat] || CATEGORY_COLORS.Accueil;
          const activeCount = allList.filter((q) => q.actif).length;

          return (
            <section key={cat} className="aqp-category">
              <header
                className="aqp-category-head"
                style={{ background: `linear-gradient(135deg, ${colors.from} 0%, ${colors.to} 100%)` }}
              >
                <div className="aqp-category-head-left">
                  <span className="aqp-category-dot" style={{ background: colors.dot }} />
                  <h3 className="aqp-category-title">{cat}</h3>
                  <span className="aqp-category-badge">
                    {activeCount}/{allList.length}
                  </span>
                </div>
                <button
                  type="button"
                  className="aqp-add-btn"
                  disabled={busy}
                  onClick={() => {
                    setAddingCat(addingCat === cat ? null : cat);
                    setNewText("");
                  }}
                >
                  <Plus size={14} />
                  Ajouter
                </button>
              </header>

              {addingCat === cat && (
                <div className="aqp-add-form">
                  <div className="aqp-add-form-inner">
                    <div className="aqp-textarea-wrap">
                      <textarea
                        ref={addInputRef}
                        className="aqp-textarea"
                        placeholder="Texte de la question…"
                        value={newText}
                        onChange={(e) => setNewText(e.target.value)}
                        onKeyDown={(e) => handleAddKeyDown(e, cat)}
                        maxLength={MAX_TEXTE}
                        rows={2}
                      />
                      <span className="aqp-char-count">{newText.length}/{MAX_TEXTE}</span>
                    </div>
                    <div className="aqp-add-actions">
                      <button
                        type="button"
                        className="admin-btn admin-btn-primary admin-btn-sm"
                        disabled={busy || !newText.trim()}
                        onClick={() => addQuestion(cat)}
                      >
                        <CheckCircle size={14} />
                        Enregistrer
                      </button>
                      <button
                        type="button"
                        className="admin-btn admin-btn-outline admin-btn-sm"
                        onClick={() => { setAddingCat(null); setNewText(""); }}
                      >
                        Annuler
                      </button>
                      <span className="aqp-keyboard-hint">Entrée pour valider · Échap pour annuler</span>
                    </div>
                  </div>
                </div>
              )}

              <ul className="aqp-list">
                {list.length === 0 && (
                  <li className="aqp-empty">
                    {searchQuery ? `Aucun résultat pour « ${searchQuery} »` : "Aucune question dans cette catégorie."}
                  </li>
                )}
                {list.map((q, idx) => {
                  const realIdx = allList.indexOf(q);
                  return (
                    <li key={q.id} className={`aqp-item${q.actif ? "" : " aqp-item--inactive"}`}>
                      {editingId === q.id ? (
                        <div className="aqp-edit-form">
                          <div className="aqp-textarea-wrap">
                            <textarea
                              ref={editInputRef}
                              className="aqp-textarea"
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              onKeyDown={(e) => handleEditKeyDown(e, q.id)}
                              maxLength={MAX_TEXTE}
                              rows={2}
                            />
                            <span className="aqp-char-count">{editText.length}/{MAX_TEXTE}</span>
                          </div>
                          <div className="aqp-edit-actions">
                            <button
                              type="button"
                              className="admin-btn admin-btn-primary admin-btn-sm"
                              disabled={busy || !editText.trim()}
                              onClick={() => saveEdit(q.id)}
                            >
                              <CheckCircle size={14} />
                              Enregistrer
                            </button>
                            <button
                              type="button"
                              className="admin-btn admin-btn-outline admin-btn-sm"
                              onClick={() => { setEditingId(null); setEditText(""); }}
                            >
                              Annuler
                            </button>
                            <span className="aqp-keyboard-hint">Entrée · Échap</span>
                          </div>
                        </div>
                      ) : (
                        <div className="aqp-item-content">
                          <span className="aqp-item-num">{realIdx + 1}</span>
                          <span className="aqp-item-text">{q.texte}</span>
                          <span className={`aqp-item-status${q.actif ? " aqp-item-status--on" : ""}`}>
                            {q.actif ? "Active" : "Off"}
                          </span>
                          <div className="aqp-item-actions">
                            <button
                              type="button"
                              className="aqp-icon-btn"
                              title="Monter"
                              disabled={busy || realIdx === 0}
                              onClick={() => moveQuestion(cat, realIdx, -1)}
                            >
                              <ChevronUp size={15} />
                            </button>
                            <button
                              type="button"
                              className="aqp-icon-btn"
                              title="Descendre"
                              disabled={busy || realIdx === allList.length - 1}
                              onClick={() => moveQuestion(cat, realIdx, 1)}
                            >
                              <ChevronDown size={15} />
                            </button>
                            <button
                              type="button"
                              className="aqp-icon-btn aqp-icon-btn--edit"
                              title="Modifier"
                              disabled={busy}
                              onClick={() => { setEditingId(q.id); setEditText(q.texte); }}
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              type="button"
                              className={`aqp-icon-btn aqp-icon-btn--toggle${q.actif ? "" : " is-off"}`}
                              title={q.actif ? "Désactiver" : "Activer"}
                              disabled={busy}
                              onClick={() => toggleActive(q)}
                            >
                              {q.actif ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                            <button
                              type="button"
                              className="aqp-icon-btn aqp-icon-btn--delete"
                              title="Supprimer"
                              disabled={busy}
                              onClick={() => setConfirmDelete({ id: q.id, texte: q.texte })}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
