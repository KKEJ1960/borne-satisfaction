import { Sparkles } from "lucide-react";
import QuestionnaireScreen from "./QuestionnaireScreen";

export default function QuestionnaireProprete({ categoryQuestions = [], ...props }) {
  return (
    <QuestionnaireScreen
      deptName="Propreté"
      deptStep={5}
      Icon={Sparkles}
      questions={categoryQuestions}
      {...props}
    />
  );
}
