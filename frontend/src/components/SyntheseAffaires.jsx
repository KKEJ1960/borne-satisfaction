import { useState } from "react";
import { Briefcase, Send, Edit2, CheckCircle } from "lucide-react";
import { NOTE_LABELS, NOTE_COLORS, NOTE_EMOJIS, RATING_OPTIONS } from "../constants/ratings";
import ScreenLayout from "./ScreenLayout";
import "../style.css";

function NoteBadge({ note }) {
  return (
    <span
      className="note-badge"
      style={{
        color: NOTE_COLORS[note],
        borderColor: `${NOTE_COLORS[note]}40`,
        backgroundColor: `${NOTE_COLORS[note]}12`,
      }}
    >
      <span className="note-badge-emoji" aria-hidden="true">{NOTE_EMOJIS[note]}</span>
      {NOTE_LABELS[note]}
    </span>
  );
}

function RatingPicker({ value, onSelect }) {
  return (
    <div className="rating-picker">
      {RATING_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={`rating-picker-btn${value === opt.value ? " is-selected" : ""}`}
          style={value === opt.value ? { borderColor: opt.borderColor, background: opt.bg, color: opt.color } : undefined}
          onClick={() => onSelect(opt.value)}
        >
          <span className="rating-picker-emoji" aria-hidden="true">{opt.emoji}</span>
          <span>{opt.label}</span>
        </button>
      ))}
    </div>
  );
}

export default function SyntheseAffaires({
  reponses = [],
  commentaire = "",
  client,
  onUpdateReponse,
  onUpdateCommentaire,
  onConfirm,
}) {
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingComment, setEditingComment] = useState(false);
  const [localCommentaire, setLocalCommentaire] = useState(commentaire);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");

  const standard = reponses.filter((r) => r.note != null);
  const moyenne = standard.length
    ? (standard.reduce((s, r) => s + r.note, 0) / standard.length).toFixed(1)
    : "—";

  const handleConfirm = async () => {
    setSending(true);
    setSendError("");
    try {
      await onConfirm();
    } catch (err) {
      setSendError(
        err.response?.data?.error || err.message || "Envoi impossible. Vérifiez que le backend est démarré."
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <ScreenLayout mainClassName="synthese-page">
      <div className="synthese-page-inner">

        <header className="synthese-header">
          <div className="synthese-header-icon affaires-header-icon">
            <CheckCircle size={22} color="#c9a84c" />
          </div>
          <h1 className="synthese-title">Récapitulatif de votre séjour professionnel</h1>
          <p className="synthese-subtitle">
            Vérifiez vos réponses avant envoi. Cliquez sur une note pour la modifier.
          </p>
        </header>

        {/* Informations client */}
        <section className="synthese-card synthese-client-card">
          <h2 className="synthese-card-title">Informations client</h2>
          <div className="synthese-client-grid">
            <div>
              <span className="synthese-label">Prénom</span>
              <p>{client?.prenom || "—"}</p>
            </div>
            <div>
              <span className="synthese-label">Nom</span>
              <p>{client?.nom || "—"}</p>
            </div>
            <div>
              <span className="synthese-label">Téléphone</span>
              <p>{client?.telephone || "—"}</p>
            </div>
            {client?.numero_chambre && (
              <div>
                <span className="synthese-label">Chambre</span>
                <p>{client.numero_chambre}</p>
              </div>
            )}
            {client?.email && (
              <div>
                <span className="synthese-label">Email</span>
                <p>{client.email}</p>
              </div>
            )}
          </div>
          <div className="affaires-synthese-type-badge">
            <Briefcase size={12} />
            Tourisme Professionnel
          </div>
        </section>

        {/* Réponses */}
        <section className="synthese-card synthese-category-card">
          <div className="synthese-category-head">
            <div className="synthese-category-title">
              <span className="synthese-category-icon">
                <Briefcase size={18} color="#071b36" />
              </span>
              <h3>Évaluation professionnelle</h3>
            </div>
            {moyenne !== "—" && (
              <span className="synthese-badge synthese-badge-ok">Moy. {moyenne}/4</span>
            )}
          </div>

          {reponses.map((rep, idx) => {
            const isEditing = editingIndex === idx;
            return (
              <div key={idx} className="synthese-question-row">
                <p className="synthese-question-text">{rep.question}</p>
                {!isEditing ? (
                  <button
                    type="button"
                    className="synthese-note-edit"
                    onClick={() => setEditingIndex(idx)}
                  >
                    <NoteBadge note={rep.note} />
                    <Edit2 size={12} color="#64748b" />
                  </button>
                ) : (
                  <RatingPicker
                    value={rep.note}
                    onSelect={(note) => {
                      onUpdateReponse(idx, note);
                      setEditingIndex(null);
                    }}
                  />
                )}
              </div>
            );
          })}
        </section>

        {/* Commentaire */}
        <section className="synthese-card">
          <div className="synthese-category-head">
            <h2 className="synthese-card-title" style={{ margin: 0 }}>Commentaire global</h2>
            {!editingComment && (
              <button
                type="button"
                className="btn-secondary-compact"
                onClick={() => setEditingComment(true)}
              >
                Modifier
              </button>
            )}
          </div>
          {editingComment ? (
            <>
              <textarea
                className="synthese-textarea"
                value={localCommentaire}
                onChange={(e) => setLocalCommentaire(e.target.value)}
                placeholder="Votre commentaire (optionnel)…"
              />
              <div className="synthese-actions">
                <button
                  type="button"
                  className="btn-secondary-compact"
                  onClick={() => { setEditingComment(false); setLocalCommentaire(commentaire || ""); }}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  className="btn-primary-compact"
                  onClick={() => { onUpdateCommentaire(localCommentaire); setEditingComment(false); }}
                >
                  Enregistrer
                </button>
              </div>
            </>
          ) : (
            <p className="synthese-comment-display">
              {localCommentaire || "Aucun commentaire ajouté."}
            </p>
          )}
        </section>

        <footer className="synthese-footer">
          {sendError && (
            <div className="message error synthese-send-error">{sendError}</div>
          )}
          <button
            type="button"
            className="btn-primary-compact btn-send"
            onClick={handleConfirm}
            disabled={sending}
          >
            <Send size={16} />
            {sending ? "Envoi en cours…" : "Confirmer et envoyer"}
          </button>
          <p className="synthese-footer-note">
            Vos réponses sont confidentielles et nous aident à améliorer votre expérience.
          </p>
        </footer>
      </div>
    </ScreenLayout>
  );
}
