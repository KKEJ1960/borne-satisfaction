import { Coffee } from "lucide-react";
import QuestionnaireScreen from "./QuestionnaireScreen";

export default function QuestionnaireBandama({ categoryQuestions = [], ...props }) {
  return (
    <QuestionnaireScreen
      deptName="Le Bandama Petit Déjeuner"
      deptStep={3}
      Icon={Coffee}
      questions={categoryQuestions}
      {...props}
    />
  );
}
