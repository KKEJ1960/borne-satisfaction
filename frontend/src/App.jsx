import React, { useState, useEffect } from "react";
import axios from "axios";
import ClientForm from "./components/ClientForm";
import Dashboard from "./components/Dashboard";
import SuperAdminDashboard from "./components/SuperAdminDashboard";
import WelcomePage from "./components/WelcomePage";
import QuestionnaireAccueil from "./components/QuestionnaireAccueil";
import QuestionnaireChambres from "./components/QuestionnaireChambres";
import QuestionnaireRestaurants from "./components/QuestionnaireRestaurants";
import QuestionnaireLoisirs from "./components/QuestionnaireLoisirs";
import QuestionnaireProprete from "./components/QuestionnaireProprete";
import CommentaireFinal from "./components/CommentaireFinal";
import SynthesePage from "./components/SynthesePage";
import ThankYouPage from "./components/ThankYouPage";
import CategoryTransition from "./components/CategoryTransition";
import { getNextCategory } from "./constants/ratings";
import { API_URL } from "./config/api";
import { withQuestionsFallback } from "./utils/questions";
import "./style.css";

function App() {
  const initialReponsesState = {
    Accueil: { reponses: [], currentQuestion: 0, commentaire: "" },
    Chambres: { reponses: [], currentQuestion: 0, commentaire: "" },
    Restaurants: { reponses: [], currentQuestion: 0, commentaire: "" },
    Loisirs: { reponses: [], currentQuestion: 0, commentaire: "" },
    "Propreté": { reponses: [], currentQuestion: 0, commentaire: "" }
  };

  const [client, setClient] = useState(null);
  const [departement, setDepartement] = useState(null);
  const [done, setDone] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [questions, setQuestions] = useState({});
  const [questionsLoading, setQuestionsLoading] = useState(true);
  const [allReponses, setAllReponses] = useState(initialReponsesState);
  const [currentStep, setCurrentStep] = useState(0);
  const [skippedSteps, setSkippedSteps] = useState([]);
  const [showWelcome, setShowWelcome] = useState(true);
  const [commentaireGlobal, setCommentaireGlobal] = useState("");
  const [showSynthese, setShowSynthese] = useState(false);
  const [categoryTransition, setCategoryTransition] = useState(null);
  const [logoutWarning, setLogoutWarning] = useState(false);

  const departements = ["Accueil", "Chambres", "Restaurants", "Loisirs", "Propreté"];

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
    return () => {
      cancelled = true;
    };
  }, []);

  const getCompletedDepts = () => {
    if (!departement || departement === "Commentaire" || departement === "Synthese") return [];
    const currentIndex = departements.indexOf(departement);
    return departements.slice(0, currentIndex).filter(
      (d) => skippedSteps.includes(d) || (allReponses[d]?.reponses?.length > 0)
    );
  };

  const goAfterCategoryTransition = () => {
    const to = categoryTransition?.toDept;
    setCategoryTransition(null);
    if (!to || to === "Commentaire") {
      setDepartement("Commentaire");
      return;
    }
    const nextIndex = departements.indexOf(to);
    setCurrentStep(nextIndex);
    setDepartement(to);
  };

  // Quand le client répond une question
  const handleReponse = (departement, question, note) => {
    setAllReponses(prev => ({
      ...prev,
      [departement]: {
        ...prev[departement],
        reponses: [...prev[departement].reponses, { question, note }],
        currentQuestion: prev[departement].currentQuestion + 1
      }
    }));
  };

  const handleQuestionnaireFinish = (reponses, commentaire) => {
    const newReponses = {
      ...allReponses,
      [departement]: {
        ...allReponses[departement],
        reponses,
        commentaire,
        currentQuestion: reponses.length
      }
    };
    setAllReponses(newReponses);

    const next = getNextCategory(departement);
    setCategoryTransition({
      type: "complete",
      fromDept: departement,
      toDept: next || "Commentaire",
    });
  };

  const handleCommentaireFinal = (commentaireGlobal) => {
    setCommentaireGlobal(commentaireGlobal);
    setShowSynthese(true);
    setDepartement("Synthese");
  };

  const handleSendAllData = async () => {
    if (!client?.id) {
      throw new Error("Client non identifié. Recommencez depuis le formulaire.");
    }

    const requests = Object.entries(allReponses)
      .map(([dept, data]) => {
        if (!data.reponses?.length) return null;

        const moyenne =
          data.reponses.reduce((sum, r) => sum + (r.note || 0), 0) / data.reponses.length;
        const noteFinale = Math.max(1, Math.min(4, Math.round(moyenne)));

        return axios.post(`${API_URL}/avis`, {
          client_id: client.id,
          departement: dept,
          note: noteFinale,
          commentaire: JSON.stringify({
            reponses: data.reponses,
            detail: data.commentaire || "",
          }),
        });
      })
      .filter(Boolean);

    if (commentaireGlobal?.trim()) {
      requests.push(
        axios.post(`${API_URL}/avis`, {
          client_id: client.id,
          departement: "Global",
          note: 0,
          commentaire: commentaireGlobal.trim(),
        })
      );
    }

    if (requests.length === 0) {
      throw new Error(
        "Aucune réponse à envoyer. Évaluez au moins une catégorie ou ajoutez un commentaire."
      );
    }

    await Promise.all(requests);
    setDone(true);
    setShowSynthese(false);
    setCategoryTransition(null);
  };

  const handleStartEvaluation = () => {
    setShowWelcome(false);
    setDepartement("Accueil");
    setCurrentStep(1);
  };

  const handleBackToClient = () => {
    setClient(null);
    setDone(false);
    setDepartement(null);
    setShowWelcome(true);
    setCurrentStep(0);
    setSkippedSteps([]);
    setAllReponses(initialReponsesState);
    setCommentaireGlobal("");
    setShowSynthese(false);
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${API_URL}/admin/logout`, {}, { withCredentials: true });
    } catch {
      // Le cookie HttpOnly ne peut pas être effacé côté JS.
      // Si l'appel serveur échoue, le cookie reste valide jusqu'à expiration (4h).
      setLogoutWarning(true);
    }
    setIsAdmin(false);
    setIsSuperAdmin(false);
  };

  const handleAdminTrigger = () => {
    setIsAdmin(true);
    setIsSuperAdmin(false);
  };

  const handleSuperAdminTrigger = () => {
    setIsSuperAdmin(true);
    setIsAdmin(false);
  };

  const handleSkipCategory = () => {
    setSkippedSteps((prev) => [...prev, departement]);
    const next = getNextCategory(departement);
    setCategoryTransition({
      type: "skip",
      fromDept: departement,
      toDept: next || "Commentaire",
    });
  };

  const handleBackFromQuestionnaire = (currentDepartement) => {
    setSkippedSteps(prev => prev.filter(s => s !== currentDepartement));
    
    const previousDept = {
      'Chambres': 'Accueil',
      'Restaurants': 'Chambres', 
      'Loisirs': 'Restaurants',
      'Propreté': 'Loisirs'
    };
    
    const previous = previousDept[currentDepartement];
    if (previous) {
      const previousIndex = departements.indexOf(previous);
      setCurrentStep(previousIndex);
      setDepartement(previous);
    }
  };

  const previousDept = {
    'Chambres': 'Accueil',
    'Restaurants': 'Chambres',
    'Loisirs': 'Restaurants', 
    'Propreté': 'Loisirs'
  };

  const getPreviousWasSkipped = (currentDepartement) => {
    const previous = previousDept[currentDepartement];
    return previous ? skippedSteps.includes(previous) : false;
  };

  const handleUpdateReponse = (dept, questionIndex, newNote) => {
    setAllReponses(prev => ({
      ...prev,
      [dept]: {
        ...prev[dept],
        reponses: prev[dept].reponses.map((rep, idx) =>
          idx === questionIndex ? { ...rep, note: newNote } : rep
        ),
      },
    }));
  };

  const handleSetCategoryReponses = (dept, reponses, commentaire = "") => {
    setAllReponses(prev => ({
      ...prev,
      [dept]: {
        reponses,
        commentaire,
        currentQuestion: reponses.length,
      },
    }));
    setSkippedSteps(prev => prev.filter(d => d !== dept));
  };

  const handleUpdateCommentaireGlobal = (newCommentaire) => {
    setCommentaireGlobal(newCommentaire);
  };

  if (questionsLoading) {
    return (
      <div className="app-shell app-shell--loading">
        <div className="app-initial-loader">
          <p>Chargement…</p>
        </div>
      </div>
    );
  }

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
          onOpenHotelDashboard={() => {
            setIsSuperAdmin(false);
            setIsAdmin(true);
          }}
        />
      ) : isAdmin ? (
        <Dashboard onBack={handleLogout} onQuestionsChanged={setQuestions} />
      ) : !client ? (
        <ClientForm
          onClientIdentified={setClient}
          onAdminTrigger={handleAdminTrigger}
          onSuperAdminTrigger={handleSuperAdminTrigger}
        />
      ) : showWelcome ? (
        <WelcomePage onStart={handleStartEvaluation} />
      ) : !done ? (
        categoryTransition ? (
          <CategoryTransition
            type={categoryTransition.type}
            fromDept={categoryTransition.fromDept}
            toDept={categoryTransition.toDept}
            onContinue={goAfterCategoryTransition}
          />
        ) : showSynthese ? (
          <SynthesePage 
            allReponses={allReponses}
            commentaireGlobal={commentaireGlobal}
            skippedSteps={skippedSteps}
            questions={questions}
            client={client}
            onUpdateReponse={handleUpdateReponse}
            onSetCategoryReponses={handleSetCategoryReponses}
            onUpdateCommentaireGlobal={handleUpdateCommentaireGlobal}
            onConfirm={handleSendAllData}
          />
        ) : departement === "Commentaire" ? (
          <CommentaireFinal client={client} onFinish={handleCommentaireFinal} onBack={() => setDepartement(null)} />
        ) : departement === "Accueil" ? (
          <QuestionnaireAccueil 
            categoryQuestions={questions.Accueil || []}
            onFinish={handleQuestionnaireFinish} 
            onBack={handleSkipCategory} 
            showBack={false} 
            savedReponses={allReponses['Accueil'].reponses}
            startAtQuestion={allReponses['Accueil'].currentQuestion}
            onReponse={(question, note) => handleReponse('Accueil', question, note)}
            skippedSteps={skippedSteps}
            completedDepts={getCompletedDepts()}
          />
        ) : departement === "Chambres" ? (
          <QuestionnaireChambres 
            categoryQuestions={questions.Chambres || []}
            onFinish={handleQuestionnaireFinish} 
            onBack={handleSkipCategory} 
            showBack={getPreviousWasSkipped('Chambres')} 
            onBackClick={() => handleBackFromQuestionnaire('Chambres')} 
            savedReponses={allReponses['Chambres'].reponses}
            startAtQuestion={allReponses['Chambres'].currentQuestion}
            onReponse={(question, note) => handleReponse('Chambres', question, note)}
            skippedSteps={skippedSteps}
            completedDepts={getCompletedDepts()}
          />
        ) : departement === "Restaurants" ? (
          <QuestionnaireRestaurants 
            categoryQuestions={questions.Restaurants || []}
            onFinish={handleQuestionnaireFinish} 
            onBack={handleSkipCategory} 
            showBack={getPreviousWasSkipped('Restaurants')} 
            onBackClick={() => handleBackFromQuestionnaire('Restaurants')} 
            savedReponses={allReponses['Restaurants'].reponses}
            startAtQuestion={allReponses['Restaurants'].currentQuestion}
            onReponse={(question, note) => handleReponse('Restaurants', question, note)}
            skippedSteps={skippedSteps}
            completedDepts={getCompletedDepts()}
          />
        ) : departement === "Loisirs" ? (
          <QuestionnaireLoisirs 
            categoryQuestions={questions.Loisirs || []}
            onFinish={handleQuestionnaireFinish} 
            onBack={handleSkipCategory} 
            showBack={getPreviousWasSkipped('Loisirs')} 
            onBackClick={() => handleBackFromQuestionnaire('Loisirs')} 
            savedReponses={allReponses['Loisirs'].reponses}
            startAtQuestion={allReponses['Loisirs'].currentQuestion}
            onReponse={(question, note) => handleReponse('Loisirs', question, note)}
            skippedSteps={skippedSteps}
            completedDepts={getCompletedDepts()}
          />
        ) : departement === "Propreté" ? (
          <QuestionnaireProprete 
            categoryQuestions={questions.Propreté || []}
            onFinish={handleQuestionnaireFinish} 
            onBack={handleSkipCategory} 
            showBack={getPreviousWasSkipped('Propreté')} 
            onBackClick={() => handleBackFromQuestionnaire('Propreté')} 
            savedReponses={allReponses['Propreté'].reponses}
            startAtQuestion={allReponses['Propreté'].currentQuestion}
            onReponse={(question, note) => handleReponse('Propreté', question, note)}
            skippedSteps={skippedSteps}
            completedDepts={getCompletedDepts()}
          />
        ) : null
      ) : (
        <ThankYouPage client={client} onBack={handleBackToClient} />
      )}
    </div>
  );
}

export default App;
