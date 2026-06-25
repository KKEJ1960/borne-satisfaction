import { useState } from "react";
import { Briefcase } from "lucide-react";
import { RATING_OPTIONS } from "../constants/ratings";
import { getQuestionText } from "../utils/questions";
import ScreenLayout from "./ScreenLayout";
import RatingFace from "./RatingFace";
import "../style.css";

export default function QuestionnaireAffaires({ categoryQuestions = [], onFinish }) {
  const [index, setIndex] = useState(0);
  const [reponses, setReponses] = useState([]);

  const hasQuestions = categoryQuestions.length > 0;
  const currentText = hasQuestions ? getQuestionText(categoryQuestions[index]) : "";
  const progressPct = hasQuestions ? ((index + 1) / categoryQuestions.length) * 100 : 0;

  const handleClick = (value) => {
    const newReponses = [...reponses, { question: currentText, note: value }];
    if (index < categoryQuestions.length - 1) {
      setReponses(newReponses);
      setIndex(index + 1);
    } else {
      setTimeout(() => onFinish(newReponses, ""), 350);
    }
  };

  if (!hasQuestions) {
    return (
      <ScreenLayout mainClassName="page-content">
        <div className="page-content-inner page-content-inner--questionnaire">
          <div className="affaires-banner">
            <div className="affaires-banner-icon">
              <Briefcase size={18} color="#c9a84c" />
            </div>
            <div className="affaires-banner-text">
              <strong>Séjour Professionnel</strong>
              <span>Évaluez votre expérience d'affaires à l'Hôtel Président</span>
            </div>
          </div>
          <div className="q-empty-state">
            <p className="q-empty-message">
              Le questionnaire est temporairement indisponible. Vous pouvez continuer.
            </p>
            <button type="button" className="btn-skip-category" onClick={() => onFinish([], "")}>
              Continuer
            </button>
          </div>
        </div>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout mainClassName="page-content">
      <div className="page-content-inner page-content-inner--questionnaire">

        <div className="affaires-banner">
          <div className="affaires-banner-icon">
            <Briefcase size={18} color="#c9a84c" />
          </div>
          <div className="affaires-banner-text">
            <strong>Séjour Professionnel</strong>
            <span>Évaluez votre expérience d'affaires à l'Hôtel Président</span>
          </div>
        </div>

        <div className="q-category-zone q-category-zone--affaires">
          <div className="q-category-zone-label">
            <span className="q-category-pill affaires-pill">
              Tourisme d'affaires · <em>Question {index + 1} / {categoryQuestions.length}</em>
            </span>
          </div>

          <div className="q-dept-header">
            <div className="q-dept-icon q-dept-icon--pulse affaires-dept-icon">
              <Briefcase size={24} color="#ffffff" />
            </div>
            <h2 className="q-dept-title">Tourisme Professionnel</h2>
            <p className="q-dept-tagline">Votre satisfaction professionnelle est notre priorité</p>
          </div>

          <div className="q-question-progress-wrap">
            <span className="q-question-progress-label">
              Question {index + 1} sur {categoryQuestions.length}
            </span>
            <div className="q-question-progress-bar">
              <div
                className="q-question-progress-fill affaires-progress-fill"
                style={{ width: `${progressPct}%` }}
              />
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
      </div>
    </ScreenLayout>
  );
}
