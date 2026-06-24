import { Palmtree } from "lucide-react";
import QuestionnaireScreen from "./QuestionnaireScreen";

export default function QuestionnaireLoisirs({ categoryQuestions = [], ...props }) {
  return (
    <QuestionnaireScreen
      deptName="Loisirs et Divertissements"
      deptStep={6}
      Icon={Palmtree}
      questions={categoryQuestions}
      {...props}
    />
  );
}
