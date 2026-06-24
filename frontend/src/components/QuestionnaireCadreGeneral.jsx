import { useState, useEffect } from "react";
import { ChevronLeft, Star, ThumbsUp, HelpCircle, ThumbsDown, Sparkles } from "lucide-react";
import { RATING_OPTIONS, CATEGORIES_META, DEPARTEMENTS } from "../constants/ratings";
import { getQuestionText } from "../utils/questions";
import ScreenLayout from "./ScreenLayout";
import CategoryJourney from "./CategoryJourney";
import RatingFace from "./RatingFace";
import "../style.css";

const DEPT = "Cadre Général";
const DEPT_STEP = 7;

const SPECIAL_QUESTIONS = [
  {
    id: "impression",
    type: "stars",
    text: "Quelle est votre impression par rapport à l'hôtel en général ?",
  },
  {
    id: "nps",
    type: "nps",
    text: "Sur une échelle de 0 à 10, quelle est la probabilité que vous recommandiez notre hôtel à votre entourage ?",
    subtitle: "0 = Pas du tout probable · 10 = Extrêmement probable",
  },
  {
    id: "retour",
    type: "choice",
    text: "Envisagez-vous de séjourner à nouveau chez nous lors d'un prochain voyage ?",
    choices: [
      { label: "Oui, certainement",      note: 3, icon: "yes" },
      { label: "Peut-être",              note: 2, icon: "maybe" },
      { label: "Non, probablement pas",  note: 1, icon: "no" },
    ],
  },
];

/* ── Sous-composants pour les questions spéciales ─────────────────────────── */

function StarRating({ onSelect }) {
  const [hovered, setHovered] = useState(null);
  const [selected, setSelected] = useState(null);

  const handleClick = (val) => {
    setSelected(val);
    setTimeout(() => onSelect(val), 380);
  };

  const filled = selected ?? hovered ?? 0;

  return (
    <div className="cadre-star-wrap">
      <div className="cadre-stars">
        {[1, 2, 3, 4, 5].map((val) => (
          <button
            key={val}
            type="button"
            className={`cadre-star-btn${val <= filled ? " cadre-star-btn--active" : ""}${selected === val ? " cadre-star-btn--selected" : ""}`}
            onMouseEnter={() => setHovered(val)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => handleClick(val)}
            aria-label={`${val} étoile${val > 1 ? "s" : ""}`}
          >
            <Star size={44} strokeWidth={1.4} />
          </button>
        ))}
      </div>
      <div className="cadre-star-labels">
        <span>Médiocre</span>
        <span>Exceptionnel</span>
      </div>
    </div>
  );
}

function NpsRating({ onSelect }) {
  const [selected, setSelected] = useState(null);

  const getColor = (val) => {
    if (val <= 3) return "#ef4444";
    if (val <= 6) return "#f97316";
    if (val <= 8) return "#eab308";
    return "#22c55e";
  };

  const handleClick = (val) => {
    setSelected(val);
    setTimeout(() => onSelect(val), 380);
  };

  return (
    <div className="cadre-nps-wrap">
      <div className="cadre-nps-grid">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => {
          const color = getColor(val);
          const isSelected = selected === val;
          return (
            <button
              key={val}
              type="button"
              className={`cadre-nps-btn${isSelected ? " cadre-nps-btn--selected" : ""}`}
              style={
                isSelected
                  ? { background: color, borderColor: color, color: "#fff" }
                  : { "--nps-color": color }
              }
              onClick={() => handleClick(val)}
            >
              {val}
            </button>
          );
        })}
      </div>
      <div className="cadre-nps-labels">
        <span>😞 Pas du tout</span>
        <span>Très probable 😍</span>
      </div>
    </div>
  );
}

const CHOICE_ICONS = {
  yes:   <ThumbsUp   size={22} />,
  maybe: <HelpCircle size={22} />,
  no:    <ThumbsDown size={22} />,
};
const CHOICE_COLORS = {
  yes:   { bg: "#f0fdf4", border: "#22c55e", color: "#15803d", sel: "#16a34a" },
  maybe: { bg: "#fffbeb", border: "#f59e0b", color: "#b45309", sel: "#d97706" },
  no:    { bg: "#fef2f2", border: "#ef4444", color: "#b91c1c", sel: "#dc2626" },
};

function ChoiceQuestion({ choices, onSelect }) {
  const [selected, setSelected] = useState(null);

  const handleClick = (choice) => {
    setSelected(choice.note);
    setTimeout(() => onSelect(choice.note, choice.label), 380);
  };

  return (
    <div className="cadre-choices">
      {choices.map((choice) => {
        const isSelected = selected === choice.note;
        const c = CHOICE_COLORS[choice.icon];
        return (
          <button
            key={choice.note}
            type="button"
            className={`cadre-choice-btn${isSelected ? " cadre-choice-btn--selected" : ""}`}
            style={
              isSelected
                ? { background: c.sel, borderColor: c.sel, color: "#fff" }
                : { background: c.bg, borderColor: c.border, color: c.color }
            }
            onClick={() => handleClick(choice)}
          >
            <span className="cadre-choice-icon">{CHOICE_ICONS[choice.icon]}</span>
            <span className="cadre-choice-label">{choice.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ── Composant principal ───────────────────────────────────────────────────── */

export default function QuestionnaireCadreGeneral({
  categoryQuestions = [],
  onFinish,
  onBack,
  showBack,
  onBackClick,
  savedReponses,
  startAtQuestion,
  onReponse,
  skippedSteps = [],
  completedDepts = [],
}) {
  const hasStandard = categoryQuestions.length > 0;
  const [phase, setPhase]               = useState(hasStandard ? "standard" : "special");
  const [standardIndex, setStandardIndex] = useState(startAtQuestion || 0);
  const [specialIndex, setSpecialIndex]   = useState(0);
  const [reponses, setReponses]           = useState(savedReponses || []);
  const [showIntro, setShowIntro]         = useState(startAtQuestion === 0);

  const meta = CATEGORIES_META[DEPT];
  const totalQuestions = categoryQuestions.length + SPECIAL_QUESTIONS.length;
  const currentQuestionNumber =
    phase === "standard"
      ? standardIndex + 1
      : categoryQuestions.length + specialIndex + 1;
  const progressPct = (currentQuestionNumber / totalQuestions) * 100;

  useEffect(() => {
    if (startAtQuestion === 0) {
      setShowIntro(true);
      const t = setTimeout(() => setShowIntro(false), 2800);
      return () => clearTimeout(t);
    }
    setShowIntro(false);
  }, [startAtQuestion]);

  const handleStandardClick = (value) => {
    const questionLabel = getQuestionText(categoryQuestions[standardIndex]);
    if (onReponse) onReponse(questionLabel, value);
    const newRep = [...reponses, { question: questionLabel, note: value }];
    if (standardIndex < categoryQuestions.length - 1) {
      setStandardIndex(standardIndex + 1);
      setReponses(newRep);
    } else {
      setReponses(newRep);
      setTimeout(() => { setPhase("special"); setSpecialIndex(0); }, 350);
    }
  };

  const handleSpecialAnswer = (value, choiceLabel) => {
    const sq = SPECIAL_QUESTIONS[specialIndex];
    const entry = { question: sq.text, note: value, type: sq.type };
    if (choiceLabel) entry.choiceLabel = choiceLabel;
    if (onReponse) onReponse(sq.text, value);
    const newRep = [...reponses, entry];
    if (specialIndex < SPECIAL_QUESTIONS.length - 1) {
      setReponses(newRep);
      setSpecialIndex(specialIndex + 1);
    } else {
      setTimeout(() => onFinish(newRep, ""), 350);
    }
  };

  const sq = SPECIAL_QUESTIONS[specialIndex];

  return (
    <ScreenLayout mainClassName="page-content">
      <div className="page-content-inner page-content-inner--questionnaire">
        <CategoryJourney currentDept={DEPT} skippedSteps={skippedSteps} completedDepts={completedDepts} />

        {showIntro && (
          <div className="category-intro-banner" role="status">
            <div className="category-intro-icon">
              <Sparkles size={22} color="#ffffff" />
            </div>
            <div>
              <strong>{meta.intro}</strong>
              <span>{meta.tagline}</span>
            </div>
          </div>
        )}

        <div className="q-category-zone q-category-zone--7">
          <div className="q-category-zone-label">
            <span className="q-category-pill">
              Catégorie {DEPT_STEP}/{DEPARTEMENTS.length} · <em>{DEPT}</em>
            </span>
          </div>

          <div className="q-dept-header">
            <div className="q-dept-icon q-dept-icon--pulse">
              <Sparkles size={24} color="#ffffff" />
            </div>
            <h2 className="q-dept-title">{DEPT}</h2>
            <p className="q-dept-tagline">{meta.tagline}</p>
          </div>

          <div className="q-question-progress-wrap">
            <span className="q-question-progress-label">
              Question {currentQuestionNumber} sur {totalQuestions}
            </span>
            <div className="q-question-progress-bar">
              <div className="q-question-progress-fill" style={{ width: `${progressPct}%` }} />
            </div>
          </div>

          {phase === "standard" ? (
            <>
              <h3 className="q-question-text">{getQuestionText(categoryQuestions[standardIndex])}</h3>
              <div className="q-rating-grid">
                {RATING_OPTIONS.map((opt) => (
                  <div
                    key={opt.value}
                    role="button"
                    tabIndex={0}
                    className={`q-rating-card q-rating-card--${opt.value}`}
                    onClick={() => handleStandardClick(opt.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleStandardClick(opt.value)}
                  >
                    <div className="q-rating-icon-wrap"><RatingFace value={opt.value} /></div>
                    <p className="q-rating-label">{opt.label}</p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <h3 className="q-question-text q-question-text--special">{sq.text}</h3>
              {sq.subtitle && <p className="cadre-question-subtitle">{sq.subtitle}</p>}

              {sq.type === "stars" && (
                <StarRating key={`stars-${specialIndex}`} onSelect={handleSpecialAnswer} />
              )}
              {sq.type === "nps" && (
                <NpsRating key={`nps-${specialIndex}`} onSelect={handleSpecialAnswer} />
              )}
              {sq.type === "choice" && (
                <ChoiceQuestion key={`choice-${specialIndex}`} choices={sq.choices} onSelect={handleSpecialAnswer} />
              )}
            </>
          )}
        </div>

        <div className="q-skip-wrap">
          {showBack && onBackClick && (
            <button type="button" className="btn-secondary-compact" onClick={onBackClick}>
              <ChevronLeft size={14} /> Retour
            </button>
          )}
          <button type="button" className="btn-skip-category" onClick={onBack}>
            Passer cette catégorie
          </button>
        </div>
      </div>
    </ScreenLayout>
  );
}
