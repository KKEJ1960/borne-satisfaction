import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import {
  Search,
  X,
  Send,
  Mail,
  Phone,
  History,
  CheckCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Users,
} from "lucide-react";
import { API_URL } from "../config/api";
import { authHeaders, ADMIN_AXIOS } from "../config/auth";

const PAGE_SIZE = 25;
const MAX_MESSAGE_LEN = 1500;
const MAX_SUBJECT_LEN = 150;

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function ClientsPanel() {
  const [view, setView] = useState("liste"); // "liste" | "historique"

  const [clients, setClients] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const [historique, setHistorique] = useState([]);
  const [historiqueLoading, setHistoriqueLoading] = useState(false);

  const [compose, setCompose] = useState(null); // { targets: [client...] } | null
  const [composeType, setComposeType] = useState("email");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeMessage, setComposeMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResults, setSendResults] = useState(null);

  const searchDebounce = useRef(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadClients = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(`${API_URL}/admin/clients`, {
        ...ADMIN_AXIOS,
        headers: authHeaders(),
        params: { page, pageSize: PAGE_SIZE, q: search || undefined },
        timeout: 10000,
      });
      setClients(res.data.clients || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      setError(err.response?.data?.error || "Impossible de charger les clients.");
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { loadClients(); }, [loadClients]);

  useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 350);
    return () => clearTimeout(searchDebounce.current);
  }, [searchInput]);

  const loadHistorique = useCallback(async () => {
    setHistoriqueLoading(true);
    try {
      const res = await axios.get(`${API_URL}/admin/clients/messages/historique`, {
        ...ADMIN_AXIOS,
        headers: authHeaders(),
        timeout: 10000,
      });
      setHistorique(res.data || []);
    } catch {
      showToast("Impossible de charger l'historique.", "error");
    } finally {
      setHistoriqueLoading(false);
    }
  }, []);

  useEffect(() => {
    if (view === "historique") loadHistorique();
  }, [view, loadHistorique]);

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds((prev) =>
      prev.size === clients.length ? new Set() : new Set(clients.map((c) => c.id))
    );
  };

  const openCompose = (targets) => {
    setCompose({ targets });
    setComposeType("email");
    setComposeSubject("");
    setComposeMessage("");
    setSendResults(null);
  };

  const closeCompose = () => {
    if (sending) return;
    setCompose(null);
    setSendResults(null);
  };

  const submitSend = async () => {
    if (!compose) return;
    if (!composeMessage.trim()) {
      showToast("Le message ne peut pas être vide.", "error");
      return;
    }
    if (composeType === "email" && !composeSubject.trim()) {
      showToast("Le sujet est requis pour un email.", "error");
      return;
    }
    setSending(true);
    setSendResults(null);
    try {
      const res = await axios.post(
        `${API_URL}/admin/clients/message`,
        {
          client_ids: compose.targets.map((c) => c.id),
          type: composeType,
          subject: composeType === "email" ? composeSubject.trim() : undefined,
          message: composeMessage,
        },
        { ...ADMIN_AXIOS, headers: authHeaders(), timeout: 20000 }
      );
      setSendResults(res.data.results || []);
      const succes = (res.data.results || []).filter((r) => r.statut === "envoye").length;
      const echecs = (res.data.results || []).length - succes;
      if (echecs === 0) showToast(`${succes} message(s) envoyé(s) avec succès.`);
      else showToast(`${succes} envoyé(s), ${echecs} échec(s).`, echecs === succes ? "error" : "success");
      setSelectedIds(new Set());
    } catch (err) {
      showToast(err.response?.data?.error || "Erreur lors de l'envoi.", "error");
    } finally {
      setSending(false);
    }
  };

  const previewClient = compose?.targets?.[0];
  const previewText = previewClient
    ? composeMessage
        .replace(/\{prenom\}/gi, previewClient.prenom || "")
        .replace(/\{nom\}/gi, previewClient.nom || "")
    : composeMessage;

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="cp-root">
      {toast && (
        <div className={`cp-toast cp-toast--${toast.type}`}>
          {toast.type === "success" ? <CheckCircle size={15} /> : <AlertTriangle size={15} />}
          {toast.message}
        </div>
      )}

      <div className="cp-header-bar">
        <div className="admin-tabs cp-subtabs">
          <button
            type="button"
            className={`admin-tab${view === "liste" ? " is-active" : ""}`}
            onClick={() => setView("liste")}
          >
            <Users size={15} />
            Clients
          </button>
          <button
            type="button"
            className={`admin-tab${view === "historique" ? " is-active" : ""}`}
            onClick={() => setView("historique")}
          >
            <History size={15} />
            Historique des envois
          </button>
        </div>

        {view === "liste" && (
          <div className="cp-search-wrap">
            <Search size={15} className="cp-search-icon" />
            <input
              className="cp-search-input"
              type="search"
              placeholder="Rechercher (nom, prénom, email, téléphone)…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            {searchInput && (
              <button type="button" className="cp-search-clear" onClick={() => setSearchInput("")}>
                <X size={14} />
              </button>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="aqp-error-banner">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {view === "liste" ? (
        <>
          <div className="cp-toolbar">
            <span className="cp-count-badge">{total} client{total > 1 ? "s" : ""}</span>
            {selectedIds.size > 0 && (
              <button
                type="button"
                className="admin-btn admin-btn-primary admin-btn-sm"
                onClick={() => openCompose(clients.filter((c) => selectedIds.has(c.id)))}
              >
                <Send size={14} />
                Envoyer à {selectedIds.size} sélectionné{selectedIds.size > 1 ? "s" : ""}
              </button>
            )}
          </div>

          {loading ? (
            <div className="aqp-loading">
              <div className="aqp-spinner" />
              <span>Chargement des clients…</span>
            </div>
          ) : clients.length === 0 ? (
            <p className="cp-empty">Aucun client trouvé.</p>
          ) : (
            <div className="cp-table-wrap">
              <table className="cp-table">
                <thead>
                  <tr>
                    <th className="cp-th-check">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === clients.length && clients.length > 0}
                        onChange={toggleSelectAll}
                      />
                    </th>
                    <th>Nom</th>
                    <th>Téléphone</th>
                    <th>Email</th>
                    <th>Chambre</th>
                    <th>Séjour</th>
                    <th>Avis</th>
                    <th>Dernière visite</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((c) => (
                    <tr key={c.id} className={selectedIds.has(c.id) ? "is-selected" : ""}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(c.id)}
                          onChange={() => toggleSelect(c.id)}
                        />
                      </td>
                      <td className="cp-td-name">{c.prenom} {c.nom}</td>
                      <td>{c.telephone || "—"}</td>
                      <td className="cp-td-email">{c.email || "—"}</td>
                      <td>{c.numero_chambre || "—"}</td>
                      <td>
                        <span className={`cp-badge cp-badge--${c.type_sejour}`}>
                          {c.type_sejour === "affaires" ? "Affaires" : "Loisirs"}
                        </span>
                      </td>
                      <td>{c.nb_avis}</td>
                      <td>{formatDate(c.derniere_visite)}</td>
                      <td>
                        <button
                          type="button"
                          className="admin-btn admin-btn-outline admin-btn-sm"
                          onClick={() => openCompose([c])}
                        >
                          <Send size={13} />
                          Message
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="cp-pagination">
              <button
                type="button"
                className="admin-btn admin-btn-outline admin-btn-sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft size={14} />
                Précédent
              </button>
              <span className="cp-page-info">Page {page} / {totalPages}</span>
              <button
                type="button"
                className="admin-btn admin-btn-outline admin-btn-sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Suivant
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="cp-table-wrap">
          {historiqueLoading ? (
            <div className="aqp-loading">
              <div className="aqp-spinner" />
              <span>Chargement de l'historique…</span>
            </div>
          ) : historique.length === 0 ? (
            <p className="cp-empty">Aucun message envoyé pour le moment.</p>
          ) : (
            <table className="cp-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Type</th>
                  <th>Destinataire</th>
                  <th>Sujet / contenu</th>
                  <th>Statut</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {historique.map((m) => (
                  <tr key={m.id}>
                    <td className="cp-td-name">{m.prenom} {m.nom}</td>
                    <td>
                      {m.type === "email" ? <Mail size={14} /> : <Phone size={14} />}
                      {" "}{m.type === "email" ? "Email" : "SMS"}
                    </td>
                    <td>{m.destinataire}</td>
                    <td className="cp-td-sujet">{m.sujet || "—"}</td>
                    <td>
                      <span className={`cp-badge cp-badge--${m.statut === "envoye" ? "ok" : "fail"}`}>
                        {m.statut === "envoye" ? "Envoyé" : "Échec"}
                      </span>
                      {m.erreur && <div className="cp-erreur-detail">{m.erreur}</div>}
                    </td>
                    <td>{new Date(m.date_envoi).toLocaleString("fr-FR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {compose && (
        <div className="admin-modal-backdrop" role="presentation">
          <div className="admin-modal cp-compose-modal" role="dialog" aria-labelledby="compose-title">
            <button type="button" className="admin-modal-close" onClick={closeCompose} aria-label="Fermer">
              <X size={20} />
            </button>
            <h2 id="compose-title">
              Envoyer un message · {compose.targets.length} destinataire{compose.targets.length > 1 ? "s" : ""}
            </h2>
            <p className="cp-compose-targets">
              {compose.targets.slice(0, 5).map((c) => `${c.prenom} ${c.nom}`).join(", ")}
              {compose.targets.length > 5 ? ` et ${compose.targets.length - 5} autre(s)` : ""}
            </p>

            {!sendResults ? (
              <>
                <div className="cp-compose-type-tabs">
                  <button
                    type="button"
                    className={`cp-type-tab${composeType === "email" ? " is-active" : ""}`}
                    onClick={() => setComposeType("email")}
                  >
                    <Mail size={14} /> Email
                  </button>
                  <button
                    type="button"
                    className={`cp-type-tab${composeType === "sms" ? " is-active" : ""}`}
                    onClick={() => setComposeType("sms")}
                  >
                    <Phone size={14} /> SMS
                  </button>
                </div>

                {composeType === "email" && (
                  <input
                    type="text"
                    className="admin-question-input"
                    placeholder="Sujet de l'email…"
                    value={composeSubject}
                    onChange={(e) => setComposeSubject(e.target.value)}
                    maxLength={MAX_SUBJECT_LEN}
                  />
                )}

                <textarea
                  className="cp-compose-textarea"
                  placeholder={
                    composeType === "email"
                      ? "Votre message… Utilisez {prenom} et {nom} pour personnaliser."
                      : "Votre SMS… Utilisez {prenom} et {nom} pour personnaliser (max 160 car. recommandé)."
                  }
                  value={composeMessage}
                  onChange={(e) => setComposeMessage(e.target.value)}
                  maxLength={MAX_MESSAGE_LEN}
                  rows={6}
                />
                <span className="aqp-char-count">{composeMessage.length}/{MAX_MESSAGE_LEN}</span>

                {previewClient && composeMessage.trim() && (
                  <div className="cp-preview">
                    <span className="cp-preview-label">Aperçu pour {previewClient.prenom} :</span>
                    <p>{previewText}</p>
                  </div>
                )}

                <div className="admin-modal-actions">
                  <button type="button" className="admin-btn admin-btn-outline" onClick={closeCompose} disabled={sending}>
                    Annuler
                  </button>
                  <button
                    type="button"
                    className="admin-btn admin-btn-primary"
                    disabled={sending || !composeMessage.trim() || (composeType === "email" && !composeSubject.trim())}
                    onClick={submitSend}
                  >
                    {sending ? <Loader2 size={15} className="admin-spin" /> : <Send size={15} />}
                    {sending ? "Envoi…" : "Envoyer"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <ul className="cp-results-list">
                  {sendResults.map((r) => (
                    <li key={r.client_id} className={`cp-result-item cp-result-item--${r.statut}`}>
                      {r.statut === "envoye" ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
                      <span>{r.prenom} {r.nom}</span>
                      {r.erreur && <span className="cp-result-erreur">{r.erreur}</span>}
                    </li>
                  ))}
                </ul>
                <div className="admin-modal-actions">
                  <button type="button" className="admin-btn admin-btn-primary" onClick={closeCompose}>
                    Fermer
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
