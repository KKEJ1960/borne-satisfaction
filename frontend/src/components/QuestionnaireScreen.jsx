import { useState, useEffect } from "react";
import { ChevronLeft, Briefcase } from "lucide-react";
import { RATING_OPTIONS, CATEGORIES_META, DEPARTEMENTS } from "../constants/ratings";
import { getQuestionText } from "../utils/questions";
import ScreenLayout from "./ScreenLayout";
import CategoryJourney from "./CategoryJourney";
import RatingFace from "./RatingFace";
import "../style.css";

export default function QuestionnaireScreen({
  deptName,
  deptStep,
  Icon,
  questions = [],
  onFinish,
  onBack,
  showBack,
  onBackClick,
  savedReponses,
  startAtQuestion,
  onReponse,
  skippedSteps = [],
  completedDepts = [],
  variant = "",
  categoriesMeta = CATEGORIES_META,
  totalSteps = DEPARTEMENTS.length,
}) {
  const [index, setIndex] = useState(startAtQuestion || 0);
  const [reponses, setReponses] = useState(savedReponses || []);
  const [showIntro, setShowIntro] = useState(startAtQuestion === 0);

  const meta = categoriesMeta[deptName];
  const hasQuestions = Array.isArray(questions) && questions.length > 0;
  const currentText = hasQuestions ? getQuestionText(questions[index]) : "";
  const isAffaires = variant === "affaires";

  useEffect(() => {
    if (startAtQuestion === 0) {
      setShowIntro(true);
      const t = setTimeout(() => setShowIntro(false), 2800);
      return () => clearTimeout(t);
    }
    setShowIntro(false);
  }, [deptName, startAtQuestion]);

  const handleClick = (value) => {
    const questionLabel = currentText;
    if (onReponse) {
      onReponse(questionLabel, value);
    }
    const newReponses = [...reponses, { question: questionLabel, note: value }];
    if (index < questions.length - 1) {
      setIndex(index + 1);
      setReponses(newReponses);
    } else {
      setReponses(newReponses);
      setTimeout(() => onFinish(newReponses, ""), 350);
    }
  };

  if (!hasQuestions) {
    return (
      <ScreenLayout mainClassName="page-content" variant={variant}>
        <div className="page-content-inner page-content-inner--questionnaire">
          <p className="q-empty-message">Aucune question configurée pour cette catégorie.</p>
          <button type="button" className="btn-skip-category" onClick={onBack}>
            Passer cette catégorie
          </button>
        </div>
      </ScreenLayout>
    );
  }

  const questionProgress = ((index + 1) / questions.length) * 100;

  return (
    <ScreenLayout mainClassName="page-content" variant={variant}>
      <div className="page-content-inner page-content-inner--questionnaire">
        {isAffaires ? (
          <div className="affaires-badge">
            <Briefcase size={11} />
            Affaires / Professionnel
          </div>
        ) : (
          <CategoryJourney
            currentDept={deptName}
            skippedSteps={skippedSteps}
            completedDepts={completedDepts}
          />
        )}

        {showIntro && meta && (
          <div className="category-intro-banner" role="status">
            <div className="category-intro-icon">
              {Icon && <Icon size={22} color="#ffffff" />}
            </div>
            <div>
              <strong>{meta.intro}</strong>
              <span>{meta.tagline}</span>
            </div>
          </div>
        )}

        <div className={`q-category-zone q-category-zone--${deptStep}`}>
          <div className="q-category-zone-label">
            <span className="q-category-pill">
              Catégorie {deptStep}/{totalSteps} · <em>{deptName}</em>
            </span>
          </div>

          <div className="q-dept-header">
            <div className="q-dept-icon q-dept-icon--pulse">
              {Icon && <Icon size={24} color="#ffffff" />}
            </div>
            <h2 className="q-dept-title">{deptName}</h2>
            {meta && <p className="q-dept-tagline">{meta.tagline}</p>}
          </div>

          <div className="q-question-progress-wrap">
            <span className="q-question-progress-label">
              Question {index + 1} sur {questions.length}
            </span>
            <div className="q-question-progress-bar">
              <div className="q-question-progress-fill" style={{ width: `${questionProgress}%` }} />
            </div>
          </div>

          <h3 className="q-question-text">{currentText}</h3>

          <div className="q-rating-grid">
            {RATING_OPTIONS.map((opt) => (
              <div
                key={opt.value}
                role="button"
                tabIndex={0}
                className={`q-rating-card q-rating-card--${opt.value}`}
                onClick={() => handleClick(opt.value)}
                onKeyDown={(e) => e.key === "Enter" && handleClick(opt.value)}
              >
                <div className="q-rating-icon-wrap">
                  <RatingFace value={opt.value} />
                </div>
                <p className="q-rating-label">{opt.label}</p>
              </div>
            ))}
          </div>
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
