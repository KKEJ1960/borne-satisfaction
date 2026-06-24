import { Eye } from "lucide-react";
import QuestionnaireScreen from "./QuestionnaireScreen";

export default function QuestionnairePanoramique({ categoryQuestions = [], ...props }) {
  return (
    <QuestionnaireScreen
      deptName="Le Panoramique"
      deptStep={4}
      Icon={Eye}
      questions={categoryQuestions}
      {...props}
    />
  );
}
