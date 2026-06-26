import { Sparkles } from "lucide-react";
import QuestionnaireScreen from "./QuestionnaireScreen";

export default function QuestionnaireCadreGeneralAffaires({ categoryQuestions = [], ...props }) {
  return (
    <QuestionnaireScreen
      deptName="Cadre Général"
      deptStep={6}
      Icon={Sparkles}
      questions={categoryQuestions}
      {...props}
    />
  );
}
