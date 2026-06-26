import { DEPARTEMENTS, CATEGORIES_META } from "../constants/ratings";
import CategoryIcon from "./CategoryIcon";
import "../style.css";

export default function CategoryJourney({
  currentDept,
  skippedSteps = [],
  completedDepts = [],
  departements = DEPARTEMENTS,
  categoriesMeta = CATEGORIES_META,
}) {
  return (
    <nav className="category-journey" aria-label="Parcours des catégories">
      <p className="category-journey-title">Votre parcours</p>
      <ol className="category-journey-steps">
        {departements.map((dept) => {
          const isCurrent = dept === currentDept;
          const isSkipped = skippedSteps.includes(dept);
          const isDone = completedDepts.includes(dept) || isSkipped;
          const status = isCurrent ? "current" : isDone ? (isSkipped ? "skipped" : "done") : "upcoming";

          return (
            <li
              key={dept}
              className={`category-journey-step category-journey-step--${status}`}
              aria-current={isCurrent ? "step" : undefined}
            >
              <span className="category-journey-icon-wrap">
                <CategoryIcon
                  dept={dept}
                  size={isCurrent ? 18 : 16}
                  color={isCurrent ? "#071b36" : isDone && !isSkipped ? "#15803d" : "#64748b"}
                />
              </span>
              <span className="category-journey-name">{categoriesMeta[dept]?.shortName ?? dept}</span>
              {isCurrent && <span className="category-journey-here">Vous êtes ici</span>}
              {status === "done" && !isSkipped && <span className="category-journey-check">✓</span>}
              {isSkipped && !isCurrent && <span className="category-journey-skip-label">—</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
