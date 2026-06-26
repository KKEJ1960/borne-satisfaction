import { Palmtree } from "lucide-react";
import QuestionnaireScreen from "./QuestionnaireScreen";

export default function QuestionnaireLoisirsDivertissementsAffaires({ categoryQuestions = [], ...props }) {
  return (
    <QuestionnaireScreen
      deptName="Loisirs et Divertissements"
      deptStep={5}
      Icon={Palmtree}
      questions={categoryQuestions}
      {...props}
    />
  );
}
