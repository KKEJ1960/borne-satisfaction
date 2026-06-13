import { useState } from "react";
import { MessageSquare } from "lucide-react";
import ScreenLayout from "./ScreenLayout";
import "../style.css";

export default function CommentaireFinal({ onFinish }) {
  const [commentaire, setCommentaire] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onFinish(commentaire);
    } catch (error) {
      console.error("Erreur commentaire final:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    setIsSubmitting(true);
    try {
      await onFinish("");
    } catch (error) {
      console.error("Erreur commentaire final:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenLayout mainClassName="comment-page">
      <div className="comment-page-inner">
        <div className="comment-icon-wrap">
          <MessageSquare size={22} color="#ffffff" />
        </div>
        <h2>Un dernier mot ?</h2>
        <p className="comment-page-desc">Impression générale sur votre séjour (optionnel)</p>
        <textarea
          value={commentaire}
          onChange={(e) => setCommentaire(e.target.value)}
          placeholder="Votre commentaire…"
        />
        <div className="comment-actions">
          <button type="button" className="btn-primary-compact" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Envoi…" : "Continuer"}
          </button>
          <button type="button" className="btn-secondary-compact" onClick={handleSkip} disabled={isSubmitting}>
            Passer
          </button>
        </div>
      </div>
    </ScreenLayout>
  );
}
