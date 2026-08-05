import { useState, useEffect } from "react";
import axios from "axios";
import { API_URL } from "../../config/api";
import { getQuestionText } from "../../utils/questions";
import { CATEGORY_ICONS } from "../CategoryIcon";
import ScreenLayout from "../ScreenLayout";
import QuestionnaireScreen from "../QuestionnaireScreen";

/**
 * Questionnaire générique HP Resort — une seule catégorie par instance,
 * charge l'ensemble des questions de l'hôtel (GET /questions?hotel_id=)
 * une fois, puis affiche celles de `categorie` via le même moteur
 * QuestionnaireScreen (notation 1-4 + emoji) que l'Hôtel Président.
 */
export default function QuestionnaireHPResort({ categorie, hotelId, departements = [], ...rest }) {
  const [questionsByCategorie, setQuestionsByCategorie] = useState(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await axios.get(`${API_URL}/questions`, {
          params: { hotel_id: hotelId },
          timeout: 10000,
        });
        if (!cancelled) setQuestionsByCategorie(res.data || {});
      } catch {
        if (!cancelled) setLoadError(true);
      }
    })();
    return () => { cancelled = true; };
  }, [hotelId]);

  if (loadError) {
    return (
      <ScreenLayout mainClassName="page-content">
        <div className="page-content-inner page-content-inner--questionnaire">
          <p className="q-empty-message">Impossible de charger les questions. Vérifiez votre connexion.</p>
        </div>
      </ScreenLayout>
    );
  }

  if (!questionsByCategorie) {
    return (
      <ScreenLayout mainClassName="page-content">
        <div className="page-content-inner page-content-inner--questionnaire">
          <p className="q-empty-message">Chargement des questions…</p>
        </div>
      </ScreenLayout>
    );
  }

  const categoryQuestions = (questionsByCategorie[categorie] || []).map((q) => ({
    ...q,
    texte: getQuestionText(q),
  }));
  const deptStep = Math.max(1, departements.indexOf(categorie) + 1);
  const Icon = CATEGORY_ICONS[categorie];

  return (
    <QuestionnaireScreen
      deptName={categorie}
      deptStep={deptStep}
      Icon={Icon}
      questions={categoryQuestions}
      departements={departements}
      totalSteps={departements.length}
      {...rest}
    />
  );
}
