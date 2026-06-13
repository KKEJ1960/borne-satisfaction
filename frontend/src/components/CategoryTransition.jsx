import { CheckCircle2 } from "lucide-react";
import { CATEGORIES_META, DEPARTEMENTS } from "../constants/ratings";
import CategoryIcon from "./CategoryIcon";
import ScreenLayout from "./ScreenLayout";
import "../style.css";

export default function CategoryTransition({
  type,
  fromDept,
  toDept,
  onContinue,
}) {
  const fromMeta = CATEGORIES_META[fromDept];
  const isLast = !toDept || toDept === "Commentaire";
  const toMeta = !isLast && toDept ? CATEGORIES_META[toDept] : null;
  const skipped = type === "skip";

  return (
    <ScreenLayout mainClassName="category-transition-page">
      <div className="category-transition-inner">
        <div className={`category-transition-card${skipped ? " is-skip" : ""}`}>
          {!skipped && (
            <div className="category-transition-celebrate" aria-hidden="true">
              <div className="category-transition-icon-badge">
                <CategoryIcon dept={fromDept} size={32} color="#071b36" />
              </div>
              <CheckCircle2 size={28} color="#15803d" className="category-transition-check-icon" />
            </div>
          )}

          <h2 className="category-transition-done-title">
            {skipped ? "Catégorie passée" : fromMeta.doneTitle}
          </h2>
          <p className="category-transition-done-text">
            {skipped
              ? `Pas de souci, nous passons ${toMeta ? "à la suite" : "à la fin"} sans noter « ${fromDept} ».`
              : fromMeta.doneText}
          </p>

          {!isLast && toMeta && (
            <div className="category-transition-next">
              <div className="category-transition-arrow" aria-hidden="true">
                ↓
              </div>
              <p className="category-transition-next-label">Prochaine étape</p>
              <div className="category-transition-next-box">
                <div className="category-transition-next-icon">
                  <CategoryIcon dept={toDept} size={28} color="#071b36" />
                </div>
                <div>
                  <strong>{toDept}</strong>
                  <span>{toMeta.tagline}</span>
                </div>
              </div>
              <p className="category-transition-next-hint">{toMeta.intro}</p>
            </div>
          )}

          {isLast && (
            <div className="category-transition-next">
              <div className="category-transition-next-box category-transition-next-box--final">
                <div className="category-transition-next-icon">
                  <CategoryIcon dept="Commentaire" size={28} color="#071b36" />
                </div>
                <div>
                  <strong>Un dernier mot ?</strong>
                  <span>Commentaire optionnel sur votre séjour</span>
                </div>
              </div>
            </div>
          )}

          <p className="category-transition-progress">
            Étape {fromMeta.step} / {DEPARTEMENTS.length}
            {toMeta && !isLast && ` → ${toMeta.step} à venir`}
          </p>

          <button type="button" className="btn-primary-compact category-transition-btn" onClick={onContinue}>
            {isLast ? "Continuer" : `Découvrir : ${toDept}`}
          </button>
        </div>
      </div>
    </ScreenLayout>
  );
}
