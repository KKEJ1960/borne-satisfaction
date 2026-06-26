import { ConciergeBell } from "lucide-react";
import QuestionnaireScreen from "./QuestionnaireScreen";

export default function QuestionnaireAccueilAffaires({ categoryQuestions = [], ...props }) {
  return (
    <QuestionnaireScreen
      deptName="Accueil"
      deptStep={1}
      Icon={ConciergeBell}
      questions={categoryQuestions}
      {...props}
    />
  );
}
