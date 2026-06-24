import React, { useState } from "react";
import {
  CheckCircle,
  Send,
  Edit2,
  ConciergeBell,
  Bed,
  Coffee,
  Eye,
  Flame,
  Palmtree,
  Sparkles,
  MessageSquare,
} from "lucide-react";
import {
  NOTE_LABELS,
  NOTE_COLORS,
  NOTE_EMOJIS,
  RATING_OPTIONS,
  DEPARTEMENTS,
} from "../constants/ratings";
import { getQuestionText } from "../utils/questions";
import ScreenLayout from "./ScreenLayout";
import "../style.css";

const CATEGORY_ICONS = {
  Accueil: ConciergeBell,
  Chambres: Bed,
  "Le Bandama Petit Déjeuner": Coffee,
  "Le Panoramique": Eye,
  "L'Alocodrome": Flame,
  "Loisirs et Divertissements": Palmtree,
  "Cadre Général": Sparkles,
};

function NoteBadge({ note, compact }) {
  return (
    <span
      className="note-badge"
      style={{
        color: NOTE_COLORS[note],
        borderColor: `${NOTE_COLORS[note]}40`,
        backgroundColor: `${NOTE_COLORS[note]}12`,
        fontSize: compact ? "0.7rem" : "0.75rem",
      }}
    >
      <span className="note-badge-emoji" aria-hidden="true">
        {NOTE_EMOJIS[note]}
      </span>
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
          style={
            value === opt.value
              ? {
                  borderColor: opt.borderColor,
                  background: opt.bg,
                  color: opt.color,
                }
              : undefined
          }
          onClick={() => onSelect(opt.value)}
        >
          <span className="rating-picker-emoji" aria-hidden="true">
            {opt.emoji}
          </span>
          <span>{opt.label}</span>
        </button>
      ))}
    </div>
  );
}

export default function SynthesePage({
  allReponses,
  commentaireGlobal,
  skippedSteps,
  questions = {},
  onUpdateReponse,
  onSetCategoryReponses,
  onUpdateCommentaireGlobal,
  onConfirm,
  client,
}) {
  const [editingResponse, setEditingResponse] = useState(null);
  const [editingComment, setEditingComment] = useState(false);
  const [localCommentaire, setLocalCommentaire] = useState(commentaireGlobal || "");
  const [evaluatingCategory, setEvaluatingCategory] = useState(null);
  const [evalStepIndex, setEvalStepIndex] = useState(0);
  const [pendingEvalNote, setPendingEvalNote] = useState(null);
  const [newCategoryResponses, setNewCategoryResponses] = useState({});
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");

  const calculateMoyenne = (reponses) => {
    if (!reponses?.length) return "—";
    const standard = reponses.filter((r) => !r.type);
    if (!standard.length) return "—";
    const sum = standard.reduce((acc, r) => acc + (r.note || 0), 0);
    return (sum / standard.length).toFixed(1);
  };

  const handleStartEvaluation = (dept) => {
    const deptQuestions = questions[dept] || [];
    setEvaluatingCategory(dept);
    setEvalStepIndex(0);
    setPendingEvalNote(null);
    setNewCategoryResponses((prev) => ({
      ...prev,
      [dept]: deptQuestions.map((q) => ({ question: getQuestionText(q), note: null })),
    }));
  };

  const finishCategoryEvaluation = (dept, updatedList) => {
    const responses = updatedList.filter((r) => r.note !== null);
    if (responses.length > 0 && onSetCategoryReponses) {
      onSetCategoryReponses(
        dept,
        responses.map((r) => ({ question: r.question, note: r.note }))
      );
    }
    setEvaluatingCategory(null);
    setEvalStepIndex(0);
    setPendingEvalNote(null);
    setNewCategoryResponses((prev) => {
      const next = { ...prev };
      delete next[dept];
      return next;
    });
  };

  const handleEvalPickNote = (note) => {
    setPendingEvalNote(note);
  };

  const handleEvalContinue = (dept) => {
    if (pendingEvalNote == null) return;

    const deptQuestions = questions[dept] || [];
    const idx = evalStepIndex;
    const currentList = newCategoryResponses[dept] || [];
    const updated = currentList.map((rep, i) =>
      i === idx ? { ...rep, note: pendingEvalNote } : rep
    );

    setPendingEvalNote(null);

    if (idx < deptQuestions.length - 1) {
      setNewCategoryResponses((prev) => ({ ...prev, [dept]: updated }));
      setEvalStepIndex(idx + 1);
    } else {
      finishCategoryEvaluation(dept, updated);
    }
  };

  const handleEvalSavePartial = (dept) => {
    const currentList = newCategoryResponses[dept] || [];
    const withPending =
      pendingEvalNote != null
        ? currentList.map((rep, i) =>
            i === evalStepIndex ? { ...rep, note: pendingEvalNote } : rep
          )
        : currentList;
    const answered = withPending.filter((r) => r.note != null);
    if (answered.length > 0) {
      finishCategoryEvaluation(dept, withPending);
    } else {
      handleCancelEvaluation(dept);
    }
  };

  const handleCancelEvaluation = (dept) => {
    setEvaluatingCategory(null);
    setEvalStepIndex(0);
    setPendingEvalNote(null);
    setNewCategoryResponses((prev) => {
      const next = { ...prev };
      delete next[dept];
      return next;
    });
  };

  const handleConfirmSend = async () => {
    setSending(true);
    setSendError("");
    try {
      await onConfirm();
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.message ||
        "Envoi impossible. Vérifiez que le serveur backend est démarré.";
      setSendError(msg);
    } finally {
      setSending(false);
    }
  };

  const handleNoteChange = (dept, questionIndex, newNote) => {
    onUpdateReponse?.(dept, questionIndex, newNote);
    setEditingResponse(null);
  };

  return (
    <ScreenLayout mainClassName="synthese-page">
      <div className="synthese-page-inner">
        <header className="synthese-header">
          <div className="synthese-header-icon">
            <CheckCircle size={22} color="#071b36" />
          </div>
          <h1 className="synthese-title">Récapitulatif de votre séjour</h1>
          <p className="synthese-subtitle">
            Vérifiez vos réponses avant envoi. Cliquez sur une note pour la modifier.
          </p>
        </header>

        <section className="synthese-card synthese-client-card">
          <h2 className="synthese-card-title">Informations client</h2>
          <div className="synthese-client-grid">
            <div>
              <span className="synthese-label">Nom</span>
              <p>{client?.nom || "—"}</p>
            </div>
            <div>
              <span className="synthese-label">Prénom</span>
              <p>{client?.prenom || "—"}</p>
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
        </section>

        <div className="synthese-categories">
          {DEPARTEMENTS.map((dept) => {
            const Icon = CATEGORY_ICONS[dept];
            const deptData = allReponses[dept];
            const hasResponses = deptData?.reponses?.length > 0;
            const isSkipped = skippedSteps.includes(dept) && !hasResponses;
            const isEvaluating = evaluatingCategory === dept;
            const deptQuestions = questions[dept] || [];

            return (
              <section key={dept} className="synthese-card synthese-category-card">
                <div className="synthese-category-head">
                  <div className="synthese-category-title">
                    {Icon && (
                    <span className="synthese-category-icon">
                      <Icon size={18} color="#071b36" />
                    </span>
                  )}
                    <h3>{dept}</h3>
                  </div>
                  {hasResponses && (
                    <span className="synthese-badge synthese-badge-ok">
                      Moy. {calculateMoyenne(deptData.reponses)}/4
                    </span>
                  )}
                  {isSkipped && !isEvaluating && (
                    <span className="synthese-badge synthese-badge-muted">Non évalué</span>
                  )}
                </div>

                {isEvaluating ? (
                  <div className="synthese-eval-block">
                    <p className="synthese-eval-progress">
                      Question {evalStepIndex + 1} / {deptQuestions.length || 0}
                    </p>
                    {evalStepIndex > 0 && (
                      <div className="synthese-eval-done">
                        {newCategoryResponses[dept]
                          ?.slice(0, evalStepIndex)
                          .map((r, i) => (
                            <div key={i} className="synthese-eval-done-row">
                              <span className="synthese-eval-done-q">{r.question}</span>
                              <NoteBadge note={r.note} compact />
                            </div>
                          ))}
                      </div>
                    )}
                    <p className="synthese-question-text synthese-question-current">
                      {getQuestionText(deptQuestions[evalStepIndex])}
                    </p>
                    {pendingEvalNote == null ? (
                      <RatingPicker value={null} onSelect={handleEvalPickNote} />
                    ) : (
                      <div className="synthese-eval-confirm">
                        <p className="synthese-eval-confirm-label">Votre choix :</p>
                        <NoteBadge note={pendingEvalNote} />
                        <div className="synthese-actions synthese-eval-confirm-actions">
                          <button
                            type="button"
                            className="btn-primary-compact"
                            onClick={() => handleEvalContinue(dept)}
                          >
                            {evalStepIndex < deptQuestions.length - 1
                              ? "Continuer"
                              : "Terminer cette catégorie"}
                          </button>
                          <button
                            type="button"
                            className="btn-secondary-compact"
                            onClick={() => setPendingEvalNote(null)}
                          >
                            Changer
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="synthese-actions synthese-eval-footer-actions">
                      <button
                        type="button"
                        className="btn-secondary-compact"
                        onClick={() => handleCancelEvaluation(dept)}
                      >
                        Passer cette catégorie
                      </button>
                      {evalStepIndex > 0 && (
                        <button
                          type="button"
                          className="btn-secondary-compact"
                          onClick={() => handleEvalSavePartial(dept)}
                        >
                          Enregistrer et passer le reste
                        </button>
                      )}
                    </div>
                  </div>
                ) : isSkipped ? (
                  <div className="synthese-empty-block">
                    <p>Cette catégorie n'a pas été évaluée.</p>
                    <button
                      type="button"
                      className="btn-primary-compact"
                      onClick={() => handleStartEvaluation(dept)}
                    >
                      Évaluer maintenant
                    </button>
                  </div>
                ) : hasResponses ? (
                  <div>
                    {deptData.reponses.map((rep, idx) => {
                      const isSpecial = !!rep.type;
                      const isEditing =
                        !isSpecial &&
                        editingResponse?.dept === dept &&
                        editingResponse?.questionIndex === idx;
                      const specialLabel = isSpecial
                        ? rep.type === "stars"  ? `${rep.note}/5 ★`
                        : rep.type === "nps"    ? `${rep.note}/10`
                        : rep.type === "choice" ? (rep.choiceLabel || String(rep.note))
                        : String(rep.note)
                        : null;
                      return (
                        <div key={idx} className="synthese-question-row">
                          <p className="synthese-question-text">{rep.question}</p>
                          {isSpecial ? (
                            <span className="synthese-special-badge">{specialLabel}</span>
                          ) : !isEditing ? (
                            <button
                              type="button"
                              className="synthese-note-edit"
                              onClick={() =>
                                setEditingResponse({ dept, questionIndex: idx })
                              }
                            >
                              <NoteBadge note={rep.note} />
                              <Edit2 size={12} color="#64748b" />
                            </button>
                          ) : (
                            <RatingPicker
                              value={rep.note}
                              onSelect={(note) => handleNoteChange(dept, idx, note)}
                            />
                          )}
                        </div>
                      );
                    })}
                    {deptData.commentaire && (
                      <p className="synthese-dept-comment">
                        <MessageSquare size={12} /> {deptData.commentaire}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="synthese-empty-text">Aucune réponse enregistrée.</p>
                )}
              </section>
            );
          })}
        </div>

        <section className="synthese-card">
          <div className="synthese-category-head">
            <h2 className="synthese-card-title" style={{ margin: 0 }}>
              Commentaire global
            </h2>
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
                  onClick={() => {
                    setEditingComment(false);
                    setLocalCommentaire(commentaireGlobal || "");
                  }}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  className="btn-primary-compact"
                  onClick={() => {
                    onUpdateCommentaireGlobal?.(localCommentaire);
                    setEditingComment(false);
                  }}
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
          {sendError && <div className="message error synthese-send-error">{sendError}</div>}
          <button
            type="button"
            className="btn-primary-compact btn-send"
            onClick={handleConfirmSend}
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
