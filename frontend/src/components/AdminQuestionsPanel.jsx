import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  Plus,
  Pencil,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
  Trash2,
} from "lucide-react";
import { API_URL } from "../config/api";
import { authHeaders, ADMIN_AXIOS } from "../config/auth";
import { DEPARTEMENTS } from "../constants/ratings";
import { withQuestionsFallback } from "../utils/questions";

function activeForClient(all) {
  const active = {};
  for (const dept of DEPARTEMENTS) {
    active[dept] = (all[dept] || []).filter((q) => q.actif !== false && q.actif !== 0);
  }
  return withQuestionsFallback(active);
}

export default function AdminQuestionsPanel({ onQuestionsChanged }) {
  const [grouped, setGrouped] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [addingCat, setAddingCat] = useState(null);
  const [newText, setNewText] = useState("");
  const [busy, setBusy] = useState(false);

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
      console.error(err);
      if (err.response?.status === 401) {
        setError("Session expirée. Reconnectez-vous.");
      } else {
        setError("Impossible de charger les questions.");
      }
    } finally {
      setLoading(false);
    }
  }, [onQuestionsChanged]);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (fn) => {
    setBusy(true);
    setError("");
    try {
      await fn();
      await load();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "Action impossible.");
    } finally {
      setBusy(false);
    }
  };

  const saveEdit = (id) =>
    run(() =>
      axios.put(
        `${API_URL}/admin/questions/${id}`,
        { texte: editText },
        { ...ADMIN_AXIOS, headers: authHeaders() }
      )
    ).then(() => {
      setEditingId(null);
      setEditText("");
    });

  const toggleActive = (q) =>
    run(() =>
      axios.put(
        `${API_URL}/admin/questions/${q.id}`,
        { actif: !q.actif },
        { ...ADMIN_AXIOS, headers: authHeaders() }
      )
    );

  const softDelete = (id) =>
    run(() =>
      axios.delete(`${API_URL}/admin/questions/${id}`, { ...ADMIN_AXIOS, headers: authHeaders() })
    );

  const addQuestion = (categorie) => {
    if (!newText.trim()) return;
    const maxOrdre = Math.max(-1, ...(grouped[categorie] || []).map((q) => q.ordre ?? 0));
    return run(() =>
      axios.post(
        `${API_URL}/admin/questions`,
        { categorie, texte: newText.trim(), ordre: maxOrdre + 1 },
        { ...ADMIN_AXIOS, headers: authHeaders() }
      )
    ).then(() => {
      setAddingCat(null);
      setNewText("");
    });
  };

  const moveQuestion = (categorie, index, direction) => {
    const list = [...(grouped[categorie] || [])].sort((a, b) => a.ordre - b.ordre);
    const j = index + direction;
    if (j < 0 || j >= list.length) return;
    const a = list[index];
    const b = list[j];
    return run(async () => {
      await axios.put(
        `${API_URL}/admin/questions/${a.id}`,
        { ordre: b.ordre },
        { ...ADMIN_AXIOS, headers: authHeaders() }
      );
      await axios.put(
        `${API_URL}/admin/questions/${b.id}`,
        { ordre: a.ordre },
        { ...ADMIN_AXIOS, headers: authHeaders() }
      );
    });
  };

  if (loading) {
    return <div className="admin-loading">Chargement des questions…</div>;
  }

  return (
    <div className="admin-questions">
      {error && <div className="admin-alert">{error}</div>}

      {DEPARTEMENTS.map((cat) => {
        const list = [...(grouped[cat] || [])].sort((a, b) => a.ordre - b.ordre);
        return (
          <section key={cat} className="admin-questions-category">
            <header className="admin-questions-category-head">
              <h3>{cat}</h3>
              <button
                type="button"
                className="admin-btn admin-btn-outline admin-btn-sm"
                disabled={busy}
                onClick={() => {
                  setAddingCat(cat);
                  setNewText("");
                }}
              >
                <Plus size={14} />
                Ajouter une question
              </button>
            </header>

            {addingCat === cat && (
              <div className="admin-question-add-row">
                <input
                  type="text"
                  className="admin-question-input"
                  placeholder="Texte de la question…"
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  maxLength={500}
                />
                <button
                  type="button"
                  className="admin-btn admin-btn-primary admin-btn-sm"
                  disabled={busy || !newText.trim()}
                  onClick={() => addQuestion(cat)}
                >
                  Enregistrer
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn-outline admin-btn-sm"
                  onClick={() => setAddingCat(null)}
                >
                  Annuler
                </button>
              </div>
            )}

            <ul className="admin-questions-list">
              {list.length === 0 && (
                <li className="admin-questions-empty">Aucune question pour cette catégorie.</li>
              )}
              {list.map((q, idx) => (
                <li
                  key={q.id}
                  className={`admin-question-item${q.actif ? "" : " is-inactive"}`}
                >
                  {editingId === q.id ? (
                    <div className="admin-question-edit-row">
                      <input
                        type="text"
                        className="admin-question-input"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        maxLength={500}
                      />
                      <button
                        type="button"
                        className="admin-btn admin-btn-primary admin-btn-sm"
                        disabled={busy}
                        onClick={() => saveEdit(q.id)}
                      >
                        Enregistrer
                      </button>
                      <button
                        type="button"
                        className="admin-btn admin-btn-outline admin-btn-sm"
                        onClick={() => setEditingId(null)}
                      >
                        Annuler
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="admin-question-text">{q.texte}</span>
                      <span
                        className={`admin-question-status${q.actif ? " is-active" : ""}`}
                      >
                        {q.actif ? "Active" : "Inactive"}
                      </span>
                      <div className="admin-question-actions">
                        <button
                          type="button"
                          className="admin-icon-btn"
                          title="Monter"
                          disabled={busy || idx === 0}
                          onClick={() => moveQuestion(cat, idx, -1)}
                        >
                          <ChevronUp size={16} />
                        </button>
                        <button
                          type="button"
                          className="admin-icon-btn"
                          title="Descendre"
                          disabled={busy || idx === list.length - 1}
                          onClick={() => moveQuestion(cat, idx, 1)}
                        >
                          <ChevronDown size={16} />
                        </button>
                        <button
                          type="button"
                          className="admin-icon-btn"
                          title="Modifier"
                          disabled={busy}
                          onClick={() => {
                            setEditingId(q.id);
                            setEditText(q.texte);
                          }}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          className="admin-icon-btn"
                          title={q.actif ? "Désactiver" : "Activer"}
                          disabled={busy}
                          onClick={() => toggleActive(q)}
                        >
                          {q.actif ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                        <button
                          type="button"
                          className="admin-icon-btn admin-icon-btn-danger"
                          title="Désactiver (suppression douce)"
                          disabled={busy}
                          onClick={() => softDelete(q.id)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
