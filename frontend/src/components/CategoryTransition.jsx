import { CheckCircle2, SkipForward, PenLine } from "lucide-react";
import { CATEGORIES_META, DEPARTEMENTS } from "../constants/ratings";
import CategoryIcon from "./CategoryIcon";
import ScreenLayout from "./ScreenLayout";
import "../style.css";

export default function CategoryTransition({ type, fromDept, toDept, onContinue }) {
  const fromMeta = CATEGORIES_META[fromDept];
  const isLast = !toDept || toDept === "Commentaire";
  const toMeta = !isLast && toDept ? CATEGORIES_META[toDept] : null;
  const skipped = type === "skip";

  return (
    <ScreenLayout mainClassName="category-transition-page">
      <div className="category-transition-inner">
        <div className={`category-transition-card${skipped ? " is-skip" : ""}`}>

          {/* Icône de statut */}
          {skipped ? (
            <div className="ct-skip-badge">
              <SkipForward size={22} color="#b45309" />
            </div>
          ) : (
            <div className="category-transition-celebrate">
              <div className="category-transition-icon-badge">
                <CategoryIcon dept={fromDept} size={30} color="#071b36" />
              </div>
              <CheckCircle2 size={26} color="#15803d" className="category-transition-check-icon" />
            </div>
          )}

          {/* Titre */}
          <h2 className="category-transition-done-title">
            {skipped ? "Étape passée" : fromMeta.doneTitle}
          </h2>
          <p className="category-transition-done-text">
            {skipped
              ? `Pas de souci${toMeta ? ` — passons à « ${toDept} »` : ""}.`
              : fromMeta.doneText}
          </p>

          {/* Prochaine catégorie */}
          {!isLast && toMeta && (
            <div className="category-transition-next">
              <div className="category-transition-arrow">↓</div>
              <p className="category-transition-next-label">Prochaine étape</p>
              <div className="category-transition-next-box">
                <div className="category-transition-next-icon">
                  <CategoryIcon dept={toDept} size={26} color="#071b36" />
                </div>
                <div>
                  <strong>{toDept}</strong>
                  <span>{toMeta.tagline}</span>
                </div>
              </div>
              <p className="category-transition-next-hint">{toMeta.intro}</p>
            </div>
          )}

          {/* Étape finale — invitation au commentaire */}
          {isLast && (
            <div className="category-transition-next">
              <div className="ct-final-box">
                <div className="ct-final-icon-wrap">
                  <PenLine size={24} color="#92400e" />
                </div>
                <div className="ct-final-text">
                  <strong>Qu'est-ce que nous pourrions améliorer ?</strong>
                  <span>Merci de nous le dire, votre avis nous est précieux.</span>
                </div>
              </div>
            </div>
          )}

          <p className="category-transition-progress">
            Étape {fromMeta.step} / {DEPARTEMENTS.length}
            {toMeta && !isLast && ` → étape ${toMeta.step} à venir`}
          </p>

          <button
            type="button"
            className="btn-primary-compact category-transition-btn"
            onClick={onContinue}
          >
            {isLast ? "Continuer" : `Découvrir : ${toDept}`}
          </button>
        </div>
      </div>
    </ScreenLayout>
  );
}
