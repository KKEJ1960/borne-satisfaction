import { Sparkles } from "lucide-react";
import QuestionnaireScreen from "./QuestionnaireScreen";

export default function QuestionnaireProprete({ categoryQuestions = [], ...props }) {
  return (
    <QuestionnaireScreen
      deptName="Cadre Général"
      deptStep={7}
      Icon={Sparkles}
      questions={categoryQuestions}
      {...props}
    />
  );
}
