import React, { useState, useEffect } from "react";
import axios from "axios";
import ClientForm from "./components/ClientForm";
import Dashboard from "./components/Dashboard";
import SuperAdminDashboard from "./components/SuperAdminDashboard";
import WelcomePage from "./components/WelcomePage";
import QuestionnaireAccueil from "./components/QuestionnaireAccueil";
import QuestionnaireChambres from "./components/QuestionnaireChambres";
import QuestionnaireBandama from "./components/QuestionnaireBandama";
import QuestionnairePanoramique from "./components/QuestionnairePanoramique";
import QuestionnaireAlocodrome from "./components/QuestionnaireAlocodrome";
import QuestionnaireLoisirs from "./components/QuestionnaireLoisirs";
import QuestionnaireCadreGeneral from "./components/QuestionnaireCadreGeneral";
import QuestionnaireAccueilAffaires from "./components/QuestionnaireAccueilAffaires";
import QuestionnaireChambreAffaires from "./components/QuestionnaireChambreAffaires";
import QuestionnaireCommercial from "./components/QuestionnaireCommercial";
import QuestionnaireRestaurantsAffaires from "./components/QuestionnaireRestaurantsAffaires";
import QuestionnaireLoisirsDivertissementsAffaires from "./components/QuestionnaireLoisirsDivertissementsAffaires";
import QuestionnaireCadreGeneralAffaires from "./components/QuestionnaireCadreGeneralAffaires";
import CommentaireFinal from "./components/CommentaireFinal";
import SynthesePage from "./components/SynthesePage";
import ThankYouPage from "./components/ThankYouPage";
import CategoryTransition from "./components/CategoryTransition";
import {
  getNextCategory,
  DEPARTEMENTS,
  getNextCategoryAffaires,
  DEPARTEMENTS_AFFAIRES,
  AFFAIRES_CATEGORIES_META,
} from "./constants/ratings";
import { API_URL } from "./config/api";
import { authHeaders, clearAdminToken } from "./config/auth";
import { withQuestionsFallback } from "./utils/questions";
import "./style.css";

const makeInitialReponses = () =>
  Object.fromEntries(DEPARTEMENTS.map((d) => [d, { reponses: [], currentQuestion: 0, commentaire: "" }]));

const makeInitialReponsesAffaires = () =>
  Object.fromEntries(DEPARTEMENTS_AFFAIRES.map((d) => [d, { reponses: [], currentQuestion: 0, commentaire: "" }]));

const PREVIOUS_DEPT = Object.fromEntries(
  DEPARTEMENTS.slice(1).map((d, i) => [d, DEPARTEMENTS[i]])
);

function App() {
  const [client, setClient] = useState(null);
  const [departement, setDepartement] = useState(null);
  const [done, setDone] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [adminFromSuperAdmin, setAdminFromSuperAdmin] = useState(false);
  const [questions, setQuestions] = useState({});
  const [questionsLoading, setQuestionsLoading] = useState(true);
  const [allReponses, setAllReponses] = useState(makeInitialReponses);
  const [skippedSteps, setSkippedSteps] = useState([]);
  const [showWelcome, setShowWelcome] = useState(true);
  const [commentaireGlobal, setCommentaireGlobal] = useState("");
  const [showSynthese, setShowSynthese] = useState(false);
  const [categoryTransition, setCategoryTransition] = useState(null);
  const [logoutWarning, setLogoutWarning] = useState(false);

  // ── États flux Affaires ───────────────────────────────────────────────────
  const [affairesDepartement, setAffairesDepartement] = useState(null);
  const [allReponsesAffaires, setAllReponsesAffaires] = useState(makeInitialReponsesAffaires);
  const [skippedStepsAffaires, setSkippedStepsAffaires] = useState([]);
  const [categoryTransitionAffaires, setCategoryTransitionAffaires] = useState(null);
  const [commentaireAffaires, setCommentaireAffaires] = useState("");
  const [showSyntheseAffaires, setShowSyntheseAffaires] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await axios.get(`${API_URL}/questions`, { timeout: 10000 });
        if (!cancelled) setQuestions(withQuestionsFallback(res.data));
      } catch {
        if (!cancelled) setQuestions(withQuestionsFallback({}));
      } finally {
        if (!cancelled) setQuestionsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Helpers loisirs ───────────────────────────────────────────────────────
  const getCompletedDepts = () => {
    if (!departement || departement === "Commentaire" || departement === "Synthese") return [];
    const currentIndex = DEPARTEMENTS.indexOf(departement);
    return DEPARTEMENTS.slice(0, currentIndex).filter(
      (d) => skippedSteps.includes(d) || (allReponses[d]?.reponses?.length > 0)
    );
  };

  const goAfterCategoryTransition = () => {
    const to = categoryTransition?.toDept;
    setCategoryTransition(null);
    if (!to || to === "Commentaire") { setDepartement("Commentaire"); return; }
    setDepartement(to);
  };

  const handleReponse = (dept, question, note) => {
    setAllReponses(prev => ({
      ...prev,
      [dept]: {
        ...prev[dept],
        reponses: [...prev[dept].reponses, { question, note }],
        currentQuestion: prev[dept].currentQuestion + 1,
      },
    }));
  };

  const handleQuestionnaireFinish = (reponses, commentaire) => {
    setAllReponses(prev => ({
      ...prev,
      [departement]: { ...prev[departement], reponses, commentaire, currentQuestion: reponses.length },
    }));
    const next = getNextCategory(departement);
    setCategoryTransition({ type: "complete", fromDept: departement, toDept: next || "Commentaire" });
  };

  const handleCommentaireFinal = (glob) => {
    setCommentaireGlobal(glob);
    setShowSynthese(true);
    setDepartement("Synthese");
  };

  const handleSendAllData = async () => {
    if (!client?.id) throw new Error("Client non identifié. Recommencez depuis le formulaire.");

    const requests = Object.entries(allReponses)
      .map(([dept, data]) => {
        if (!data.reponses?.length) return null;
        const standard = data.reponses.filter((r) => !r.type);
        const toAvg = standard.length ? standard : data.reponses;
        const moyenne = toAvg.reduce((sum, r) => sum + (r.note || 0), 0) / toAvg.length;
        const noteFinale = Math.max(1, Math.min(4, Math.round(moyenne)));
        return axios.post(`${API_URL}/avis`, {
          client_id: client.id,
          departement: dept,
          note: noteFinale,
          commentaire: JSON.stringify({ reponses: data.reponses, detail: data.commentaire || "" }),
        });
      })
      .filter(Boolean);

    if (commentaireGlobal?.trim()) {
      requests.push(axios.post(`${API_URL}/avis`, {
        client_id: client.id,
        departement: "Global",
        note: 0,
        commentaire: commentaireGlobal.trim(),
      }));
    }

    if (requests.length === 0) throw new Error("Aucune réponse à envoyer.");
    await Promise.all(requests);
    setDone(true);
    setShowSynthese(false);
    setCategoryTransition(null);
  };

  const handleStartEvaluation = () => { setShowWelcome(false); setDepartement("Accueil"); };

  const handleBackToClient = () => {
    setClient(null); setDone(false); setDepartement(null); setShowWelcome(true);
    setSkippedSteps([]); setAllReponses(makeInitialReponses());
    setCommentaireGlobal(""); setShowSynthese(false);
    // Affaires reset
    setAffairesDepartement(null);
    setAllReponsesAffaires(makeInitialReponsesAffaires());
    setSkippedStepsAffaires([]);
    setCategoryTransitionAffaires(null);
    setCommentaireAffaires("");
    setShowSyntheseAffaires(false);
  };

  const handleLogout = async () => {
    try { await axios.post(`${API_URL}/admin/logout`, {}, { headers: authHeaders() }); }
    catch { setLogoutWarning(true); }
    clearAdminToken();
    setIsAdmin(false); setIsSuperAdmin(false); setAdminFromSuperAdmin(false);
  };

  const handleSkipCategory = () => {
    setSkippedSteps((prev) => [...prev, departement]);
    const next = getNextCategory(departement);
    setCategoryTransition({ type: "skip", fromDept: departement, toDept: next || "Commentaire" });
  };

  const handleBackFromQuestionnaire = (currentDepartement) => {
    setSkippedSteps(prev => prev.filter(s => s !== currentDepartement));
    const previous = PREVIOUS_DEPT[currentDepartement];
    if (previous) setDepartement(previous);
  };

  const getPreviousWasSkipped = (dept) => {
    const previous = PREVIOUS_DEPT[dept];
    return previous ? skippedSteps.includes(previous) : false;
  };

  const handleUpdateReponse = (dept, questionIndex, newNote) => {
    setAllReponses(prev => ({
      ...prev,
      [dept]: {
        ...prev[dept],
        reponses: prev[dept].reponses.map((rep, idx) => idx === questionIndex ? { ...rep, note: newNote } : rep),
      },
    }));
  };

  const handleSetCategoryReponses = (dept, reponses, commentaire = "") => {
    setAllReponses(prev => ({ ...prev, [dept]: { reponses, commentaire, currentQuestion: reponses.length } }));
    setSkippedSteps(prev => prev.filter(d => d !== dept));
  };

  // ── Handlers flux Affaires ────────────────────────────────────────────────
  const handleClientIdentified = (clientData) => {
    setClient(clientData);
    if (clientData.type_sejour === "affaires") {
      setShowWelcome(false);
      setAffairesDepartement("Accueil");
    }
  };

  const handleQuestionnaireAffairesFinish = (reponses, commentaire) => {
    setAllReponsesAffaires(prev => ({
      ...prev,
      [affairesDepartement]: { reponses, commentaire, currentQuestion: reponses.length },
    }));
    const next = getNextCategoryAffaires(affairesDepartement);
    setCategoryTransitionAffaires({ type: "complete", fromDept: affairesDepartement, toDept: next || "Commentaire" });
  };

  const handleSkipCategoryAffaires = () => {
    setSkippedStepsAffaires(prev => [...prev, affairesDepartement]);
    const next = getNextCategoryAffaires(affairesDepartement);
    setCategoryTransitionAffaires({ type: "skip", fromDept: affairesDepartement, toDept: next || "Commentaire" });
  };

  const goAfterCategoryTransitionAffaires = () => {
    const to = categoryTransitionAffaires?.toDept;
    setCategoryTransitionAffaires(null);
    if (!to || to === "Commentaire") { setAffairesDepartement("Commentaire"); return; }
    setAffairesDepartement(to);
  };

  const handleCommentaireAffaires = (commentaire) => {
    setCommentaireAffaires(commentaire);
    setShowSyntheseAffaires(true);
  };

  const handleSendAffairesData = async () => {
    if (!client?.id) throw new Error("Client non identifié.");

    const requests = Object.entries(allReponsesAffaires)
      .filter(([, data]) => data.reponses?.length > 0)
      .map(([dept, data]) => {
        const standard = data.reponses.filter(r => !r.type);
        const toAvg = standard.length ? standard : data.reponses;
        const moyenne = toAvg.reduce((s, r) => s + (r.note || 0), 0) / toAvg.length;
        const noteFinale = Math.max(1, Math.min(4, Math.round(moyenne)));
        return axios.post(`${API_URL}/avis`, {
          client_id: client.id,
          departement: dept,
          note: noteFinale,
          commentaire: JSON.stringify({ reponses: data.reponses, detail: data.commentaire || "" }),
        });
      });

    if (commentaireAffaires?.trim()) {
      requests.push(axios.post(`${API_URL}/avis`, {
        client_id: client.id,
        departement: "Global",
        note: 0,
        commentaire: commentaireAffaires.trim(),
      }));
    }

    if (requests.length === 0) throw new Error("Aucune réponse à envoyer.");
    await Promise.all(requests);
    setDone(true);
    setShowSyntheseAffaires(false);
  };

  const handleUpdateAffairesReponse = (dept, questionIndex, newNote) => {
    setAllReponsesAffaires(prev => ({
      ...prev,
      [dept]: {
        ...prev[dept],
        reponses: prev[dept].reponses.map((r, i) => i === questionIndex ? { ...r, note: newNote } : r),
      },
    }));
  };

  const handleSetAffairesCategoryReponses = (dept, reponses, commentaire = "") => {
    setAllReponsesAffaires(prev => ({ ...prev, [dept]: { reponses, commentaire, currentQuestion: reponses.length } }));
    setSkippedStepsAffaires(prev => prev.filter(d => d !== dept));
  };

  // ── Shared props helpers ──────────────────────────────────────────────────
  const sharedProps = (dept) => ({
    categoryQuestions: questions[dept] || [],
    onFinish: handleQuestionnaireFinish,
    onBack: handleSkipCategory,
    showBack: getPreviousWasSkipped(dept),
    onBackClick: () => handleBackFromQuestionnaire(dept),
    savedReponses: allReponses[dept]?.reponses,
    startAtQuestion: allReponses[dept]?.currentQuestion,
    onReponse: (question, note) => handleReponse(dept, question, note),
    skippedSteps,
    completedDepts: getCompletedDepts(),
  });

  const restaurantsAffairesQuestions = [
    ...(questions["Le Bandama Petit Déjeuner"] || []),
    ...(questions["Le Panoramique"] || []),
  ];

  const questionsForAffaires = {
    Accueil: questions["Accueil"] || [],
    Chambres: questions["Chambres"] || [],
    Commercial: questions["Commercial"] || [],
    Restaurants: restaurantsAffairesQuestions,
    "Loisirs et Divertissements": questions["Loisirs et Divertissements"] || [],
    "Cadre Général": questions["Cadre Général"] || [],
  };

  const sharedPropsAffaires = (dept) => ({
    categoryQuestions: questionsForAffaires[dept] || [],
    onFinish: handleQuestionnaireAffairesFinish,
    onBack: handleSkipCategoryAffaires,
    variant: "affaires",
    categoriesMeta: AFFAIRES_CATEGORIES_META,
    totalSteps: DEPARTEMENTS_AFFAIRES.length,
  });

  if (questionsLoading) {
    return (
      <div className="app-shell app-shell--loading">
        <div className="app-initial-loader"><p>Chargement…</p></div>
      </div>
    );
  }

  const isAffaires = client?.type_sejour === "affaires";

  return (
    <div className={`app-shell${!client && !isAdmin && !isSuperAdmin ? " app-shell--form" : ""}`}>
      {logoutWarning && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, background: "#92400e", color: "#fff", padding: "12px 20px", zIndex: 9999, textAlign: "center", fontSize: "14px", display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
          <span>⚠️ Déconnexion locale effectuée. Fermez le navigateur pour sécuriser la session.</span>
          <button onClick={() => setLogoutWarning(false)} style={{ background: "none", border: "1px solid rgba(255,255,255,0.6)", color: "#fff", padding: "2px 10px", cursor: "pointer", borderRadius: 4, fontSize: "13px" }}>×</button>
        </div>
      )}

      {isSuperAdmin ? (
        <SuperAdminDashboard
          onLogout={handleLogout}
          onOpenHotelDashboard={() => { setIsSuperAdmin(false); setIsAdmin(true); setAdminFromSuperAdmin(true); }}
        />
      ) : isAdmin ? (
        <Dashboard onBack={adminFromSuperAdmin ? () => { setIsAdmin(false); setIsSuperAdmin(true); setAdminFromSuperAdmin(false); } : handleLogout} onQuestionsChanged={setQuestions} />
      ) : !client ? (
        <ClientForm onClientIdentified={handleClientIdentified} onAdminTrigger={() => setIsAdmin(true)} onSuperAdminTrigger={() => setIsSuperAdmin(true)} />
      ) : done ? (
        <ThankYouPage client={client} onBack={handleBackToClient} />
      ) : isAffaires ? (
        /* ── Flux Affaires / Professionnel — 6 catégories ── */
        showSyntheseAffaires ? (
          <SynthesePage
            allReponses={allReponsesAffaires}
            commentaireGlobal={commentaireAffaires}
            skippedSteps={skippedStepsAffaires}
            questions={questionsForAffaires}
            client={client}
            onUpdateReponse={handleUpdateAffairesReponse}
            onSetCategoryReponses={handleSetAffairesCategoryReponses}
            onUpdateCommentaireGlobal={setCommentaireAffaires}
            onConfirm={handleSendAffairesData}
            departements={DEPARTEMENTS_AFFAIRES}
            variant="affaires"
          />
        ) : categoryTransitionAffaires ? (
          <CategoryTransition
            type={categoryTransitionAffaires.type}
            fromDept={categoryTransitionAffaires.fromDept}
            toDept={categoryTransitionAffaires.toDept}
            onContinue={goAfterCategoryTransitionAffaires}
            categoriesMeta={AFFAIRES_CATEGORIES_META}
            departements={DEPARTEMENTS_AFFAIRES}
            variant="affaires"
          />
        ) : affairesDepartement === "Commentaire" ? (
          <CommentaireFinal client={client} onFinish={handleCommentaireAffaires} />
        ) : affairesDepartement === "Accueil" ? (
          <QuestionnaireAccueilAffaires {...sharedPropsAffaires("Accueil")} />
        ) : affairesDepartement === "Chambres" ? (
          <QuestionnaireChambreAffaires {...sharedPropsAffaires("Chambres")} />
        ) : affairesDepartement === "Commercial" ? (
          <QuestionnaireCommercial {...sharedPropsAffaires("Commercial")} />
        ) : affairesDepartement === "Restaurants" ? (
          <QuestionnaireRestaurantsAffaires {...sharedPropsAffaires("Restaurants")} />
        ) : affairesDepartement === "Loisirs et Divertissements" ? (
          <QuestionnaireLoisirsDivertissementsAffaires {...sharedPropsAffaires("Loisirs et Divertissements")} />
        ) : affairesDepartement === "Cadre Général" ? (
          <QuestionnaireCadreGeneralAffaires {...sharedPropsAffaires("Cadre Général")} />
        ) : null
      ) : (
        /* ── Flux Loisirs / Personnel ── */
        showWelcome ? (
          <WelcomePage onStart={handleStartEvaluation} />
        ) : (
          categoryTransition ? (
            <CategoryTransition type={categoryTransition.type} fromDept={categoryTransition.fromDept} toDept={categoryTransition.toDept} onContinue={goAfterCategoryTransition} />
          ) : showSynthese ? (
            <SynthesePage
              allReponses={allReponses}
              commentaireGlobal={commentaireGlobal}
              skippedSteps={skippedSteps}
              questions={questions}
              client={client}
              onUpdateReponse={handleUpdateReponse}
              onSetCategoryReponses={handleSetCategoryReponses}
              onUpdateCommentaireGlobal={setCommentaireGlobal}
              onConfirm={handleSendAllData}
            />
          ) : departement === "Commentaire" ? (
            <CommentaireFinal client={client} onFinish={handleCommentaireFinal} onBack={() => setDepartement(null)} />
          ) : departement === "Accueil" ? (
            <QuestionnaireAccueil {...sharedProps("Accueil")} showBack={false} onBackClick={undefined} />
          ) : departement === "Chambres" ? (
            <QuestionnaireChambres {...sharedProps("Chambres")} />
          ) : departement === "Le Bandama Petit Déjeuner" ? (
            <QuestionnaireBandama {...sharedProps("Le Bandama Petit Déjeuner")} />
          ) : departement === "Le Panoramique" ? (
            <QuestionnairePanoramique {...sharedProps("Le Panoramique")} />
          ) : departement === "L'Alocodrome" ? (
            <QuestionnaireAlocodrome {...sharedProps("L'Alocodrome")} />
          ) : departement === "Loisirs et Divertissements" ? (
            <QuestionnaireLoisirs {...sharedProps("Loisirs et Divertissements")} />
          ) : departement === "Cadre Général" ? (
            <QuestionnaireCadreGeneral {...sharedProps("Cadre Général")} />
          ) : null
        )
      )}
    </div>
  );
}

export default App;
