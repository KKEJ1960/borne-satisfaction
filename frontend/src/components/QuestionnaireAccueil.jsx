import { ConciergeBell } from "lucide-react";
import QuestionnaireScreen from "./QuestionnaireScreen";

export default function QuestionnaireAccueil({ categoryQuestions = [], ...props }) {
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
